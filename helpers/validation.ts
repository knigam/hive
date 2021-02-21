import { get, uniqBy } from "lodash-es";
import { Piece, BoardPosition, Color, PieceType } from "../.rtag/types";
import {
  boardPiecesAsList,
  getSurroundingPositions,
  getTopPieceAtPos,
  getBoardPosKey,
  IBoard,
  getSurroundingPieces,
  isHiveConnected,
  getFreelyMovableSpaces,
  getBoardWithoutPiece,
  getBoardPositionFromKey,
} from "./board";

export function doesPlayerHaveValidMoves(
  board: IBoard,
  currentPlayerColor: Color,
  unplayedPieces: Piece[]
): boolean {
  return unplayedPieces
    .concat(boardPiecesAsList(board))
    .filter((p) => p.color === currentPlayerColor) // TODO: need to change this to allow moving an opponent piece with pillbug.
    .find((p) => getValidMoves(p, board, currentPlayerColor, false).length > 0) // tournament rules don't matter here since they only apply to first move, when there are always other valid moves
    ? true
    : false;
}

export function getValidMoves(
  piece: Piece,
  board: IBoard,
  currentPlayerColor: Color,
  tournament: boolean
): BoardPosition[] {
  /*
    1. if no pieces have been played there is only one  valid move for all pieces except queen (tournament rules)
    2. if a single piece has been played so far, play at any surrounding space (except queen if playing tournament rules)
    3. if the queen has not been played, pieces on the board have no valid moves
    4. if three pieces have been played and none of them are queen, all pieces other than queen have no moves
    5. a piece that has another piece on top of it has no valid moves
    6. if a piece was just moved by your  opponent, it has no valid moves
    7. if the piece is already played, check if removing the piece violates the one hive rule. If it does, it has no valid moves
    8. if the piece is unplayed, it can only be placed touching like colors
    9. otherwise, defer to piece specific rules
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
  const piecesAsList = boardPiecesAsList(board);
  const friendlyPiecesAsList = piecesAsList.filter(
    (p) => p.color === currentPlayerColor
  );
  // 1. if no pieces have been played there is only one valid move for all pieces (except queen if playing tournament rules)
  if (piecesAsList.length === 0) {
    if (tournament && piece.type === PieceType.QUEEN) {
      return [];
    }
    return [{ x: 0, y: 0 }];
  }

  // 2. if a single piece has been played so far, play at any surrounding space (except queen if playing tournament rules)
  if (piecesAsList.length === 1) {
    if (tournament && piece.type === PieceType.QUEEN) {
      return [];
    }
    return getSurroundingPositions(piecesAsList.map((p) => p.position!));
  }

  const hasQueenBeenPlayed = friendlyPiecesAsList.find(
    (p) => p.type === PieceType.QUEEN
  );
  // 3. if the queen has not been played, pieces on the board have no valid moves
  if (!hasQueenBeenPlayed && piece.position) {
    return [];
  }

  // 4. if three pieces have been played and none of them are queen, all pieces other than queen have no moves
  if (
    friendlyPiecesAsList.length === 3 &&
    !hasQueenBeenPlayed &&
    piece.type !== PieceType.QUEEN
  ) {
    return [];
  }

  // 5. a piece that has another piece on top of it has no valid moves
  if (
    piece.position &&
    getTopPieceAtPos(piece.position!, board)!.id !== piece.id
  ) {
    return [];
  }

  // 6. TODO: if a piece was just moved by your  opponent, it has no valid moves

  // 7. if the piece is already played, check if removing the piece violates the one hive rule. If it does, it has no valid moves
  if (piece.position) {
    const boardWithoutPiece = getBoardWithoutPiece(piece, board);
    if (!isHiveConnected(boardWithoutPiece)) {
      return [];
    }
  }

  // 8. if the piece is unplayed, it can only be placed in an empty position touching at least one like color and no other colors
  if (piece.position === undefined) {
    return uniqBy(
      friendlyPiecesAsList
        .flatMap((p) => getSurroundingPositions([p.position!]))
        .filter(
          (pos) =>
            !getTopPieceAtPos(pos, board) &&
            getSurroundingPieces(pos, board).filter(
              (neighbor) => neighbor.color !== currentPlayerColor
            ).length === 0
        ),
      getBoardPosKey
    );
  }

  // 9. otherwise, defer to piece specific rules TODO: figure out how to incorporate pillbug rules
  switch (piece.type) {
    case PieceType.QUEEN:
      return validMovesForQueen(piece, board);
    case PieceType.ANT:
      return validMovesForAnt(piece, board);
    case PieceType.GRASSHOPPER:
      break;
    case PieceType.SPIDER:
      return validMovesForSpider(piece, board);
    case PieceType.BEETLE:
      break;
    case PieceType.LADYBUG:
      break;
    case PieceType.MOSQUITO:
      break;
    case PieceType.PILLBUG:
      break;
  }
  // TODO: remove code below this
  const ref =
    piece.position === undefined
      ? boardPiecesAsList(board).map((p) => p.position!)
      : [piece.position];

  if (ref.length === 0) {
    // If no pieces have been played, there is only one valid move
    return [{ x: 0, y: 0 }];
  }

  return uniqBy(
    getSurroundingPositions(ref).filter(
      (p) => getTopPieceAtPos(p, board) === undefined
    ),
    (p) => getBoardPosKey(p)
  );
}

export function validatePieceType(expected: PieceType, found: PieceType) {
  if (expected !== found) {
    throw new Error(
      `Expected piece of type ${PieceType[expected]} but found ${PieceType[found]}`
    );
  }
}

export function validMovesForQueen(
  piece: Piece,
  board: IBoard
): BoardPosition[] {
  validatePieceType(PieceType.QUEEN, piece.type);
  return validNFreelyMoveableSpaces(piece, board, 1);
}

export function validMovesForAnt(piece: Piece, board: IBoard): BoardPosition[] {
  validatePieceType(PieceType.ANT, piece.type);
  return validNFreelyMoveableSpaces(piece, board);
}

export function validMovesForSpider(
  piece: Piece,
  board: IBoard
): BoardPosition[] {
  validatePieceType(PieceType.SPIDER, piece.type);
  return validNFreelyMoveableSpaces(piece, board, 3);
}

/*
need to make this use a stack
get all freely movable spaces that don't break one hive  rule
add current to  visited and the rest to stack
pop and repeat n times
when you hit n, take result and add it to results list and clear visited
for ant, you can make n really high and keep going until everything in stack is visited, then return visited list
*/
export function validNFreelyMoveableSpaces(
  piece: Piece,
  board: IBoard,
  n?: number
): BoardPosition[] {
  const { position } = piece;
  if (!position) {
    return [];
  }
  const boardWithoutPiece = getBoardWithoutPiece(piece, board);
  let results: BoardPosition[] = [];
  const visited = new Set<string>();
  const stack: BoardPosition[][] = [[position]];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    if (current.length === 0) {
      stack.pop();
      continue;
    }
    const pos = current[current.length - 1];
    const key = getBoardPosKey(pos);
    if (visited.has(key)) {
      current.pop();
      visited.delete(key);
      continue;
    }
    visited.add(key);
    const newSpaces = getFreelyMovableSpaces(pos, boardWithoutPiece).filter(
      (s) => !visited.has(getBoardPosKey(s))
    );
    if (n === undefined && newSpaces.length === 0) {
      results = [...visited].map(getBoardPositionFromKey);
      break;
    } else if (stack.length === n) {
      results = results.concat(newSpaces);
    } else {
      stack.push(newSpaces);
    }
  }

  // distinct results before returning and filter out current location of piece since piece can't move to same position
  return uniqBy(results, getBoardPosKey).filter(
    (pos) => !(pos.x === position.x && pos.y === position.y)
  );
}
