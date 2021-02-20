import { Methods } from "./.rtag/methods";
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
} from "./.rtag/types";
import {
  getPieceById,
  getBoardPosKey,
  boardPiecesAsList,
  isPieceSurrounded,
  IBoard,
} from "./helpers/board";
import { getValidMoves, doesPlayerHaveValidMoves } from "./helpers/validation";

interface InternalState {
  creatorId: string;
  creatorName: PlayerName;
  players: PlayerName[];
  currentPlayerTurn?: Color;
  color: { [playerName: string]: Color };
  unplayedPieces: Piece[];
  board: IBoard;
  selectedPiece?: Piece;
  tournament: boolean;
}

export class Impl implements Methods<InternalState> {
  createGame(userData: UserData, _request: ICreateGameRequest): InternalState {
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

  setupGame(
    state: InternalState,
    userData: UserData,
    request: ISetupGameRequest
  ): string | void {
    if (gameStatus(state) !== GameStatus.NOT_STARTED) {
      return "Game has already been started";
    } else if (state.creatorId !== userData.id) {
      return "Only creator can set up the game";
    }
    state.players.push(userData.name);
    state.color[state.players[0]] =
      request.creatorColor || (Math.random() < 0.5 ? Color.WHITE : Color.BLACK); // Assign whichever color was picked to creator or random if nothing was picked
    state.color[state.players[1]] =
      state.color[state.players[0]] === Color.WHITE ? Color.BLACK : Color.WHITE; // Assign the other color to the other player
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
  }

  playGame(
    state: InternalState,
    userData: UserData,
    _request: IPlayGameRequest
  ): string | void {
    const { creatorName: creator, players } = state;
    if (gameStatus(state) !== GameStatus.NOT_STARTED) {
      return "Game has already been started";
    } else if (state.creatorId === userData.id) {
      return "Waiting for another player to start playing the game";
    } else if (players.length === 0) {
      return `${creator} must set up the game before it can be started`;
    }

    const numConflicts = players.filter((p) => p === userData.name).length;
    state.players.push(
      `${userData.name}${numConflicts > 0 ? `#${numConflicts + 1}` : ""}`
    );
    state.currentPlayerTurn = Color.WHITE; // White always goes first
  }

  selectPiece(
    state: InternalState,
    userData: UserData,
    request: ISelectPieceRequest
  ): string | void {
    if (gameStatus(state) !== GameStatus.IN_PROGRESS) {
      return "Game is not in progress";
    }

    const { color, currentPlayerTurn, unplayedPieces, board } = state;
    const currentPlayerColor = color[userData.name];
    const piece = getPieceById(request.pieceId, unplayedPieces, board);

    if (canSelectPiece(currentPlayerColor, currentPlayerTurn!, piece)) {
      state.selectedPiece =
        state.selectedPiece && state.selectedPiece.id === piece.id // If the piece that was just selected was already selected, deselect instead
          ? undefined
          : piece;
    } else if (currentPlayerColor !== currentPlayerTurn) {
      return `It is not your turn`;
    } else if (currentPlayerColor !== piece.color) {
      // TODO: need to change this to allow selecting an opponent piece with pillbug.
      return "You can only select pieces that are your own color";
    }
  }

  movePiece(
    state: InternalState,
    userData: UserData,
    request: IMovePieceRequest
  ): string | void {
    if (gameStatus(state) !== GameStatus.IN_PROGRESS) {
      return "Game is not in progress";
    }

    const { pieceId, position } = request;
    const { board, color, currentPlayerTurn, unplayedPieces } = state;
    const currentPlayerColor = color[userData.name];
    const piece = getPieceById(pieceId, unplayedPieces, board);

    if (canSelectPiece(currentPlayerColor, currentPlayerTurn!, piece)) {
      state.selectedPiece = piece;
    } else if (currentPlayerColor !== currentPlayerTurn) {
      return `It is not your turn`;
    } else if (currentPlayerColor !== piece.color) {
      // TODO: need to change this to allow moving an opponent piece with pillbug.
      return "You can only move pieces that are your own color";
    }
    if (
      !getValidMoves(piece, board).find(
        (p) => p.x === position.x && p.y === position.y
      )
    ) {
      return "This is not a valid move";
    }

    if (piece.position === undefined) {
      // If this is a new piece, remove it from unplayed list
      state.unplayedPieces = state.unplayedPieces.filter(
        (p) => p.id !== piece.id
      );
    } else {
      // If it's already on the board, remove it from current stack
      state.board[getBoardPosKey(piece.position)] = state.board[
        getBoardPosKey(piece.position)
      ].filter((p) => p.id !== piece.id);
    }
    if (!state.board[getBoardPosKey(position)]) {
      state.board[getBoardPosKey(position)] = []; // If new stack doesn't exist, create empty list
    }

    // Update the piece and add it to the correct stack
    piece.position = position;
    piece.stack = state.board[getBoardPosKey(position)].length; // Stack should represent the piece's index in the list, so we can use the size of the list before adding the piece
    state.board[getBoardPosKey(position)].push(piece);

    // Make sure to reset selected piece and cycle current player. If the new currentPlayer has no valid moves, cycle again. If no one has valid moves, the game is a draw.
    state.selectedPiece = undefined;
    state.currentPlayerTurn =
      state.currentPlayerTurn === Color.WHITE ? Color.BLACK : Color.WHITE;
    if (
      !doesPlayerHaveValidMoves(board, state.currentPlayerTurn, unplayedPieces)
    ) {
      state.currentPlayerTurn =
        state.currentPlayerTurn === Color.WHITE ? Color.BLACK : Color.WHITE;
    }
  }

  getUserState(state: InternalState, userData: UserData): PlayerState {
    const {
      creatorName: creator,
      tournament,
      color,
      currentPlayerTurn,
      players,
      selectedPiece,
      unplayedPieces,
      board,
    } = state;
    const currentPlayerColor = state.color[userData.name];
    const selectedPieceForPlayer =
      selectedPiece &&
      canSelectPiece(currentPlayerColor, currentPlayerTurn!, selectedPiece)
        ? selectedPiece
        : undefined;

    return {
      creator,
      tournament,
      color: color[userData.name],
      currentPlayerTurn: currentPlayerTurn || Color.WHITE,
      players,
      status: gameStatus(state),
      selectedPiece: selectedPieceForPlayer,
      validMoves: selectedPieceForPlayer
        ? getValidMoves(selectedPieceForPlayer, board)
        : [],
      unplayedPieces,
      boardPieces: boardPiecesAsList(board),
    };
  }
}

function gameStatus(state: InternalState) {
  const { board, currentPlayerTurn, unplayedPieces } = state;

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
    !doesPlayerHaveValidMoves(board, currentPlayerTurn, unplayedPieces)
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

function canSelectPiece(
  currentPlayerColor: Color,
  currentPlayerTurn: Color,
  selectedPiece: Piece
): boolean {
  return (
    currentPlayerTurn === currentPlayerColor &&
    selectedPiece.color === currentPlayerColor // TODO: need to change this to allow selecting an opponent piece with pillbug.
  );
}
