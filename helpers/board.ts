import { PieceId, Piece, BoardPosition } from "../.rtag/types";

export const NUM_SIDES_OF_PIECE = 6;

export interface IBoard {
  [position: string]: Piece[];
}

export function getPieceById(
  id: PieceId,
  unplayedPieces: Piece[],
  board: IBoard
): Piece {
  return (unplayedPieces.find((p) => p.id === id) ||
    boardPiecesAsList(board).find((p) => p.id === id))!;
}

export function getTopPieceAtPos(
  position: BoardPosition,
  board: IBoard
): Piece | undefined {
  const stack = board[getBoardPosKey(position)];
  if (stack && stack.length > 0) {
    return stack[stack.length - 1];
  }

  return undefined;
}

export function getBoardPosKey(position: BoardPosition): string {
  const { x, y } = position;
  return `${x}${y}`;
}

export function getSurroundingPositions(
  positions: BoardPosition[],
  board: IBoard
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

export function getSurroundingPieces(
  position: BoardPosition,
  board: IBoard
): Piece[] {
  return getSurroundingPositions([position], board)
    .map((p) => getTopPieceAtPos(p, board))
    .filter((p) => p !== undefined) as Piece[];
}

export function boardPiecesAsList(board: IBoard): Piece[] {
  return Object.values(board).flat();
}

export function isPieceSurrounded(piece: Piece, board: IBoard): boolean {
  if (piece.position === undefined) {
    return false;
  }
  return (
    getSurroundingPieces(piece.position, board).length === NUM_SIDES_OF_PIECE
  );
}

export function isHiveConnected(board: IBoard): boolean {
  const allPieces = boardPiecesAsList(board);
  const visited = new Set<number>();
  const queue: Piece[] = [];
  queue.push(allPieces[0]);

  while (queue.length > 0) {
    const current = queue.pop()!;
    visited.add(current.id);
    getSurroundingPositions([current.position!], board)
      .flatMap((pos) => board[getBoardPosKey(pos)])
      .forEach((p) => p && !visited.has(p.id) && queue.push(p));
  }

  return visited.size === allPieces.length;
}
