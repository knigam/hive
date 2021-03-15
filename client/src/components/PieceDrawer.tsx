// @ts-ignore
import { startCase } from 'lodash-es'
import React from 'react'
import { RtagClient } from '../../.rtag/client'
import { Color, GameStatus, Piece, PieceId, PieceType } from '../../.rtag/types'
import Game from './Game'

interface IPieceDrawerProps {
  color: Color
  currentPlayerTurn: Color
  height: number;
  unplayedPieces: Piece[]
  selectedPiece: Piece | undefined
  status: GameStatus
  client: RtagClient
}

interface IPieceDrawerState {
  currentColor: Color
}

class PieceDrawer extends React.Component<
  IPieceDrawerProps,
  IPieceDrawerState
> {
  state = { currentColor: this.props.color }

  render() {
    const {
      color,
      height,
      selectedPiece,
      unplayedPieces,
    } = this.props
    const otherColor = Color.WHITE === color ? Color.BLACK : Color.WHITE
    const { currentColor } = this.state

    return (
      <div className="PieceDrawer" style={{ height: `${height}px` }}>
        <div className="tabs">
          <button
            className={`tablink${currentColor === color ? ' active' : ''}`}
            onClick={() => this.selectDrawerColor(color)}
          >
            Your Pieces
          </button>
          <button
            className={`tablink${currentColor === otherColor ? ' active' : ''}`}
            onClick={() => this.selectDrawerColor(otherColor)}
          >
            Opponent's Pieces
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
                  selectedPiece && selectedPiece.id === p.id ? ' active' : ''
                }`}
                type="button"
                onClick={() => this.unplayedPieceClicked(p.id)}
              >
                {startCase(PieceType[p.type].toLowerCase())}
              </button>
            ))}
        </div>
      </div>
    )
  }

  private selectDrawerColor(color: Color) {
    this.setState({ currentColor: color })
  }

  private unplayedPieceClicked(id: PieceId) {
    this.props.client.selectPiece({ pieceId: id }, (e) => console.log(e))
  }

  private getStatusText(): string {
    const { currentPlayerTurn, color, status } = this.props
    if (status !== GameStatus.IN_PROGRESS) {
      return startCase(GameStatus[status].toLowerCase())
    } else {
      return `${currentPlayerTurn === color ? 'Your' : "Opponent's"} Turn`
    }
  }
}

export default PieceDrawer
