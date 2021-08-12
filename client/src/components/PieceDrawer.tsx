// @ts-ignore
import { first, startCase } from "lodash-es";
import React from "react";
import { RtagConnection } from "../../.rtag/client";
import { Color, GameStatus, Piece, PieceId } from "../../.rtag/types";
import { getImagePath } from "../helpers/images";

interface IPieceDrawerProps {
  color: Color;
  currentPlayerTurn: Color;
  height: number;
  unplayedPieces: Piece[];
  selectedPiece: Piece | undefined;
  status: GameStatus;
  client: RtagConnection;
}

interface IPieceDrawerState {
  currentColor: Color;
}

class PieceDrawer extends React.Component<IPieceDrawerProps, IPieceDrawerState> {
  firstColor = this.props.color || Color.WHITE;
  state = { currentColor: this.firstColor };

  render() {
    const { color, height, selectedPiece, unplayedPieces } = this.props;
    const otherColor = Color.WHITE === this.firstColor ? Color.BLACK : Color.WHITE;
    const { currentColor } = this.state;

    return (
      <div className="PieceDrawer" style={{ height: `${height}px` }}>
        <div className="tabs">
          <button
            className={`tablink${currentColor === this.firstColor ? " active" : ""}`}
            onClick={() => this.selectDrawerColor(this.firstColor)}
          >
            {`${color === undefined ? "White" : "Your"} Pieces`}
          </button>
          <button
            className={`tablink${currentColor === otherColor ? " active" : ""}`}
            onClick={() => this.selectDrawerColor(otherColor)}
          >
            {`${color === undefined ? "Black" : "Opponent's"} Pieces`}
          </button>
          <div className="status">{this.getStatusText()}</div>
        </div>
        <div className="pieces">
          {unplayedPieces
            .filter((p) => p.color === currentColor)
            .map((p) => (
              <button
                key={p.id}
                className={`${Color[p.color].toLowerCase()}-piece-btn${
                  selectedPiece && selectedPiece.id === p.id ? " active" : ""
                }`}
                type="button"
                onClick={() => this.unplayedPieceClicked(p.id)}
              >
                <img src={getImagePath(p.type, p.color)} />
              </button>
            ))}
        </div>
      </div>
    );
  }

  private selectDrawerColor(color: Color) {
    this.setState({ currentColor: color });
  }

  private unplayedPieceClicked(id: PieceId) {
    this.props.client.selectPiece({ pieceId: id }, (e) => console.log(e));
  }

  private getStatusText(): string {
    const { currentPlayerTurn, color, status } = this.props;
    if (status !== GameStatus.IN_PROGRESS) {
      return startCase(GameStatus[status].toLowerCase());
    } else if (color === undefined) {
      return `${startCase(Color[currentPlayerTurn].toLowerCase())}'s Turn`;
    } else {
      return `${currentPlayerTurn === color ? "Your" : "Opponent's"} Turn`;
    }
  }
}

export default PieceDrawer;
