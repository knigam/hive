import { Color, PieceType } from "../../.rtag/types";
import ant_black from "../images/Ant-Black.svg";
import ant_mint from "../images/Ant-Mint.svg";
import beetle_black from "../images/Beetle-Black.svg";
import beetle_mint from "../images/Beetle-Mint.svg";
import grasshopper_black from "../images/Grasshopper-Black.svg";
import grasshopper_mint from "../images/Grasshopper-Mint.svg";
import ladybug_black from "../images/Ladybug-Black.svg";
import ladybug_mint from "../images/Ladybug-Mint.svg";
import mosquito_black from "../images/Mosquito-Black.svg";
import mosquito_mint from "../images/Mosquito-Mint.svg";
import pillbug_black from "../images/Pillbug-Black.svg";
import pillbug_mint from "../images/Pillbug-Mint.svg";
import queen_black from "../images/Queen-Black.svg";
import queen_mint from "../images/Queen-Mint.svg";
import spider_black from "../images/Spider-Black.svg";
import spider_mint from "../images/Spider-Mint.svg";

export function getImagePath(type: PieceType, color: Color): string {
  switch (color) {
    case Color.WHITE:
      switch (type) {
        case PieceType.QUEEN:
          return queen_black;
        case PieceType.ANT:
          return ant_black;
        case PieceType.GRASSHOPPER:
          return grasshopper_black;
        case PieceType.SPIDER:
          return spider_black;
        case PieceType.BEETLE:
          return beetle_black;
        case PieceType.LADYBUG:
          return ladybug_black;
        case PieceType.MOSQUITO:
          return mosquito_black;
        case PieceType.PILLBUG:
          return pillbug_black;
      }
    case Color.BLACK:
      switch (type) {
        case PieceType.QUEEN:
          return queen_mint;
        case PieceType.ANT:
          return ant_mint;
        case PieceType.GRASSHOPPER:
          return grasshopper_mint;
        case PieceType.SPIDER:
          return spider_mint;
        case PieceType.BEETLE:
          return beetle_mint;
        case PieceType.LADYBUG:
          return ladybug_mint;
        case PieceType.MOSQUITO:
          return mosquito_mint;
        case PieceType.PILLBUG:
          return pillbug_mint;
      }
  }
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
