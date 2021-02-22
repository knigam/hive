import React from "react";
import { RtagClient } from "../.rtag/client";
import { GameStatus, PlayerState, UserData } from "../.rtag/types";
import Board from "../src/components/Board";
import PieceDrawer from "../src/components/PieceDrawer";
import Lobby from "../src/components/Lobby";

const PIECE_DRAWER_HEIGHT = 100;

interface IAppProps {
  state: PlayerState;
  client: RtagClient;
}

interface IAppState {
  height: number;
  width: number;
}

class App extends React.Component<IAppProps, IAppState> {
  state = { height: window.innerHeight, width: window.innerWidth };

  updateDimensions = () => {
    this.setState({ width: window.innerWidth, height: window.innerHeight });
  };

  componentDidMount() {
    window.addEventListener("resize", this.updateDimensions);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.updateDimensions);
  }

  render() {
    const { state, client } = this.props;
    const { height, width } = this.state;

    if (state.status === GameStatus.NOT_STARTED) {
      return <Lobby {...state} client={client}></Lobby>;
    } else {
      return (
        <div className="App">
          <Board
            pieceSize={50}
            // height={height - PIECE_DRAWER_HEIGHT}
            height={Math.min(height * 0.8, height - PIECE_DRAWER_HEIGHT)}
            width={width}
            {...state}
            client={client}
          ></Board>
          <PieceDrawer client={client} {...state}></PieceDrawer>
        </div>
      );
    }
  }
}

export default App;