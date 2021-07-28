import { isEqual } from "lodash-es";
import React from "react";
import { RtagClient } from "../../.rtag/client";
import { Color, Piece, PieceType, PlayerName } from "../../.rtag/types";

const DEFAULT_PIECES = [
  PieceType.QUEEN,
  PieceType.ANT,
  PieceType.ANT,
  PieceType.ANT,
  PieceType.GRASSHOPPER,
  PieceType.GRASSHOPPER,
  PieceType.GRASSHOPPER,
  PieceType.BEETLE,
  PieceType.BEETLE,
  PieceType.SPIDER,
  PieceType.SPIDER,
];

interface ILobbyProps {
  isCreator: boolean;
  creatorColor: Color | undefined;
  tournament: boolean;
  unplayedPieces: Piece[];
  players: PlayerName[];
  client: RtagClient;
}

interface ILobbyState {
  edited: boolean;
  tournament: boolean;
  creatorColor: Color | undefined;
  isLadybugSelected: boolean;
  isMosquitoSelected: boolean;
  isPillbugSelected: boolean;
}

class Lobby extends React.Component<ILobbyProps, ILobbyState> {
  state = this.getDefaultState(this.props);
  private url = document.baseURI;

  componentDidUpdate(oldProps: ILobbyProps) {
    if (!isEqual(oldProps, this.props)) {
      this.setState(this.getDefaultState(this.props));
    }
  }

  render() {
    const { isCreator, players } = this.props;
    const { edited, tournament, isLadybugSelected, isMosquitoSelected, isPillbugSelected, creatorColor } = this.state;

    return (
      <div className="Lobby">
        <h3>Game Code: {this.getSessionCode()}</h3>
        <span>
          <input className="hive-input-btn-input" type="url" value={this.url} id="urlText" readOnly />
          <button className="hive-btn hive-input-btn" onClick={this.copyUrl}>
            Copy
          </button>
        </span>
        <br />
        {players.length === 0 &&
          (isCreator ? (
            <h5>You must save settings before game can start</h5>
          ) : (
            <h5>Waiting on game creator to finish setting up the game</h5>
          ))}
        {players.length === 1 &&
          (isCreator ? (
            <h5>Waiting on another player to join and start the game</h5>
          ) : (
            <h5>Press "Play!" to start the game</h5>
          ))}
        <div className="GameSettings">
          <label>
            Game creator color
            <select
              disabled={!isCreator}
              value={creatorColor === undefined ? "undefined" : Color[creatorColor]}
              onChange={this.creatorColorChanged}
            >
              <option value="undefined">Random</option>
              <option value={Color[Color.WHITE]}>{Color[Color.WHITE]}</option>
              <option value={Color[Color.BLACK]}>{Color[Color.BLACK]}</option>
            </select>
          </label>
          <br />
          <label>
            <input
              disabled={!isCreator}
              type="checkbox"
              id="tournamentCheckbox"
              checked={tournament}
              onChange={(event) => this.checkboxChanged(event, "tournament")}
            />
            Tournament rules
          </label>
          <br />
          <label>
            <input
              disabled={!isCreator}
              type="checkbox"
              id="ladybugCheckbox"
              checked={isLadybugSelected}
              onChange={(event) => this.checkboxChanged(event, "isLadybugSelected")}
            />
            Ladybug
          </label>
          <br />
          <label>
            <input
              disabled={!isCreator}
              type="checkbox"
              id="mosquitoCheckbox"
              checked={isMosquitoSelected}
              onChange={(event) => this.checkboxChanged(event, "isMosquitoSelected")}
            />
            Mosquito
          </label>
          <br />
          <label>
            <input
              disabled={!isCreator}
              type="checkbox"
              id="pillbugCheckbox"
              checked={isPillbugSelected}
              onChange={(event) => this.checkboxChanged(event, "isPillbugSelected")}
            />
            Pillbug
          </label>
        </div>
        <br />
        {isCreator && (
          <button className="hive-btn" onClick={this.saveSettings} disabled={players.length !== 0 && !edited}>
            Save
          </button>
        )}
        {isCreator && edited && (
          <button className="hive-btn" onClick={this.resetSettings}>
            Reset
          </button>
        )}
        {!isCreator && (
          <button className="hive-btn" onClick={this.playGame} disabled={players.length === 0}>
            Play!
          </button>
        )}
      </div>
    );
  }

  private getDefaultState(props: ILobbyProps): ILobbyState {
    return {
      edited: false,
      tournament: this.props.tournament,
      creatorColor: this.props.creatorColor,
      isLadybugSelected: this.isPieceSelected(PieceType.LADYBUG),
      isMosquitoSelected: this.isPieceSelected(PieceType.MOSQUITO),
      isPillbugSelected: this.isPieceSelected(PieceType.PILLBUG),
    };
  }

  private saveSettings = () => {
    const { client } = this.props;
    const { creatorColor, tournament, isLadybugSelected, isMosquitoSelected, isPillbugSelected } = this.state;
    const pieces = [...DEFAULT_PIECES];
    const extraPieces = [PieceType.LADYBUG, PieceType.MOSQUITO, PieceType.PILLBUG];
    [isLadybugSelected, isMosquitoSelected, isPillbugSelected].forEach((i, idx) => {
      if (i) {
        pieces.push(extraPieces[idx]);
      }
    });

    client
      .setupGame({
        blackPieces: pieces,
        whitePieces: pieces,
        creatorColor,
        tournament,
      })
      .then((result) => {
        if (result !== undefined) {
          console.log(result);
        }
      });
  };

  private resetSettings = () => {
    this.setState(this.getDefaultState(this.props));
  };

  private playGame = () => {
    this.props.client.playGame({}).then((result) => {
      if (result !== undefined) {
        console.log(result);
      }
    });
  };

  private creatorColorChanged = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const val = event.target.value;
    const color = val === Color[Color.WHITE] ? Color.WHITE : val === Color[Color.BLACK] ? Color.BLACK : undefined;
    this.setState({ creatorColor: color, edited: true });
  };

  private checkboxChanged(
    event: React.ChangeEvent<HTMLInputElement>,
    key: "tournament" | "isLadybugSelected" | "isMosquitoSelected" | "isPillbugSelected"
  ) {
    if (key === "tournament") {
      this.setState({ [key]: event.target.checked, edited: true });
    } else if (key === "isLadybugSelected") {
      this.setState({ [key]: event.target.checked, edited: true });
    } else if (key === "isMosquitoSelected") {
      this.setState({ [key]: event.target.checked, edited: true });
    } else if (key === "isPillbugSelected") {
      this.setState({ [key]: event.target.checked, edited: true });
    }
  }

  private isPieceSelected(type: PieceType): boolean {
    return this.props.unplayedPieces.some((p) => p.type === type);
  }

  private getSessionCode(): string {
    return this.url.split("game/")[1].toUpperCase();
  }

  private copyUrl(): void {
    const copyText = document.getElementById("urlText") as HTMLInputElement;
    if (copyText) {
      copyText.select();
      copyText.setSelectionRange(0, 99999); /* For mobile devices */
      document.execCommand("copy");
    }
  }
}

export default Lobby;
