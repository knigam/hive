import { Methods, Response } from "./methods";
import {
  Color,
  GameStatus,
  Piece,
  PlayerName,
  PlayerState,
  ISetupGameRequest,
  IMovePieceRequest,
  ISelectPieceRequest,
  PieceType,
  Move,
  UserData,
} from "./types";
import {
  getPieceById,
  getBoardPosKey,
  boardPiecesAsList,
  isPieceSurrounded,
  IBoard,
} from "./board";
import { getValidMoves, doesPlayerHaveValidMoves } from "./validation";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";

const gamesRef = collection(db, "games");

export type InternalState = {
  gameId: string;
  creatorId: string;
  creatorName: PlayerName;
  creatorColor?: Color;
  players: PlayerName[];
  currentPlayerTurn?: Color;
  color: { [playerName: string]: Color };
  unplayedPieces: Piece[];
  board: IBoard;
  selectedPiece?: Piece;
  lastMove?: Move;
  tournament: boolean;
};

export class Impl implements Methods<InternalState> {
  async createGame(gameId: string, userData: UserData): Promise<Response> {
    const gameState = {
      gameId: gameId,
      creatorId: userData.id,
      creatorName: userData.name,
      players: [],
      color: {},
      unplayedPieces: [],
      board: {},
      tournament: false,
    };
    return saveToFirebase(gameState);
  }

  async setupGame(
    state: InternalState,
    userData: UserData,
    request: ISetupGameRequest
  ): Promise<Response> {
    if (gameStatus(state) !== GameStatus.NOT_STARTED) {
      return Response.error("Game has already been started");
    } else if (state.creatorId !== userData.id) {
      return Response.error("Only creator can set up the game");
    }
    state.players = [userData.name];
    state.creatorColor = request.creatorColor;
    state.tournament = request.tournament || false;

    const whitePieces = request.whitePieces.map(
      (type, idx) =>
        ({
          id: idx,
          color: Color.WHITE,
          type,
        } as Piece)
    );
    const blackPieces = request.blackPieces.map(
      (type, idx) =>
        ({
          id: whitePieces.length + idx,
          color: Color.BLACK,
          type,
        } as Piece)
    );
    state.unplayedPieces = whitePieces.concat(blackPieces);
    return saveToFirebase(state);
  }

  async playGame(state: InternalState, userData: UserData): Promise<Response> {
    const { creatorId, creatorName, creatorColor, players } = state;
    const { id, name } = userData;
    if (gameStatus(state) !== GameStatus.NOT_STARTED) {
      return Response.error("Game has already been started");
    } else if (creatorId === id) {
      return Response.error(
        "Waiting for another player to start playing the game"
      );
    } else if (players.length === 0) {
      return Response.error(
        `${creatorName} must set up the game before it can be started`
      );
    }

    const numConflicts = players.filter((p) => p === name).length;
    state.players.push(`${name}${numConflicts > 0 ? numConflicts + 1 : ""}`);

    state.color[creatorId] =
      creatorColor != undefined
        ? creatorColor
        : Math.random() < 0.5
        ? Color.WHITE
        : Color.BLACK; // Assign whichever color was picked to creator or random if nothing was picked
    state.color[id] =
      state.color[creatorId] === Color.WHITE ? Color.BLACK : Color.WHITE; // Assign the unused color to the new player
    state.currentPlayerTurn = Color.WHITE; // White always goes first
    return saveToFirebase(state);
  }

  async selectPiece(
    state: InternalState,
    userData: UserData,
    request: ISelectPieceRequest
  ): Promise<Response> {
    if (gameStatus(state) !== GameStatus.IN_PROGRESS) {
      return Response.error("Game is not in progress");
    }

    const { currentPlayerTurn, unplayedPieces, board } = state;
    const currentPlayerColor = getCurrentPlayerColor(state, userData);
    const piece =
      request.pieceId === undefined
        ? undefined
        : getPieceById(request.pieceId, unplayedPieces, board);

    if (canSelectPiece(currentPlayerColor, currentPlayerTurn!, piece)) {
      state.selectedPiece = piece;
    } else if (currentPlayerColor !== currentPlayerTurn) {
      return Response.error("It is not your turn");
    } else if (piece && currentPlayerColor !== piece.color) {
      return Response.error(
        "You can only select new pieces that are your own color"
      );
    }
    return saveToFirebase(state);
  }

  async movePiece(
    state: InternalState,
    userData: UserData,
    request: IMovePieceRequest
  ): Promise<Response> {
    if (gameStatus(state) !== GameStatus.IN_PROGRESS) {
      return Response.error("Game is not in progress");
    }

    const { pieceId, position: newPosition } = request;
    const { board, currentPlayerTurn, unplayedPieces, lastMove, tournament } =
      state;
    const currentPlayerColor = getCurrentPlayerColor(state, userData);
    const piece = getPieceById(pieceId, unplayedPieces, board);

    if (canSelectPiece(currentPlayerColor, currentPlayerTurn!, piece)) {
      state.selectedPiece = piece;
    } else if (currentPlayerColor !== currentPlayerTurn) {
      return Response.error("It is not your turn");
    } else if (currentPlayerColor !== piece.color) {
      return Response.error(
        "You can only move new pieces that are your own color"
      );
    }
    if (
      !getValidMoves(
        piece,
        board,
        currentPlayerColor,
        currentPlayerTurn!,
        lastMove,
        tournament
      ).find((p) => p.x === newPosition.x && p.y === newPosition.y)
    ) {
      return Response.error("This is not a valid move");
    }

    const oldPosition = piece.position;
    if (oldPosition === undefined) {
      // If this is a new piece, remove it from unplayed list
      state.unplayedPieces = state.unplayedPieces.filter(
        (p) => p.id !== piece.id
      );
    } else {
      // If it's already on the board, remove it from current stack
      state.board[getBoardPosKey(oldPosition)] = state.board[
        getBoardPosKey(oldPosition)
      ].filter((p) => p.id !== piece.id);
    }
    if (!state.board[getBoardPosKey(newPosition)]) {
      state.board[getBoardPosKey(newPosition)] = []; // If new stack doesn't exist, create empty list
    }

    // Update the piece and add it to the correct stack
    piece.position = newPosition;
    piece.stack = state.board[getBoardPosKey(newPosition)].length; // Stack should represent the piece's index in the list, so we can use the size of the list before adding the piece
    state.board[getBoardPosKey(newPosition)].push(piece);
    state.lastMove = {
      color: currentPlayerColor,
      piece,
      movedFrom: oldPosition,
      movedTo: newPosition,
    };

    // Make sure to reset selected piece and cycle current player. If the new currentPlayer has no valid moves, cycle again. If no one has valid moves, the game is a draw.
    state.selectedPiece = undefined;
    state.currentPlayerTurn =
      state.currentPlayerTurn === Color.WHITE ? Color.BLACK : Color.WHITE;
    if (
      !doesPlayerHaveValidMoves(
        board,
        state.currentPlayerTurn,
        state.unplayedPieces,
        state.lastMove
      )
    ) {
      state.currentPlayerTurn =
        state.currentPlayerTurn === Color.WHITE ? Color.BLACK : Color.WHITE;
    }
    return saveToFirebase(state);
  }

  getUserState(state: InternalState, userData: UserData): PlayerState {
    const {
      creatorId,
      creatorColor,
      tournament,
      color,
      currentPlayerTurn,
      players,
      selectedPiece,
      lastMove,
      unplayedPieces,
      board,
    } = state;
    const { id } = userData;
    const currentPlayerColor = color[id];
    const selectedPieceForPlayer =
      selectedPiece &&
      canSelectPiece(currentPlayerColor, currentPlayerTurn!, selectedPiece)
        ? selectedPiece
        : undefined;

    return {
      isCreator: id === creatorId,
      creatorColor,
      tournament,
      color: currentPlayerColor,
      currentPlayerTurn: currentPlayerTurn || Color.WHITE,
      players,
      status: gameStatus(state),
      selectedPiece: selectedPieceForPlayer,
      lastMove,
      validMoves: selectedPieceForPlayer
        ? getValidMoves(
            selectedPieceForPlayer,
            board,
            currentPlayerColor,
            currentPlayerTurn!,
            lastMove,
            tournament
          )
        : [],
      unplayedPieces,
      boardPieces: boardPiecesAsList(board),
    };
  }
}

function gameStatus(state: InternalState) {
  const { board, currentPlayerTurn, unplayedPieces, lastMove } = state;

  if (currentPlayerTurn === undefined) {
    return GameStatus.NOT_STARTED;
  }
  // check if white or black won or if there's a draw
  const queens = boardPiecesAsList(board).filter(
    (p) => p.type === PieceType.QUEEN
  );
  const whiteQueen = queens.find((q) => q.color === Color.WHITE);
  const blackQueen = queens.find((q) => q.color === Color.BLACK);
  const whiteLost = whiteQueen && isPieceSurrounded(whiteQueen, board);
  const blackLost = blackQueen && isPieceSurrounded(blackQueen, board);

  if (
    (whiteLost && blackLost) ||
    !doesPlayerHaveValidMoves(
      board,
      currentPlayerTurn,
      unplayedPieces,
      lastMove
    )
  ) {
    return GameStatus.DRAW;
  } else if (whiteLost) {
    return GameStatus.BLACK_WON;
  } else if (blackLost) {
    return GameStatus.WHITE_WON;
  } else {
    return GameStatus.IN_PROGRESS;
  }
}

function getCurrentPlayerColor(
  state: InternalState,
  userData: UserData
): Color {
  return state.color[userData.id];
}

function canSelectPiece(
  currentPlayerColor: Color,
  currentPlayerTurn: Color,
  selectedPiece?: Piece
): boolean {
  return (
    currentPlayerTurn === currentPlayerColor &&
    !(
      selectedPiece &&
      !selectedPiece.position &&
      selectedPiece.color !== currentPlayerColor
    )
  );
}

function saveToFirebase(state: InternalState): Promise<Response> {
  return setDoc(doc(gamesRef, state.gameId), {
    ...state,
  })
    .then((t) => Response.ok())
    .catch((e) => Response.error(e));
}
