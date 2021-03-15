import { compact, over } from 'lodash-es'
import { PieceId, Piece, BoardPosition } from '../.rtag/types'

export const NUM_SIDES_OF_PIECE = 6

export interface IBoard {
  [position: string]: Piece[]
}

export function boardPiecesAsList(board: IBoard): Piece[] {
  return Object.values(board).flat()
}

export function getPieceById(
  id: PieceId,
  unplayedPieces: Piece[],
  board: IBoard,
): Piece {
  return (unplayedPieces.find((p) => p.id === id) ||
    boardPiecesAsList(board).find((p) => p.id === id))!
}

export function getTopPieceAtPos(
  position: BoardPosition,
  board: IBoard,
): Piece | undefined {
  const stack = board[getBoardPosKey(position)]
  if (stack && stack.length > 0) {
    return stack[stack.length - 1]
  }

  return undefined
}

export function getBoardPosKey(position: BoardPosition): string {
  const { x, y } = position
  return `${x},${y}`
}

export function getBoardPositionFromKey(key: string): BoardPosition {
  const vals = key
    .split(',')
    .map((i) => Number.parseInt(i))
    .filter(Number.isInteger)
  if (vals.length !== 2) {
    throw new Error(
      `The provided key ${key} could not be parsed into a BoardPosition`,
    )
  }
  return { x: vals[0], y: vals[1] }
}

export function getSurroundingPositions(
  positions: BoardPosition[],
): BoardPosition[] {
  return positions.flatMap((p) => {
    const { x, y } = p
    return [
      { x: x + 1, y: y },
      { x: x, y: y + 1 },
      { x: x - 1, y: y },
      { x: x, y: y - 1 },
      { x: x + 1, y: y - 1 },
      { x: x - 1, y: y + 1 },
    ]
  })
}

export function getSurroundingPieces(
  position: BoardPosition,
  board: IBoard,
): Piece[] {
  return getSurroundingPositions([position])
    .map((p) => getTopPieceAtPos(p, board))
    .filter((p) => p !== undefined) as Piece[]
}

export function isPieceSurrounded(piece: Piece, board: IBoard): boolean {
  if (piece.position === undefined) {
    return false
  }
  return (
    getSurroundingPieces(piece.position, board).length === NUM_SIDES_OF_PIECE
  )
}

export function getFreelyMovableSpaces(
  position: BoardPosition,
  board: IBoard,
): BoardPosition[] {
  const surroundingPositions = getSurroundingPositions([position])
  return surroundingPositions.filter(
    (pos) =>
      !getTopPieceAtPos(pos, board) && // For each surrounding space that doesn't have a piece in it, find all of the surrounding spaces (neighbors)
      getSurroundingPieces(pos, board).length > 0 && // Make sure there is a piece touching the new pos
      getOverlappingNeighbors(surroundingPositions, pos, board).length === 1, // check which of these overlap spaces have pieces. There should always be two overlaps. If both have pieces, the piece cannot freely move here
  )
}

/*
From Hive FAQ
Let's say the beetle is at B and wants to move to A.
Take the beetle temporarily off of B.
If the shortest stack of tiles of C and D is taller than the tallest stack of tiles of A and B, then the beetle can't move to A.
In all other scenarios the beetle is free to move from B to A.

For those who prefer a math formula:
If
height(A) < height(C) and
height(A) < height(D) and
height(B) < height(C) and
height(B) < height(D)
then
moving between A and B (in either direction) is illegal, because the beetle cannot slip through the "gate" formed by C and D, which are both strictly higher than A and B.
Otherwise, movement between A and B is legal.

For a lengthy discussion on this subject, see http://www.boardgamegeek.com/thread/332467 .
 */
export function canFreelyMoveAcrossStacks(
  source: Piece,
  blockers: Piece[],
  target?: Piece,
): boolean {
  if (blockers.length < 2) {
    return true
  }
  const minBlockerStack = Math.min(...blockers.map((b) => b.stack!))
  const maxSourceTargetStack = Math.max(
    source.stack! - 1,
    (target && target.stack!) || 0,
  )
  return !(minBlockerStack > maxSourceTargetStack)
}

export function getFreelyClimbablePieces(piece: Piece, board: IBoard): Piece[] {
  if (!piece.position) {
    return []
  }
  const surroundingPieces = getSurroundingPieces(piece.position, board)
  const surroundingPositions = surroundingPieces.map((p) => p.position!)
  return surroundingPieces.filter((n) => {
    const overlap = getOverlappingNeighbors(
      surroundingPositions,
      n.position!,
      board,
    )
    return canFreelyMoveAcrossStacks(piece, overlap, n)
  })
}

export function getFreelyDroppableSpaces(
  piece: Piece,
  board: IBoard,
): BoardPosition[] {
  if (!piece.position || !piece.stack) {
    return []
  }
  const surroundingPositions = getSurroundingPositions([piece.position])
  return surroundingPositions.filter(
    (t) =>
      !getTopPieceAtPos(t, board) &&
      canFreelyMoveAcrossStacks(
        piece,
        getOverlappingNeighbors(surroundingPositions, t, board),
      ),
  )
}

export function getOverlappingNeighbors(
  source: BoardPosition | BoardPosition[], // pass in either a source position or the surrounding positions of a source position
  target: BoardPosition,
  board: IBoard,
): Piece[] {
  const surroundingPositions = Array.isArray(source)
    ? source
    : getSurroundingPositions([source])

  // find the overlap between the neighbors of the target space and the original surrounding positions of the source position
  return compact(
    getSurroundingPositions([target])
      .filter((n) =>
        surroundingPositions.some((p) => p.x === n.x && p.y === n.y),
      )
      .map((overlap) => getTopPieceAtPos(overlap, board)),
  )
}

export function getBoardWithoutPiece(piece: Piece, board: IBoard): IBoard {
  if (!piece.position) {
    return board
  }
  const positionKey = getBoardPosKey(piece.position)
  return {
    ...board,
    [positionKey]: [...board[positionKey].filter((p) => p.id !== piece.id)],
  }
}

export function isHiveConnected(board: IBoard): boolean {
  const allPieces = boardPiecesAsList(board)
  const visited = new Set<number>()
  const stack: Piece[] = []
  stack.push(allPieces[0])

  while (stack.length > 0) {
    const current = stack.pop()!
    visited.add(current.id)
    getSurroundingPositions([current.position!])
      .flatMap((pos) => board[getBoardPosKey(pos)])
      .forEach((p) => p && !visited.has(p.id) && stack.push(p))
  }

  return visited.size === allPieces.length
}
