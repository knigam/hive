// @ts-ignore
import reactToWebComponent from "react-to-webcomponent";
import React from "react";
import ReactDOM from "react-dom";
import { RtagClient } from "../.rtag/client";
import App from "../src/App";
import { PlayerState } from "../.rtag/types";

interface IPluginProps {
  state: PlayerState;
  client: RtagClient;
}

class PlayerStatePlugin extends React.Component<IPluginProps> {
  render() {
    return <App {...this.props}></App>;
  }
}

export default reactToWebComponent(PlayerStatePlugin, React, ReactDOM);
