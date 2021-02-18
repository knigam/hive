import { Methods } from "./.rtag/methods";
import {
  BoardPosition,
  Color,
  GameStatus,
  Piece,
  UserData,
  PlayerName,
  PlayerState,
  ICreateGameRequest,
  IJoinGameRequest,
  IStartGameRequest,
  IMovePieceRequest,
  ISelectPieceRequest,
  PieceType,
  PieceId,
} from "./.rtag/types";
import { uniqBy } from "lodash-es";

const NUM_SIDES_OF_PIECE = 6;

interface InternalState {
  creator: PlayerName;
  players: PlayerName[];
  currentPlayerTurn?: Color;
  color: { [playerName: string]: Color };
  unplayedPieces: Piece[];
  board: { [position: string]: Piece[] };
  selectedPiece?: Piece;
}

export class Impl implements Methods<InternalState> {
  createGame(userData: UserData, _request: ICreateGameRequest): InternalState {
    return {
      creator: userData.name,
      players: [userData.name],
      color: {},
      unplayedPieces: [],
      board: {},
    };
  }

  joinGame(
    state: InternalState,
    userData: UserData,
    _request: IJoinGameRequest
  ): string | void {
    state.players.push(userData.name);
  }

  startGame(
    state: InternalState,
    userData: UserData,
    request: IStartGameRequest
  ): string | void {
    if (state.players.length !== 2) {
      return "A game must contain 2 players before starting";
    }
    state.color[state.players[0]] =
      request.creatorColor || (Math.random() < 0.5 ? Color.WHITE : Color.BLACK); // Assign whichever color was picked to creator or random if nothing was picked
    state.color[state.players[1]] =
      state.color[state.players[0]] === Color.WHITE ? Color.BLACK : Color.WHITE; // Assign the other color to the other player
    state.currentPlayerTurn = Color.WHITE; // White always goes first

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

  selectPiece(
    state: InternalState,
    userData: UserData,
    request: ISelectPieceRequest
  ): string | void {
    const { color, currentPlayerTurn } = state;
    const currentPlayerColor = color[userData.name];
    const piece = getPieceById(request.pieceId, state);

    if (canSelectPiece(currentPlayerColor, currentPlayerTurn!, piece)) {
      state.selectedPiece = piece;
    } else if (currentPlayerColor !== currentPlayerTurn) {
      return `It is not your turn`;
    } else if (currentPlayerColor !== piece.color) {
      return "You can only select pieces that are your own color";
    }
  }

  movePiece(
    state: InternalState,
    userData: UserData,
    request: IMovePieceRequest
  ): string | void {
    const { pieceId, position } = request;
    const { board, color, currentPlayerTurn } = state;
    const currentPlayerColor = color[userData.name];
    const piece = getPieceById(pieceId, state);

    if (canSelectPiece(currentPlayerColor, currentPlayerTurn!, piece)) {
      state.selectedPiece = piece;
    } else if (currentPlayerColor !== currentPlayerTurn) {
      return `It is not your turn`;
    } else if (currentPlayerColor !== piece.color) {
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

    // Make sure to reset selected piece and cycle current player
    state.selectedPiece = undefined;
    state.currentPlayerTurn =
      state.currentPlayerTurn === Color.WHITE ? Color.BLACK : Color.WHITE; // TODO: check if player actually has any valid moves
  }

  getUserState(state: InternalState, userData: UserData): PlayerState {
    const {
      creator,
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
      color: color[userData.name],
      currentPlayerTurn: currentPlayerTurn || Color.WHITE,
      players,
      status: gameStatus(currentPlayerTurn, board),
      selectedPiece: selectedPieceForPlayer,
      validMoves: selectedPieceForPlayer
        ? getValidMoves(selectedPieceForPlayer, board)
        : [],
      unplayedPieces,
      boardPieces: boardPiecesAsList(board),
    };
  }
}

function gameStatus(
  currentPlayerTurn: Color | undefined,
  board: { [position: string]: Piece[] }
) {
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

  if (whiteLost && blackLost) {
    return GameStatus.DRAW;
  } else if (whiteLost) {
    return GameStatus.BLACK_WON;
  } else if (blackLost) {
    return GameStatus.WHITE_WON;
  } else {
    return GameStatus.IN_PROGRESS;
  }
}

function getPieceById(id: PieceId, state: InternalState): Piece {
  return (state.unplayedPieces.find((p) => p.id === id) ||
    boardPiecesAsList(state.board).find((p) => p.id === id))!;
}

function getBoardPosKey(position: BoardPosition): string {
  const { x, y } = position;
  return `${x}${y}`;
}

function getTopPieceAtPos(
  position: BoardPosition,
  board: { [position: string]: Piece[] }
): Piece | undefined {
  const stack = board[getBoardPosKey(position)];
  if (stack && stack.length > 0) {
    return stack[stack.length - 1];
  }

  return undefined;
}

function getSurroundingPositions(
  positions: BoardPosition[],
  board: { [position: string]: Piece[] }
): BoardPosition[] {
  return positions.flatMap((p) => {
    const { x, y } = p;
    return [
      { x: x + 1, y: 0 },
      { x: x, y: y + 1 },
      { x: x - 1, y: y },
      { x: x, y: y - 1 },
      { x: x + 1, y: y - 1 },
      { x: x - 1, y: y + 1 },
    ];
  });
}

function getSurroundingPieces(
  piece: Piece,
  board: { [position: string]: Piece[] }
): Piece[] {
  if (piece.position === undefined) {
    return [];
  }

  return getSurroundingPositions([piece.position], board)
    .map((p) => getTopPieceAtPos(p, board))
    .filter((p) => p !== undefined) as Piece[];
}

function boardPiecesAsList(board: { [position: string]: Piece[] }) {
  return Object.values(board).flat();
}

function isPieceSurrounded(
  piece: Piece,
  board: { [position: string]: Piece[] }
): boolean {
  return getSurroundingPieces(piece, board).length === NUM_SIDES_OF_PIECE;
}

function canSelectPiece(
  currentPlayerColor: Color,
  currentPlayerTurn: Color,
  selectedPiece: Piece
): boolean {
  return (
    currentPlayerTurn === currentPlayerColor &&
    selectedPiece.color === currentPlayerColor
  );
}

function getValidMoves(
  piece: Piece,
  board: { [position: string]: Piece[] }
): BoardPosition[] {
  // TODO: make this logic real per peice. Enforce rules for placing new pieces. Enforce rules with putting queen down
  const ref =
    piece.position === undefined
      ? boardPiecesAsList(board).map((p) => p.position!)
      : [piece.position];

  if (ref.length === 0) {
    // If no pieces have been played, there is only one valid move
    return [{ x: 0, y: 0 }];
  }

  return uniqBy(
    getSurroundingPositions(ref, board).filter(
      (p) => getTopPieceAtPos(p, board) === undefined
    ),
    (p) => getBoardPosKey(p)
  );
}
