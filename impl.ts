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
  tournament: boolean;
}

export class Impl implements Methods<InternalState> {
  createGame(userData: UserData, _request: ICreateGameRequest): InternalState {
    return {
      creator: userData.name,
      players: [userData.name],
      color: {},
      unplayedPieces: [],
      board: {},
      tournament: false,
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
    if (gameStatus(state) !== GameStatus.NOT_STARTED) {
      return "Game has already been started";
    } else if (state.players.length !== 2) {
      return "A game must contain 2 players before starting";
    }
    state.color[state.players[0]] =
      request.creatorColor || (Math.random() < 0.5 ? Color.WHITE : Color.BLACK); // Assign whichever color was picked to creator or random if nothing was picked
    state.color[state.players[1]] =
      state.color[state.players[0]] === Color.WHITE ? Color.BLACK : Color.WHITE; // Assign the other color to the other player
    state.currentPlayerTurn = Color.WHITE; // White always goes first
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

  selectPiece(
    state: InternalState,
    userData: UserData,
    request: ISelectPieceRequest
  ): string | void {
    if (gameStatus(state) !== GameStatus.IN_PROGRESS) {
      return "Game is not in progress";
    }

    const { color, currentPlayerTurn } = state;
    const currentPlayerColor = color[userData.name];
    const piece = getPieceById(request.pieceId, state);

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
    const { board, color, currentPlayerTurn } = state;
    const currentPlayerColor = color[userData.name];
    const piece = getPieceById(pieceId, state);

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
    if (!doesPlayerHaveValidMoves(state)) {
      state.currentPlayerTurn =
        state.currentPlayerTurn === Color.WHITE ? Color.BLACK : Color.WHITE;
    }
  }

  getUserState(state: InternalState, userData: UserData): PlayerState {
    const {
      creator,
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

  if ((whiteLost && blackLost) || !doesPlayerHaveValidMoves(state)) {
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
      { x: x + 1, y: y },
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
    selectedPiece.color === currentPlayerColor // TODO: need to change this to allow selecting an opponent piece with pillbug.
  );
}

function doesPlayerHaveValidMoves(state: InternalState): boolean {
  const { board, currentPlayerTurn, unplayedPieces } = state;
  return unplayedPieces
    .concat(boardPiecesAsList(board))
    .filter((p) => p.color === currentPlayerTurn) // TODO: need to change this to allow moving an opponent piece with pillbug.
    .find((p) => getValidMoves(p, board).length > 0)
    ? true
    : false;
}

function getValidMoves(
  piece: Piece,
  board: { [position: string]: Piece[] }
): BoardPosition[] {
  /*
  1. if no pieces have been played there is only one  valid move for all pieces except queen (tournament rules)
  2. if the queen has not been played, pieces on the board have no valid moves
  3. if three pieces have been played and none of them are queen, all pieces other than queen have no moves
  4. if the piece is unplayed, it can only be placed touching like colors
  5. if the piece is already played, check if removing the piece violates the one hive rule. If it does, it has no valid moves
  6. a piece that has another piece on top of it has no valid moves
  7. if a piece was just moved by your  opponent, it has no valid moves
  8. otherwise, defer to piece specific rules
    * ant: can move to any accesible space around the hive
    * grasshopper: find all touching pieces, and then find the first available space in the same direction
    * spider: can move to an accesible space around the hive exactly 3 spaces to the right or left
    * queen: can move to an accessible space exactly 1 space to right or left
    * beetle: can move to an accessible space exactly 1 space to right or left, or can move on top of touching piece. If it's already in a stack, it can move 1 space any direction
    * ladybug: can move to any space touching a piece exactly two pieces away
    * mosquito: get the types of all surrounding bugs and find valid moves for each type
    * pillbug: can move to an accessible space exactly 1 space to right or left
    * any piece next to friendly pillbug or mosquito next to pillbug: can move to another free space next to friendly piece
  */

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
