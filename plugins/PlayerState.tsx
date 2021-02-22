// @ts-ignore
import reactToWebComponent from "react-to-webcomponent";
import React from "react";
import ReactDOM from "react-dom";
import { RtagClient } from "../.rtag/client";
import { GameStatus, PlayerState, UserData } from "../.rtag/types";
import Board from "../src/components/Board";
import PieceDrawer from "../src/components/PieceDrawer";
import Lobby from "../src/components/Lobby";

interface IProps {
  state: PlayerState;
  client: RtagClient;
}

class App extends React.Component<IProps> {
  render() {
    const { state, client } = this.props;
    if (state.status === GameStatus.NOT_STARTED) {
      return <Lobby {...state} client={client}></Lobby>;
    } else {
      return (
        <div>
          <Board {...state} client={client}></Board>
          <PieceDrawer client={client} {...state}></PieceDrawer>
        </div>
      );
    }
  }
}

export default reactToWebComponent(App, React, ReactDOM);
