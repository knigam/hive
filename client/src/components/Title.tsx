import React, { useState } from 'react'
import { Link } from 'react-router-dom'

function Title() {
  const [gameId, setGameId] = useState<string>('')
  return (
    <div>
      <Link to="/game">
        <button>New Game</button>
      </Link>
      <br />
      <input
        type="text"
        id="gameIdInput"
        value={gameId}
        onChange={(e) => setGameId(e.target.value.toLowerCase())}
      />
      <Link to={`/game/${gameId}`}>
        <button>Join Game</button>
      </Link>
    </div>
  )
}

export default Title
