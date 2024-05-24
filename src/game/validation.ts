import { first, uniq, uniqBy } from "lodash-es";
import { Piece, BoardPosition, Color, PieceType, Move } from "./types";
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
  getFreelyClimbablePieces,
  getFreelyDroppableSpaces,
} from "./board";

export function doesPlayerHaveValidMoves(
  board: IBoard,
  currentPlayerColor: Color,
  unplayedPieces: Piece[],
  lastMove: Move | undefined
): boolean {
  return unplayedPieces
    .concat(boardPiecesAsList(board))
    .find(
      (p) =>
        getValidMoves(
          p,
          board,
          currentPlayerColor,
          currentPlayerColor,
          lastMove,
          false
        ).length > 0
    ) // tournament rules don't matter here since they only apply to first move, when there are always other valid moves
    ? true
    : false;
}

export function getValidMoves(
  piece: Piece,
  board: IBoard,
  currentPlayerColor: Color,
  currentPlayerTurn: Color,
  lastMove: Move | undefined,
  tournament: boolean
): BoardPosition[] {
  // 0. if it is not the current player's turn, they have no valid moves
  if (currentPlayerColor !== currentPlayerTurn) {
    return [];
  }

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
    getTopPieceAtPos(piece.position!, board)?.id !== piece.id
  ) {
    return [];
  }

  // 6. if a piece was just moved by your opponent, it has no valid moves
  if (lastMove && lastMove.piece.id === piece.id) {
    return [];
  }

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

  /** 9. otherwise, defer to piece specific rules
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
  let validMovesForPiece: BoardPosition[] = [];
  if (piece.color === currentPlayerColor) {
    switch (piece.type) {
      case PieceType.QUEEN:
        validMovesForPiece = validMovesForQueen(piece, board);
        break;
      case PieceType.ANT:
        validMovesForPiece = validMovesForAnt(piece, board);
        break;
      case PieceType.GRASSHOPPER:
        validMovesForPiece = validMovesForGrasshopper(piece, board);
        break;
      case PieceType.SPIDER:
        validMovesForPiece = validMovesForSpider(piece, board);
        break;
      case PieceType.BEETLE:
        validMovesForPiece = validMovesForBeetle(piece, board);
        break;
      case PieceType.LADYBUG:
        validMovesForPiece = validMovesForLadybug(piece, board);
        break;
      case PieceType.MOSQUITO:
        validMovesForPiece = validMovesForMosquito(piece, board);
        break;
      case PieceType.PILLBUG:
        validMovesForPiece = validMovesForPillbug(piece, board);
        break;
    }
  }

  // pillbug can't move anything on a stack or anything that is not free to move up to pillbug and down to the free space, it also can't use ability if it was just moved
  const neighboringPillbugs =
    piece.stack! > 0
      ? []
      : getSurroundingPieces(piece.position, board).filter(
          (p) =>
            p.color === currentPlayerColor &&
            !(lastMove && p.id === lastMove.piece.id) &&
            (p.type === PieceType.PILLBUG ||
              (p.type === PieceType.MOSQUITO &&
                p.stack === 0 &&
                getSurroundingPieces(p.position!, board).find(
                  (n) => n.type === PieceType.PILLBUG
                ))) &&
            getFreelyClimbablePieces(piece, board).find(
              (n) =>
                p.position!.x === n.position!.x &&
                p.position!.y === n.position!.y
            )
        );
  const validMovesFromPillbug = neighboringPillbugs.flatMap((p) =>
    getFreelyDroppableSpaces({ ...p, stack: p.stack! + 1 }, board)
  );

  return uniqBy(
    validMovesForPiece.concat(validMovesFromPillbug),
    getBoardPosKey
  );
}

export function validatePieceType(expected: PieceType[], found: PieceType) {
  if (!expected.some((i) => i === found)) {
    throw new Error(
      `Expected piece of type [${expected
        .map((i) => PieceType[i])
        .join(", ")}] but found ${PieceType[found]}`
    );
  }
}

export function validMovesForQueen(
  piece: Piece,
  board: IBoard
): BoardPosition[] {
  validatePieceType([PieceType.QUEEN, PieceType.MOSQUITO], piece.type);
  return validNFreelyMoveableSpaces(piece, board, 1);
}

export function validMovesForAnt(piece: Piece, board: IBoard): BoardPosition[] {
  validatePieceType([PieceType.ANT, PieceType.MOSQUITO], piece.type);
  return validNFreelyMoveableSpaces(piece, board);
}

export function validMovesForSpider(
  piece: Piece,
  board: IBoard
): BoardPosition[] {
  validatePieceType([PieceType.SPIDER, PieceType.MOSQUITO], piece.type);
  return validNFreelyMoveableSpaces(piece, board, 3);
}

export function validMovesForBeetle(
  piece: Piece,
  board: IBoard
): BoardPosition[] {
  validatePieceType([PieceType.BEETLE, PieceType.MOSQUITO], piece.type);
  const { position, stack } = piece;
  if (!position || stack == undefined) {
    return [];
  }

  const climbablePiecePositions = getFreelyClimbablePieces(piece, board).map(
    (p) => p.position!
  ); // all pieces the beetle can move onto

  // If the beetle is already on a stack, it can climb to another piece or drop down to an empty space
  if (stack > 0) {
    return climbablePiecePositions.concat(
      getFreelyDroppableSpaces(piece, board)
    );
  }

  // Otherwise, if it's already on the ground, it can go to any free neighboring space or climb onto a piece
  return climbablePiecePositions.concat(
    validNFreelyMoveableSpaces(piece, board, 1)
  );
}

export function validMovesForGrasshopper(
  piece: Piece,
  board: IBoard
): BoardPosition[] {
  validatePieceType([PieceType.GRASSHOPPER, PieceType.MOSQUITO], piece.type);
  const { position } = piece;
  if (!position) {
    return [];
  }
  const surroundingPieces = getSurroundingPieces(position, board);
  return surroundingPieces.map((neighbor) => {
    const direction = {
      x: neighbor.position!.x - position.x,
      y: neighbor.position!.y - position.y,
    };
    let currentPos = neighbor.position!;
    while (getTopPieceAtPos(currentPos, board)) {
      currentPos = {
        x: currentPos.x + direction.x,
        y: currentPos.y + direction.y,
      };
    }
    return currentPos;
  });
}

export function validMovesForLadybug(
  piece: Piece,
  board: IBoard
): BoardPosition[] {
  validatePieceType([PieceType.LADYBUG, PieceType.MOSQUITO], piece.type);
  const { position, stack } = piece;
  if (!position || stack === undefined) {
    return [];
  }

  const firstClimbablePieces = getFreelyClimbablePieces(piece, board);

  const secondClimbablePieces = uniqBy(
    firstClimbablePieces.flatMap((p) => {
      const simulatedLadybug = {
        ...piece,
        position: p.position,
        stack: p.stack! + 1,
      };
      return getFreelyClimbablePieces(
        simulatedLadybug,
        getBoardWithoutPiece(piece, board)
      ); // use board without original piece here so it doesn't try to climb over itself
    }),
    (p) => getBoardPosKey(p.position!)
  );

  const droppableSpaces = secondClimbablePieces.flatMap((p) => {
    const simulatedLadybug = {
      ...piece,
      position: p.position,
      stack: p.stack! + 1,
    };
    return getFreelyDroppableSpaces(simulatedLadybug, board); // use board with piece here so it doesn't drop to original position
  });

  return uniqBy(droppableSpaces, getBoardPosKey);
}

export function validMovesForMosquito(
  piece: Piece,
  board: IBoard
): BoardPosition[] {
  validatePieceType([PieceType.MOSQUITO], piece.type);
  const { position, stack } = piece;

  // if the mosiquito is in a stack, it acts like a beetle until it is back on the ground
  if (stack && stack > 0) {
    return validMovesForBeetle(piece, board);
  }

  // otherwise, get the valid moves for the piece as if it was any of the surrounding piece types
  const uniqueSurroundingTypes = uniq(
    getSurroundingPieces(piece.position!, board).map((p) => p.type)
  );
  return uniqBy(
    uniqueSurroundingTypes.flatMap((type) => {
      switch (type) {
        case PieceType.QUEEN:
          return validMovesForQueen(piece, board);
        case PieceType.ANT:
          return validMovesForAnt(piece, board);
        case PieceType.GRASSHOPPER:
          return validMovesForGrasshopper(piece, board);
        case PieceType.SPIDER:
          return validMovesForSpider(piece, board);
        case PieceType.BEETLE:
          return validMovesForBeetle(piece, board);
        case PieceType.LADYBUG:
          return validMovesForLadybug(piece, board);
        case PieceType.MOSQUITO: // When next to just a mosquito, the mosquito has no valid moves
          return [];
        case PieceType.PILLBUG:
          return validMovesForPillbug(piece, board);
      }
    }),
    getBoardPosKey
  );
}

export function validMovesForPillbug(
  piece: Piece,
  board: IBoard
): BoardPosition[] {
  validatePieceType([PieceType.PILLBUG, PieceType.MOSQUITO], piece.type);
  return validNFreelyMoveableSpaces(piece, board, 1);
}

/*
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
