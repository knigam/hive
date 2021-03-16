import React, { useState, useEffect } from "react";
import { useLocation, useHistory } from "react-router-dom";
import { History } from "history";
import { RtagClient } from "../../.rtag/client";
import { GameStatus, PlayerState } from "../../.rtag/types";
import Board from "./Board";
import PieceDrawer from "./PieceDrawer";
import Lobby from "./Lobby";

const MIN_PIECE_DRAWER_HEIGHT = 100;
const PIECE_SIZE = 75;

interface IGameProps {
  height: number;
  width: number;
}

function Game(props: IGameProps) {
  const { height, width } = props;
  const [playerState, setPlayerState] = useState<PlayerState | undefined>(
    undefined
  );
  const [rtag, setRtag] = useState<RtagClient | undefined>(undefined);
  const [is404, setIs404] = useState<boolean>(false);
  const path = useLocation().pathname;
  const history = useHistory();

  useEffect(() => {
    getRtag(path, history, setPlayerState)
      .then(setRtag)
      .catch((e) => {
        console.error("Error connecting", e);
        setIs404(true);
      });
  }, [path]);

  if (playerState && rtag && !is404) {
    const boardHeight = Math.min(
      height * 0.8,
      height - MIN_PIECE_DRAWER_HEIGHT
    );
    const pieceDrawerHeight = height - boardHeight;

    return (
      <div>
        {playerState.status === GameStatus.NOT_STARTED && (
          <Lobby {...playerState} client={rtag}></Lobby>
        )}
        {playerState.status !== GameStatus.NOT_STARTED && (
          <div>
            <Board
              pieceSize={PIECE_SIZE}
              height={boardHeight}
              width={width}
              {...playerState}
              client={rtag}
            ></Board>
            <PieceDrawer
              client={rtag}
              height={pieceDrawerHeight}
              {...playerState}
            ></PieceDrawer>
          </div>
        )}
      </div>
    );
  } else if (is404) {
    return <div>404 Game not found</div>;
  } else {
    return <div></div>;
  }
}

async function getRtag(
  path: string,
  history: History,
  onStateChange: (state: PlayerState) => void
): Promise<RtagClient> {
  const storedUserData = sessionStorage.getItem("user");
  const token: string = storedUserData
    ? JSON.parse(storedUserData).token
    : await RtagClient.loginAnonymous().then((t) => {
        sessionStorage.setItem("user", JSON.stringify({ token: t }));
        return t;
      });
  const stateId: string =
    path !== "/game"
      ? path.replace("/game/", "")
      : await RtagClient.createState(token, {}).then((sId) => {
          history.replace(`/game/${sId}`);
          return sId;
        });

  return RtagClient.connect(location.host, token, stateId, onStateChange);
}

export default Game;
