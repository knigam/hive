import React, { useState } from "react";
import { Link } from "react-router-dom";

function Title() {
  const [gameId, setGameId] = useState<string>("");
  return (
    <div className="Title background">
      <div className="inputs">
        <Link to="/game">
          <button id="newGameBtn" className="hive-btn">
            New Game
          </button>
        </Link>
        <br />
        <input
          type="text"
          id="gameIdInput"
          className="hive-input-btn-input"
          value={gameId}
          onChange={(e) => setGameId(e.target.value.toLowerCase())}
        />
        <Link to={`/game/${gameId}`}>
          <button id="joinGameBtn" className="hive-btn hive-input-btn">
            Join Game
          </button>
        </Link>
      </div>
    </div>
  );
}

export default Title;
