import { startCase } from "lodash-es";
import { Color, PieceType } from "../../.rtag/types";

export function getImagePath(type: PieceType, color: Color): string {
  return `/src/images/Bug=${startCase(PieceType[type].toLowerCase())}-${
    color === Color.WHITE ? "Black" : "Mint"
  }.svg`;
}

export function getAllImagePaths(): string[] {
  return [
    getImagePath(PieceType.ANT, Color.WHITE),
    getImagePath(PieceType.BEETLE, Color.WHITE),
    getImagePath(PieceType.GRASSHOPPER, Color.WHITE),
    getImagePath(PieceType.LADYBUG, Color.WHITE),
    getImagePath(PieceType.MOSQUITO, Color.WHITE),
    getImagePath(PieceType.PILLBUG, Color.WHITE),
    getImagePath(PieceType.QUEEN, Color.WHITE),
    getImagePath(PieceType.SPIDER, Color.WHITE),
    getImagePath(PieceType.ANT, Color.BLACK),
    getImagePath(PieceType.BEETLE, Color.BLACK),
    getImagePath(PieceType.GRASSHOPPER, Color.BLACK),
    getImagePath(PieceType.LADYBUG, Color.BLACK),
    getImagePath(PieceType.MOSQUITO, Color.BLACK),
    getImagePath(PieceType.PILLBUG, Color.BLACK),
    getImagePath(PieceType.QUEEN, Color.BLACK),
    getImagePath(PieceType.SPIDER, Color.BLACK),
  ];
}
