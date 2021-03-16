import React from "react";
import {
  BoardPosition,
  Color,
  Move,
  Piece,
  PieceType,
} from "../../.rtag/types";
import { RtagClient } from "../../.rtag/client";
import { maxBy, startCase } from "lodash-es";
import {
  axialToBoardPosition,
  cubeToAxial,
  cubeRound,
  axialToCube,
} from "../helpers/hex";
import { getAllImagePaths, getImagePath } from "../helpers/images";

const CANVAS_BACKGROUND_COLOR = "#020A10";
const PLAYER_WHITE_BACKGROUND_COLOR = "rgb(219,225,201)";
const PLAYER_WHITE_STACK_BACKGROUND_COLOR = "rgb(219,225,201,0.5)";
const PLAYER_BLACK_BACKGROUND_COLOR = "rgb(75,124,61)";
const PLAYER_BLACK_STACK_BACKGROUND_COLOR = "rgb(75,124,61,0.5)";
const SELECTED_PIECE_BORDER_COLOR = "#FF0000";
const VALID_MOVE_BORDER = "#2F80ED";
const VALID_MOVE_FILL_COLOR = "rgb(47,128,237,0.2)";
const VALID_MOVE_ON_PIECE_FILL_COLOR = "rgb(0,0,0,0.6)";
const LAST_MOVE_BORDER = "rgba(245,73,139,1)";
const LAST_MOVE_FILL_COLOR = "rgba(245,73,139,0.4)";
const PIECE_BORDER_WIDTH = 1.5;

interface IBoardProps {
  height: number;
  width: number;
  pieceSize: number;
  selectedPiece: Piece | undefined;
  validMoves: BoardPosition[];
  boardPieces: Piece[];
  lastMove: Move | undefined;
  client: RtagClient;
}

interface IBoardState {
  mouseDown: boolean;
  startDragOffsetX: number;
  startDragOffsetY: number;
  translatePosX: number;
  translatePosY: number;
  pinchToZoomStartDistance: number;
  scale: number;
}

class Board extends React.Component<IBoardProps, IBoardState> {
  state = {
    mouseDown: false,
    startDragOffsetX: 0,
    startDragOffsetY: 0,
    translatePosX: 0,
    translatePosY: 0,
    pinchToZoomStartDistance: 0,
    scale: 1,
  };
  private canvas?: HTMLCanvasElement;
  private setCanvasRef: (element: HTMLCanvasElement) => void;
  private images: { [src: string]: HTMLImageElement } = {};

  constructor(props: IBoardProps) {
    super(props);
    this.setCanvasRef = (element) => {
      this.canvas = element;
    };
    const allImagePaths = getAllImagePaths();
    allImagePaths.forEach((path) => {
      const image = new Image();
      image.src = path;
      image.onload = () => {
        this.images[path] = image;
        this.drawBoard();
      };
    });
  }

  componentDidMount() {
    this.drawBoard();
  }

  componentDidUpdate() {
    this.drawBoard();
  }

  render() {
    const { height, width, selectedPiece, boardPieces } = this.props;
    return (
      <div className="Board">
        <canvas ref={this.setCanvasRef} height={height} width={width} />
        <div className="overlay">
          {selectedPiece &&
            selectedPiece.stack !== undefined &&
            selectedPiece.stack > 0 &&
            boardPieces
              .filter(
                (p) =>
                  p.position!.x == selectedPiece.position!.x &&
                  p.position!.y == selectedPiece.position!.y
              )
              .sort((a, b) => b.stack! - a.stack!)
              .map((p) => (
                <ul>{`${startCase(Color[p.color].toLowerCase())} - ${startCase(
                  PieceType[p.type].toLowerCase()
                )}`}</ul>
              ))}
        </div>
      </div>
    );
  }

  private touchStart = (evt: TouchEvent) => {
    if (evt.touches.length === 1) {
      const touch = evt.touches[0];
      this.setState((prevState) => ({
        mouseDown: true,
        startDragOffsetX: touch.clientX - prevState.translatePosX,
        startDragOffsetY: touch.clientY - prevState.translatePosY,
      }));
    } else if (evt.touches.length === 2) {
      // multi-touch to zoom
      const [touch1, touch2] = evt.touches;
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      this.setState({ mouseDown: true, pinchToZoomStartDistance: distance });
    }
  };

  private touchEnd = () => {
    this.setState({ mouseDown: false });
  };

  private touchMove = (evt: TouchEvent) => {
    if (this.state.mouseDown) {
      if (evt.touches.length === 1) {
        const touch = evt.touches[0];
        this.setState((prevState) => ({
          translatePosX: touch.clientX - prevState.startDragOffsetX,
          translatePosY: touch.clientY - prevState.startDragOffsetY,
        }));
      } else if (evt.touches.length === 2) {
        // multi-touch to zoom
        const [touch1, touch2] = evt.touches;
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        this.setState((prevState) => ({
          scale: Math.max(
            0.1,
            prevState.scale +
              0.025 * (distance > prevState.pinchToZoomStartDistance ? 1 : -1)
          ),
        }));
      }
    }
  };

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
    const { boardPieces, validMoves, selectedPiece, lastMove } = this.props;
    const pieces: { [key: string]: Piece } = {};
    boardPieces.forEach((p) => {
      if (
        !pieces[this.getBoardPosKey(p.position!)] ||
        pieces[this.getBoardPosKey(p.position!)].stack! < p.stack!
      ) {
        pieces[this.getBoardPosKey(p.position!)] = p;
      }
    });
    if (this.canvas) {
      // add event listeners to handle screen drag
      this.canvas.addEventListener("touchstart", this.touchStart);
      this.canvas.addEventListener("touchend", this.touchEnd);
      this.canvas.addEventListener("touchmove", this.touchMove);
      this.canvas.addEventListener("mousedown", this.mouseDown);
      this.canvas.addEventListener("mouseup", this.mouseUp);
      this.canvas.addEventListener("mouseover", this.mouseUp);
      this.canvas.addEventListener("mouseout", this.mouseUp);
      this.canvas.addEventListener("mousemove", this.mouseMove);
      this.canvas.addEventListener("DOMMouseScroll", this.handleScroll);
      this.canvas.addEventListener("mousewheel", this.handleScroll);
      this.canvas.addEventListener("click", this.handleClick);
      document.body.addEventListener(
        "touchmove",
        (e) => {
          if (this.state.mouseDown) {
            e.preventDefault();
          }
        },
        { passive: false }
      );

      const ctx = this.canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = CANVAS_BACKGROUND_COLOR;
        ctx.fillRect(0, 0, width, height);
        Object.values(pieces).forEach((p) => this.drawPiece(ctx, p));
        validMoves.forEach((m) =>
          this.drawValidMove(
            ctx,
            m,
            pieces[this.getBoardPosKey(m)] !== undefined
          )
        );
      }
    }
  }

  private getBoardPosKey(position: BoardPosition): string {
    return `${position.x}${position.y}`;
  }

  private drawPiece(ctx: CanvasRenderingContext2D, piece: Piece) {
    const { selectedPiece, lastMove } = this.props;
    const { id, position, color, type } = piece;
    const isInStack = piece.stack! > 0;
    const colorStr =
      color === Color.WHITE
        ? isInStack
          ? PLAYER_WHITE_STACK_BACKGROUND_COLOR
          : PLAYER_WHITE_BACKGROUND_COLOR
        : isInStack
        ? PLAYER_BLACK_STACK_BACKGROUND_COLOR
        : PLAYER_BLACK_BACKGROUND_COLOR;

    this.drawHex(ctx, position!, colorStr, getImagePath(type, color));
    if (selectedPiece && id === selectedPiece.id) {
      ctx.lineWidth = PIECE_BORDER_WIDTH;
      ctx.strokeStyle = SELECTED_PIECE_BORDER_COLOR;
      ctx.stroke();
    } else if (!selectedPiece && lastMove && lastMove.piece.id === id) {
      ctx.lineWidth = PIECE_BORDER_WIDTH;
      ctx.strokeStyle = LAST_MOVE_BORDER;
      ctx.stroke();

      if (lastMove.movedFrom) {
        this.drawHex(ctx, lastMove.movedFrom, LAST_MOVE_FILL_COLOR, "");
        ctx.lineWidth = PIECE_BORDER_WIDTH;
        ctx.strokeStyle = LAST_MOVE_BORDER;
        ctx.stroke();
      }
    }
  }

  private drawValidMove(
    ctx: CanvasRenderingContext2D,
    position: BoardPosition,
    isOnPiece: boolean
  ) {
    const color = isOnPiece
      ? VALID_MOVE_ON_PIECE_FILL_COLOR
      : VALID_MOVE_FILL_COLOR;
    this.drawHex(ctx, position, color, "");
    ctx.lineWidth = PIECE_BORDER_WIDTH;
    ctx.strokeStyle = VALID_MOVE_BORDER;
    ctx.stroke();
  }

  private drawHex(
    ctx: CanvasRenderingContext2D,
    position: BoardPosition,
    color: string,
    imagePath: string
  ) {
    const { x, y } = position;
    const { height, width, pieceSize } = this.props;
    const { translatePosX, translatePosY, scale } = this.state;
    const sizeWithBuffer = (pieceSize + pieceSize / 50) * scale;
    const size = pieceSize * scale;
    const center_x = width / 2 + translatePosX;
    const center_y = height / 2 + translatePosY;
    const actual_x = center_x + x * sizeWithBuffer * 1.5;
    const actual_y =
      center_y + sizeWithBuffer * ((Math.sqrt(3) / 2) * x + Math.sqrt(3) * y);

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

    const image = this.images[imagePath];
    if (image) {
      ctx.drawImage(
        image,
        actual_x - (image.width * 1.5 * scale) / 2, // multiplying by 1.5 to make default icon size bigger since they were created for a piece size of 50
        actual_y - (image.height * 1.5 * scale) / 2,
        image.width * 1.5 * scale,
        image.height * 1.5 * scale
      );
    }
  }
}

export default Board;
