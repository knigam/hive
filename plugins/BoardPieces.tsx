// @ts-ignore
import reactToWebComponent from "react-to-webcomponent";
import React from "react";
import ReactDOM from "react-dom";
import { Color, Piece, PieceType } from "../.rtag/types";

const HEIGHT = 500;
const WIDTH = 500;
const PIECE_SIZE = 50;

export interface IBoardProps {
  val: Piece[];
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
    const { translatePosX, translatePosY } = this.state;
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

  private drawBoard() {
    const { height, width } = this;
    const { scale } = this.state;
    const pieces: { [key: string]: Piece } = {};
      this.props.val.forEach(p => {
        pieces[`${p.position!.x}${p.position!.y}`] = p;
      })
    if (this.canvas) {
      // add event listeners to handle screen drag
      this.canvas.addEventListener("mousedown", this.mouseDown);
      this.canvas.addEventListener("mouseup", this.mouseUp);
      this.canvas.addEventListener("mouseover", this.mouseUp);
      this.canvas.addEventListener("mouseout", this.mouseUp);
      this.canvas.addEventListener("mousemove", this.mouseMove);
      this.canvas.addEventListener("DOMMouseScroll", this.handleScroll);
      this.canvas.addEventListener("mousewheel", this.handleScroll);

      const ctx = this.canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        Object.values(pieces).forEach((p) => this.drawPiece(ctx, p));
      }
    }
  }

  private drawPiece(ctx: CanvasRenderingContext2D, piece: Piece) {
    const { height, width, pieceSize } = this;
    const { translatePosX, translatePosY, scale } = this.state;
    const size = pieceSize * scale;
    const { position, color, type } = piece;
    const { x, y } = position!;
    const center_x = width / 2 + translatePosX;
    const center_y = height / 2 + translatePosY;
    const y_offset = (x & 1) === 0 ? 0 : 0.5;
    const actual_x = center_x + x * size * 1.5;
    const actual_y = center_y + (y + y_offset) * size * Math.sqrt(3);

    ctx.beginPath();
    ctx.moveTo(actual_x + size * Math.cos(0), actual_y + size * Math.sin(0));
    for (var side = 0; side < 7; side++) {
      ctx.lineTo(
        actual_x + size * Math.cos((side * 2 * Math.PI) / 6),
        actual_y + size * Math.sin((side * 2 * Math.PI) / 6)
      );
    }
    ctx.fillStyle = color === Color.WHITE ? "#D2B48C" : "#243447";
    ctx.fill();
    ctx.closePath();
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(`${PieceType[type]} - ${x},${y}`, actual_x, actual_y);
  }
}
export default reactToWebComponent(Board, React, ReactDOM);
