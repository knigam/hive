import { BoardPosition } from "../../.rtag/types";

export interface ICubeHex {
  x: number;
  y: number;
  z: number;
}

export interface IAxialHex {
  q: number;
  r: number;
}

export function cubeRound(hex: ICubeHex): ICubeHex {
  const { x, y, z } = hex;

  var rx = Math.round(x);
  var ry = Math.round(y);
  var rz = Math.round(z);

  const x_diff = Math.abs(rx - x);
  const y_diff = Math.abs(ry - y);
  const z_diff = Math.abs(rz - z);

  if (x_diff > y_diff && x_diff > z_diff) {
    rx = -ry - rz;
  } else if (y_diff > z_diff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }
  return { x: rx, y: ry, z: rz };
}

export function cubeToAxial(hex: ICubeHex): IAxialHex {
  const { x, z } = hex;
  return { q: x, r: z };
}

export function axialToCube(hex: IAxialHex): ICubeHex {
  const { q, r } = hex;
  const x = q;
  const z = r;
  const y = -x - z;
  return { x, y, z };
}

export function axialToBoardPosition(hex: IAxialHex): BoardPosition {
  // Axial q referrs to BoardPosition.x and r reffers to BoardPosition.y
  return { x: hex.q, y: hex.r };
}
