import React from 'react'
import { Route, BrowserRouter as Router, Switch } from 'react-router-dom'
import { useWindowDimensions } from './helpers/window'
import Title from './components/Title'
import Game from './components/Game'
import './App.scss'

function App() {
  const { height, width } = useWindowDimensions()
  return (
    <div className="HiveApp">
      <Router>
        <div>
          <Switch>
            <Route exact path="/" component={() => <Title />} />
            <Route
              path="/game"
              component={() => <Game height={height} width={width} />}
            />
          </Switch>
        </div>
      </Router>
    </div>
  )
}

export default App
