import React, { useState, useEffect } from "react";
import { useLocation, useHistory } from "react-router-dom";
import { History } from "history";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";

import Board from "./Board";
import PieceDrawer from "./PieceDrawer";
import Lobby from "./Lobby";
import { GameStatus, UserData } from "../game/types";
import { Impl, InternalState } from "../game/impl";
import { auth, db } from "../services/firebase";

const MIN_PIECE_DRAWER_HEIGHT = 100;
const PIECE_SIZE = 75;
const impl = new Impl();

interface IGameProps {
  height: number;
  width: number;
}

function Game(props: IGameProps) {
  const { height, width } = props;
  const [gameState, setGameState] = useState<InternalState | undefined>(
    undefined
  );
  const [userState, setUserState] = useState<UserData | undefined>(undefined);
  const [is404, setIs404] = useState<boolean>(false);
  const path = useLocation().pathname;
  const history = useHistory();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (!userState) {
          setUserState({
            type: "anonymous",
            id: user.uid,
            name: user.displayName || "",
          });
        }
      } else {
        signInAnonymously(auth).catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
          console.log(`${errorCode}: ${errorMessage}`);
        });
      }
    });
    if (userState && !gameState) {
      initGame(userState, path, history, setGameState).catch((e) => {
        setIs404(true);
      });
    }
    console.log("hit");
    return () => {
      unsub();
    };
  }, [path, userState]);

  if (gameState && userState && !is404 && path !== "/game") {
    const playerState = impl.getUserState(gameState, userState);
    const boardHeight = Math.min(
      height * 0.8,
      height - MIN_PIECE_DRAWER_HEIGHT
    );
    const pieceDrawerHeight = height - boardHeight;

    return (
      <div>
        {playerState.status === GameStatus.NOT_STARTED && (
          <Lobby
            {...playerState}
            gameState={gameState}
            userState={userState}
          ></Lobby>
        )}
        {playerState.status !== GameStatus.NOT_STARTED && (
          <div>
            <Board
              pieceSize={PIECE_SIZE}
              height={boardHeight}
              width={width}
              {...playerState}
              gameState={gameState}
              userState={userState}
            ></Board>
            <PieceDrawer
              gameState={gameState}
              userState={userState}
              height={pieceDrawerHeight}
              {...playerState}
            ></PieceDrawer>
          </div>
        )}
      </div>
    );
  } else if (is404) {
    return (
      <div className="background">
        <span className="fourOhFour">
          Game with this Game Code does not exist
        </span>
      </div>
    );
  } else {
    return <div></div>;
  }
}

async function initGame(
  userState: UserData,
  path: string,
  history: History,
  setGame: React.Dispatch<React.SetStateAction<InternalState | undefined>>
): Promise<void> {
  if (path === "/game") {
    const gameId = Date.now().toString(36).slice(0, 6);
    const docRef = doc(db, "games", gameId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      impl.createGame(gameId, userState).then((result) => {
        if (result.type === "success") {
          history.replace(`/game/${gameId}`);
        } else {
          throw Error(result.error);
        }
      });
    }
  } else {
    const gameId = path.split("/").pop()!;
    onSnapshot(doc(db, "games", gameId), (doc) => {
      if (doc.exists()) {
        setGame({ ...doc.data() } as InternalState);
      } else {
        throw Error("Game does not exist");
      }
    });
  }
}

export default Game;
