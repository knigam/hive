import React, { useState, useEffect } from "react";
import { useLocation, useHistory } from "react-router-dom";
import { History } from "history";
import { RtagClient, RtagConnection } from "../../.rtag/client";
import { GameStatus, PlayerState } from "../../.rtag/types";
import Board from "./Board";
import PieceDrawer from "./PieceDrawer";
import Lobby from "./Lobby";

const MIN_PIECE_DRAWER_HEIGHT = 100;
const PIECE_SIZE = 75;

const client = new RtagClient(import.meta.env.VITE_APP_ID as string);

interface IGameProps {
  height: number;
  width: number;
}

function Game(props: IGameProps) {
  const { height, width } = props;
  const [playerState, setPlayerState] = useState<PlayerState | undefined>(undefined);
  const [rtag, setRtag] = useState<RtagConnection | undefined>(undefined);
  const [is404, setIs404] = useState<boolean>(false);
  const path = useLocation().pathname;
  const history = useHistory();

  useEffect(() => {
    if (rtag === undefined) {
      initRtag(path, history, setRtag, setPlayerState).catch((e) => {
        console.error("Error connecting", e);
        setIs404(true);
      });
    }
  }, [path]);

  if (playerState && rtag && !is404 && path !== "/game") {
    const boardHeight = Math.min(height * 0.8, height - MIN_PIECE_DRAWER_HEIGHT);
    const pieceDrawerHeight = height - boardHeight;

    return (
      <div>
        {playerState.status === GameStatus.NOT_STARTED && <Lobby {...playerState} client={rtag}></Lobby>}
        {playerState.status !== GameStatus.NOT_STARTED && (
          <div>
            <Board pieceSize={PIECE_SIZE} height={boardHeight} width={width} {...playerState} client={rtag}></Board>
            <PieceDrawer client={rtag} height={pieceDrawerHeight} {...playerState}></PieceDrawer>
          </div>
        )}
      </div>
    );
  } else if (is404) {
    return (
      <div className="background">
        <span className="fourOhFour">Game with this Game Code does not exist</span>
      </div>
    );
  } else {
    return <div></div>;
  }
}

async function initRtag(
  path: string,
  history: History,
  setRtag: (client: RtagConnection) => void,
  onStateChange: (state: PlayerState) => void
): Promise<void> {
  const storedUserData = localStorage.getItem("user");
  const token: string = storedUserData
    ? JSON.parse(storedUserData).token
    : await client.loginAnonymous().then((t) => {
        localStorage.setItem("user", JSON.stringify({ token: t }));
        return t;
      });
  if (path === "/game") {
    const connection = await client.connectNew(token, {}, onStateChange);
    setRtag(connection);
    history.replace(`/game/${connection.stateId}`);
  } else {
    const stateId = path.split("/").pop()!;
    const connection = await client.connectExisting(token, stateId, onStateChange);
    setRtag(connection);
  }
}

export default Game;
