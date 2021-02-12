import WebSocket from "isomorphic-ws";
import axios from "axios";
import { load } from "protobufjs";
import {
  PlayerName,
  PlayerState,
  ICreateGameRequest,
  IJoinGameRequest,
  IStartGameRequest,
  ISelectPieceRequest,
  IMovePieceRequest,
} from "./types";

export type StateId = string;

export class RtagClient {
  private callbacks: Record<string, (error?: string) => void> = {};

  private constructor(private socket: WebSocket) {}

  public static async registerUser(username: PlayerName): Promise<string> {
    const res = await axios.post("/register", { playerName: username });
    return res.data.token;
  }

  public static async createState(token: string, request: ICreateGameRequest): Promise<StateId> {
    const res = await axios.post("/new", request, { headers: { Authorization: "Bearer " + token } });
    return res.data.stateId;
  }

  public static connect(
    host: string,
    token: string,
    stateId: StateId,
    onStateChange: (state: PlayerState) => void
  ): Promise<RtagClient> {
    return new Promise((resolve, reject) => {
      load("/.rtag/types.proto").then((root) => {
        const Response = root.lookupType("Response");
        const socket = new WebSocket(`ws://${host}/${stateId}`);
        socket.binaryType = "arraybuffer";
        const client = new RtagClient(socket);
        socket.onopen = () => {
          socket.send(token);
          resolve(client);
        };
        socket.onerror = () => {
          reject();
        };
        socket.onmessage = ({ data }) => {
          const message: any = Response.decode(new Uint8Array(data as ArrayBuffer));
          if (message.type === "res") {
            client.callbacks[message.res.msgId](message.res.error);
            delete client.callbacks[message.res.msgId];
          } else if (message.type === "state") {
            onStateChange(Response.toObject(message, { arrays: true }).state as PlayerState);
          } else {
            console.error("Unknown message type: " + message.type);
          }
        };
      });
    });
  }

  public joinGame(request: IJoinGameRequest, cb: (error?: string) => void): void {
    const msgId = Math.random().toString(36).substring(2);
    this.callbacks[msgId] = cb;
    this.socket.send(JSON.stringify({ method: "joinGame", msgId, args: request }));
  }

  public startGame(request: IStartGameRequest, cb: (error?: string) => void): void {
    const msgId = Math.random().toString(36).substring(2);
    this.callbacks[msgId] = cb;
    this.socket.send(JSON.stringify({ method: "startGame", msgId, args: request }));
  }

  public selectPiece(request: ISelectPieceRequest, cb: (error?: string) => void): void {
    const msgId = Math.random().toString(36).substring(2);
    this.callbacks[msgId] = cb;
    this.socket.send(JSON.stringify({ method: "selectPiece", msgId, args: request }));
  }

  public movePiece(request: IMovePieceRequest, cb: (error?: string) => void): void {
    const msgId = Math.random().toString(36).substring(2);
    this.callbacks[msgId] = cb;
    this.socket.send(JSON.stringify({ method: "movePiece", msgId, args: request }));
  }

  public disconnect(): void {
    this.socket.close();
  }
}
