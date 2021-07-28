import { Methods, Context, Result } from "./.rtag/methods";
import {
  Color,
  GameStatus,
  Piece,
  UserData,
  PlayerName,
  PlayerState,
  ICreateGameRequest,
  ISetupGameRequest,
  IPlayGameRequest,
  IMovePieceRequest,
  ISelectPieceRequest,
  PieceType,
  Move,
} from "./.rtag/types";
import { getPieceById, getBoardPosKey, boardPiecesAsList, isPieceSurrounded, IBoard } from "./helpers/board";
import { getValidMoves, doesPlayerHaveValidMoves } from "./helpers/validation";

interface InternalState {
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
}

export class Impl implements Methods<InternalState> {
  createGame(userData: UserData, _ctx: Context, _request: ICreateGameRequest): InternalState {
    return {
      creatorId: userData.id,
      creatorName: userData.name,
      players: [],
      color: {},
      unplayedPieces: [],
      board: {},
      tournament: false,
    };
  }

  setupGame(state: InternalState, userData: UserData, _ctx: Context, request: ISetupGameRequest): Result {
    if (gameStatus(state) !== GameStatus.NOT_STARTED) {
      return Result.unmodified("Game has already been started");
    } else if (state.creatorId !== userData.id) {
      return Result.unmodified("Only creator can set up the game");
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
    return Result.modified();
  }

  playGame(state: InternalState, userData: UserData, ctx: Context, _request: IPlayGameRequest): Result {
    const { creatorId, creatorName, creatorColor, players } = state;
    const { id, name } = userData;
    if (gameStatus(state) !== GameStatus.NOT_STARTED) {
      return Result.unmodified("Game has already been started");
    } else if (creatorId === id) {
      return Result.unmodified("Waiting for another player to start playing the game");
    } else if (players.length === 0) {
      return Result.unmodified(`${creatorName} must set up the game before it can be started`);
    }

    const numConflicts = players.filter((p) => p === name).length;
    state.players.push(`${name}${numConflicts > 0 ? `#${numConflicts + 1}` : ""}`);

    state.color[creatorId] = creatorColor != undefined ? creatorColor : ctx.rand() < 0.5 ? Color.WHITE : Color.BLACK; // Assign whichever color was picked to creator or random if nothing was picked
    state.color[id] = state.color[creatorId] === Color.WHITE ? Color.BLACK : Color.WHITE; // Assign the unused color to the new player
    state.currentPlayerTurn = Color.WHITE; // White always goes first
    return Result.modified();
  }

  selectPiece(state: InternalState, userData: UserData, _ctx: Context, request: ISelectPieceRequest): Result {
    if (gameStatus(state) !== GameStatus.IN_PROGRESS) {
      return Result.unmodified("Game is not in progress");
    }

    const { color, currentPlayerTurn, unplayedPieces, board } = state;
    const currentPlayerColor = getCurrentPlayerColor(state, userData);
    const piece = request.pieceId === undefined ? undefined : getPieceById(request.pieceId, unplayedPieces, board);

    if (canSelectPiece(currentPlayerColor, currentPlayerTurn!, piece)) {
      state.selectedPiece = piece;
    } else if (currentPlayerColor !== currentPlayerTurn) {
      return Result.unmodified(`It is not your turn`);
    } else if (piece && currentPlayerColor !== piece.color) {
      return Result.unmodified("You can only select new pieces that are your own color");
    }
    return Result.modified();
  }

  movePiece(state: InternalState, userData: UserData, _ctx: Context, request: IMovePieceRequest): Result {
    if (gameStatus(state) !== GameStatus.IN_PROGRESS) {
      return Result.unmodified("Game is not in progress");
    }

    const { pieceId, position: newPosition } = request;
    const { board, currentPlayerTurn, unplayedPieces, lastMove, tournament } = state;
    const currentPlayerColor = getCurrentPlayerColor(state, userData);
    const piece = getPieceById(pieceId, unplayedPieces, board);

    if (canSelectPiece(currentPlayerColor, currentPlayerTurn!, piece)) {
      state.selectedPiece = piece;
    } else if (currentPlayerColor !== currentPlayerTurn) {
      return Result.unmodified(`It is not your turn`);
    } else if (currentPlayerColor !== piece.color) {
      return Result.unmodified("You can only move new pieces that are your own color");
    }
    if (
      !getValidMoves(piece, board, currentPlayerColor, currentPlayerTurn!, lastMove, tournament).find(
        (p) => p.x === newPosition.x && p.y === newPosition.y
      )
    ) {
      return Result.unmodified("This is not a valid move");
    }

    const oldPosition = piece.position;
    if (oldPosition === undefined) {
      // If this is a new piece, remove it from unplayed list
      state.unplayedPieces = state.unplayedPieces.filter((p) => p.id !== piece.id);
    } else {
      // If it's already on the board, remove it from current stack
      state.board[getBoardPosKey(oldPosition)] = state.board[getBoardPosKey(oldPosition)].filter(
        (p) => p.id !== piece.id
      );
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
    state.currentPlayerTurn = state.currentPlayerTurn === Color.WHITE ? Color.BLACK : Color.WHITE;
    if (!doesPlayerHaveValidMoves(board, state.currentPlayerTurn, unplayedPieces, lastMove)) {
      state.currentPlayerTurn = state.currentPlayerTurn === Color.WHITE ? Color.BLACK : Color.WHITE;
    }
    return Result.modified();
  }

  getUserState(state: InternalState, userData: UserData): PlayerState {
    const {
      creatorId,
      creatorName: creator,
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
      selectedPiece && canSelectPiece(currentPlayerColor, currentPlayerTurn!, selectedPiece)
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
        ? getValidMoves(selectedPieceForPlayer, board, currentPlayerColor, currentPlayerTurn!, lastMove, tournament)
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
  const queens = boardPiecesAsList(board).filter((p) => p.type === PieceType.QUEEN);
  const whiteQueen = queens.find((q) => q.color === Color.WHITE);
  const blackQueen = queens.find((q) => q.color === Color.BLACK);
  const whiteLost = whiteQueen && isPieceSurrounded(whiteQueen, board);
  const blackLost = blackQueen && isPieceSurrounded(blackQueen, board);

  if ((whiteLost && blackLost) || !doesPlayerHaveValidMoves(board, currentPlayerTurn, unplayedPieces, lastMove)) {
    return GameStatus.DRAW;
  } else if (whiteLost) {
    return GameStatus.BLACK_WON;
  } else if (blackLost) {
    return GameStatus.WHITE_WON;
  } else {
    return GameStatus.IN_PROGRESS;
  }
}

function getCurrentPlayerColor(state: InternalState, userData: UserData): Color {
  return state.color[userData.id];
}

function canSelectPiece(currentPlayerColor: Color, currentPlayerTurn: Color, selectedPiece?: Piece): boolean {
  return (
    currentPlayerTurn === currentPlayerColor &&
    !(selectedPiece && !selectedPiece.position && selectedPiece.color !== currentPlayerColor)
  );
}
