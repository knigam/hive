import WebSocket from "ws";
import { Socket } from "net";
import express from "express";
import jwt from "jsonwebtoken";
import pb from "protobufjs";
import { createServer } from "vite";
import * as http from "http";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Store from "./store";
import { PlayerData, PlayerState } from "./types";

type StateId = string;
type Connection = WebSocket & { isAlive: boolean };
interface UpdateRequest {
  method: string;
  msgId: string;
  args: any;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });
const vite = await createServer({
  server: { middlewareMode: true },
  clearScreen: false,
  alias: { vue: "vue/dist/vue.esm.js" },
});

const root = await pb.load(join(__dirname, "types.proto"));
const Response = root.lookupType("Response");

const connections: Map<StateId, Set<Connection>> = new Map();
const store = new Store(onNewUserState);

app.use(express.json());
app.post("/register", (req, res) => {
  const userData = req.body;
  const token = jwt.sign(userData, "secret", { noTimestamp: true });
  res.json({ token });
});
app.post("/new", (req, res) => {
  const token = req.headers.authorization!.split(" ")[1];
  const userData = jwt.verify(token, "secret") as PlayerData;
  const stateId = Math.random().toString(36).substring(2);
  store.newState(stateId, userData, req.body);
  res.json({ stateId });
});
app.use(vite.middlewares);
app.get("/*", (_, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

server.on("upgrade", (req: http.IncomingMessage, socket: Socket, head: Buffer) => {
  const stateId = req.url!.substring(1);
  if (!store.hasState(stateId)) {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    ws.once("message", (token) => {
      const userData = jwt.verify(token, "secret") as PlayerData;
      ws.send(Response.encode({ state: store.getUserState(stateId, userData)! }).finish());
      handleConnection(stateId, userData, Object.assign(ws, { isAlive: true }));
    });
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});

setInterval(() => {
  connections.forEach((sockets) => {
    sockets.forEach((socket) => {
      if (!socket.isAlive) {
        socket.terminate();
      } else {
        socket.isAlive = false;
        socket.ping(() => {});
      }
    });
  });
}, 30000);

function handleConnection(stateId: StateId, userData: PlayerData, socket: Connection) {
  addConnection(stateId, userData, socket);
  socket.on("close", () => {
    deleteConnection(stateId, userData, socket);
  });

  socket.on("message", (data) => {
    const { method, args, msgId }: UpdateRequest = JSON.parse(data as string);
    const maybeError = store.handleUpdate(stateId, userData, method, args);
    socket.send(Response.encode({ res: { msgId, error: maybeError } }).finish());
  });
}

function addConnection(stateId: StateId, userData: PlayerData, socket: Connection) {
  socket.on("pong", () => {
    socket.isAlive = true;
  });
  const client = JSON.stringify({ stateId, userData });
  if (!connections.has(client)) {
    connections.set(client, new Set([socket]));
    store.subscribeUser(stateId, userData);
  } else {
    connections.get(client)!.add(socket);
  }
}

function deleteConnection(stateId: StateId, userData: PlayerData, socket: Connection) {
  const client = JSON.stringify({ stateId, userData });
  connections.get(client)!.delete(socket);
  if (connections.get(client)!.size === 0) {
    connections.delete(client);
    store.unsubscribeUser(stateId, userData);
  }
}

function onNewUserState(stateId: StateId, userData: PlayerData, userState: PlayerState) {
  const client = JSON.stringify({ stateId, userData });
  connections.get(client)!.forEach((socket) => {
    socket.send(Response.encode({ state: userState }).finish());
  });
}
