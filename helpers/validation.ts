import { uniqBy } from "lodash-es";
import { Piece, BoardPosition, Color } from "../.rtag/types";
import {
  boardPiecesAsList,
  getSurroundingPositions,
  getTopPieceAtPos,
  getBoardPosKey,
  IBoard,
} from "./board";

export function doesPlayerHaveValidMoves(
  board: IBoard,
  currentPlayerTurn: Color,
  unplayedPieces: Piece[]
): boolean {
  return unplayedPieces
    .concat(boardPiecesAsList(board))
    .filter((p) => p.color === currentPlayerTurn) // TODO: need to change this to allow moving an opponent piece with pillbug.
    .find((p) => getValidMoves(p, board).length > 0)
    ? true
    : false;
}

export function getValidMoves(piece: Piece, board: IBoard): BoardPosition[] {
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
