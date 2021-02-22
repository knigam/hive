// @ts-ignore
import React from "react";
import { RtagClient } from "../../.rtag/client";
import { Color, Piece, PieceId, PieceType } from "../../.rtag/types";

interface IPieceDrawerProps {
  unplayedPieces: Piece[];
  client: RtagClient;
}

class PieceDrawer extends React.Component<IPieceDrawerProps> {
  render() {
    const { unplayedPieces } = this.props;
    return (
      <div>
        {unplayedPieces.map((p) => (
          <button
            type="button"
            onClick={() => this.unplayedPieceClicked(p.id)}
          >{`${Color[p.color]} - ${PieceType[p.type]}`}</button>
        ))}
      </div>
    );
  }

  private unplayedPieceClicked(id: PieceId) {
    this.props.client.selectPiece({ pieceId: id }, (e) => console.log(e));
  }
}

export default PieceDrawer;
