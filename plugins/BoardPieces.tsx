// @ts-ignore
import reactToWebComponent from "react-to-webcomponent";
import React from "react";
import ReactDOM from "react-dom";
import {
  BoardPosition,
  Color,
  Piece,
  PieceType,
  PlayerState,
} from "../.rtag/types";
import { RtagClient } from "../.rtag/client";
import { stat } from "fs";

const HEIGHT = 500;
const WIDTH = 500;
const PIECE_SIZE = 50;

export interface ICubeHex {
  x: number;
  y: number;
  z: number;
}

export interface IAxialHex {
  q: number;
  r: number;
}

export function cube_round(hex: ICubeHex): ICubeHex {
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

export function cube_to_axial(hex: ICubeHex): IAxialHex {
  const { x, z } = hex;
  return { q: x, r: z };
}

export function axial_to_cube(hex: IAxialHex): ICubeHex {
  const { q, r } = hex;
  const x = q;
  const z = r;
  const y = -x - z;
  return { x, y, z };
}

export interface IBoardProps {
  val: Piece[];
  state: PlayerState;
  client: RtagClient;
}

export interface IBoardState {
  mouseDown: boolean;
  startDragOffsetX: number;
  startDragOffsetY: number;
  translatePosX: number;
  translatePosY: number;
  scale: number;
}

class Board extends React.Component<IBoardProps, IBoardState> {
  state = {
    mouseDown: false,
    startDragOffsetX: 0,
    startDragOffsetY: 0,
    translatePosX: 0,
    translatePosY: 0,
    scale: 1,
  };
  private canvas?: HTMLCanvasElement;
  private setCanvasRef: (element: HTMLCanvasElement) => void;
  private height: number;
  private width: number;
  private pieceSize: number;

  constructor(props: IBoardProps) {
    super(props);
    this.setCanvasRef = (element) => {
      this.canvas = element;
    };
    this.height = HEIGHT;
    this.width = WIDTH;
    this.pieceSize = PIECE_SIZE;
  }

  componentDidMount() {
    this.drawBoard();
  }

  componentDidUpdate() {
    this.drawBoard();
  }

  render() {
    const { height, width } = this;
    return (
      <div>
        <canvas ref={this.setCanvasRef} height={height} width={width} />
      </div>
    );
  }

  private mouseDown = (evt: MouseEvent) => {
    this.setState((prevState) => ({
      mouseDown: true,
      startDragOffsetX: evt.clientX - prevState.translatePosX,
      startDragOffsetY: evt.clientY - prevState.translatePosY,
    }));
  };

  private mouseUp = () => {
    this.setState({ mouseDown: false });
  };

  private mouseMove = (evt: MouseEvent) => {
    if (this.state.mouseDown) {
      this.setState((prevState) => ({
        translatePosX: evt.clientX - prevState.startDragOffsetX,
        translatePosY: evt.clientY - prevState.startDragOffsetY,
      }));
    }
  };

  private handleScroll = (evt: Event) => {
    const e = evt as WheelEvent;
    var delta = e.deltaY ? -e.deltaY / 500 : 0;
    if (delta) {
      this.setState((prevState) => ({
        scale: Math.max(0.1, prevState.scale + delta),
      }));
    }
  };

  private handleClick = (evt: MouseEvent) => {
    const { client, state, val } = this.props;
    const { translatePosX, translatePosY, scale } = this.state;
    const { height, width, pieceSize } = this;
    const x = evt.pageX - this.canvas!.offsetLeft;
    const y = evt.pageY - this.canvas!.offsetTop;

    const size = pieceSize * scale;
    const center_x = width / 2 + translatePosX;
    const center_y = height / 2 + translatePosY;

    const q = ((2.0 / 3) * (x - center_x)) / size;
    const r = ((y - center_y) / size - (Math.sqrt(3) / 2) * q) / Math.sqrt(3);

    const cube = axial_to_cube({ q, r });
    const roundedCube = cube_round(cube);
    const { q: rq, r: rr } = cube_to_axial(roundedCube);

    const pieceClicked = val.find(
      (p) => p.position && p.position.x === rq && p.position.y === rr
    );

    if (pieceClicked && state.selectedPiece === undefined) {
      client.selectPiece({ pieceId: pieceClicked.id }, (e) => {
        console.log(e);
      });
    } else if (
      pieceClicked &&
      state.selectedPiece &&
      pieceClicked.id === state.selectedPiece.id
    ) {
      client.selectPiece({ pieceId: pieceClicked.id }, (e) => {
        console.log(e);
      });
    } else if (state.selectedPiece) {
      client.movePiece(
        {
          pieceId: state.selectedPiece.id,
          position: { x: rq, y: rr },
        },
        (e) => {
          console.log(e);
        }
      );
    }
  };

  private drawBoard() {
    const { props, height, width } = this;
    const { val, state } = props;
    const pieces: { [key: string]: Piece } = {};
    val.forEach((p) => {
      pieces[`${p.position!.x}${p.position!.y}`] = p;
    });
    if (this.canvas) {
      // add event listeners to handle screen drag
      this.canvas.addEventListener("mousedown", this.mouseDown);
      this.canvas.addEventListener("mouseup", this.mouseUp);
      this.canvas.addEventListener("mouseover", this.mouseUp);
      this.canvas.addEventListener("mouseout", this.mouseUp);
      this.canvas.addEventListener("mousemove", this.mouseMove);
      this.canvas.addEventListener("DOMMouseScroll", this.handleScroll);
      this.canvas.addEventListener("mousewheel", this.handleScroll);
      this.canvas.addEventListener("click", this.handleClick);

      const ctx = this.canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        Object.values(pieces).forEach((p) => this.drawPiece(ctx, p));
        state.validMoves.forEach((m) => this.drawValidMoves(ctx, m));
      }
    }
  }

  private drawPiece(ctx: CanvasRenderingContext2D, piece: Piece) {
    const { selectedPiece } = this.props.state;
    const { id, position, color, type } = piece;
    const colorStr = color === Color.WHITE ? "#D2B48C" : "#243447";
    const textStr = `${id} ${PieceType[type]} (${position!.x}, ${position!.y})`;
    this.drawHex(ctx, position!, colorStr, textStr);
    if (selectedPiece && piece.id === selectedPiece.id) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#FF0000";
      ctx.stroke();
    }
  }

  private drawValidMoves(
    ctx: CanvasRenderingContext2D,
    position: BoardPosition
  ) {
    const color = "#99ddff";
    this.drawHex(ctx, position, color, `(${position!.x}, ${position!.y})`);
  }

  private drawHex(
    ctx: CanvasRenderingContext2D,
    position: BoardPosition,
    color: string,
    text: string
  ) {
    const { x, y } = position;
    const { height, width, pieceSize } = this;
    const { translatePosX, translatePosY, scale } = this.state;
    const size = pieceSize * scale;
    const center_x = width / 2 + translatePosX;
    const center_y = height / 2 + translatePosY;
    const actual_x = center_x + x * size * 1.5;
    const actual_y =
      center_y + size * ((Math.sqrt(3) / 2) * x + Math.sqrt(3) * y);

    ctx.beginPath();
    ctx.moveTo(actual_x + size * Math.cos(0), actual_y + size * Math.sin(0));
    for (var side = 0; side < 6; side++) {
      ctx.lineTo(
        actual_x + size * Math.cos((side * 2 * Math.PI) / 6),
        actual_y + size * Math.sin((side * 2 * Math.PI) / 6)
      );
    }
    ctx.fillStyle = color;
    ctx.fill();
    ctx.closePath();
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(text, actual_x, actual_y);
  }
}
export default reactToWebComponent(Board, React, ReactDOM);
