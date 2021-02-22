import React from "react";
import { BoardPosition, Color, Piece, PieceType } from "../../.rtag/types";
import { RtagClient } from "../../.rtag/client";
import { maxBy } from "lodash-es";
import {
  axialToBoardPosition,
  cubeToAxial,
  cubeRound,
  axialToCube,
} from "../helpers/hex";

interface IBoardProps {
  height: number;
  width: number;
  pieceSize: number;
  selectedPiece: Piece | undefined;
  validMoves: BoardPosition[];
  boardPieces: Piece[];
  client: RtagClient;
}

interface IBoardState {
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

  constructor(props: IBoardProps) {
    super(props);
    this.setCanvasRef = (element) => {
      this.canvas = element;
    };
  }

  componentDidMount() {
    this.drawBoard();
  }

  componentDidUpdate() {
    this.drawBoard();
  }

  render() {
    const { height, width } = this.props;
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
    const {
      client,
      boardPieces,
      selectedPiece,
      validMoves,
      height,
      width,
      pieceSize,
    } = this.props;
    const { translatePosX, translatePosY, scale } = this.state;
    const x = evt.pageX - this.canvas!.offsetLeft;
    const y = evt.pageY - this.canvas!.offsetTop;

    const size = pieceSize * scale;
    const center_x = width / 2 + translatePosX;
    const center_y = height / 2 + translatePosY;

    const q = ((2.0 / 3) * (x - center_x)) / size;
    const r = ((y - center_y) / size - (Math.sqrt(3) / 2) * q) / Math.sqrt(3);

    const clickedPosition = axialToBoardPosition(
      cubeToAxial(cubeRound(axialToCube({ q, r })))
    );

    if (
      // If a piece is already selected, and the space that was selected is a valid move: move the piece
      selectedPiece &&
      validMoves.find(
        (m) => m.x === clickedPosition.x && m.y === clickedPosition.y
      )
    ) {
      client.movePiece(
        {
          pieceId: selectedPiece.id,
          position: clickedPosition,
        },
        (e) => {
          console.log(e);
        }
      );
    } else {
      const pieceClicked = maxBy(
        boardPieces.filter(
          (p) =>
            p.position &&
            p.position.x === clickedPosition.x &&
            p.position.y === clickedPosition.y
        ),
        (p) => p.stack
      );
      if (pieceClicked) {
        // If the selected space is a piece on the board: select that piece
        client.selectPiece({ pieceId: pieceClicked.id }, (e) => {
          console.log(e);
        });
      } else {
        // Otherwise: select "undefined" to unselect any currently selected piece
        client.selectPiece({ pieceId: undefined }, (e) => {
          console.log(e);
        });
      }
    }
  };

  private drawBoard() {
    const { height, width } = this.props;
    const { boardPieces, validMoves } = this.props;
    const pieces: { [key: string]: Piece } = {};
    boardPieces.forEach((p) => {
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
        validMoves.forEach((m) => this.drawValidMoves(ctx, m));
      }
    }
  }

  private drawPiece(ctx: CanvasRenderingContext2D, piece: Piece) {
    const { selectedPiece } = this.props;
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
    const { height, width, pieceSize } = this.props;
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

export default Board;
