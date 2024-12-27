import React, { useState } from 'react';
import WordGuessingGame from './components/WordGuessingGame';
import SinglePlayerGame from './components/SinglePlayerGame';
import './App.css';

function App() {
  const [gameMode, setGameMode] = useState('menu');

  return (
    <div className="App">
      {gameMode === 'menu' && (
        <div className="game-container">
          <div className="game-card">
            <h1 className="game-title">SpellDown</h1>
            <p className="game-tagline">
              Challenge your friends or test your skills against the computer in this exciting word guessing game!
            </p>
            <div className="menu-buttons">
              <button className="menu-button" style={{ backgroundColor: '#4CAF50' }} onClick={() => setGameMode('single')}>
                Single Player
              </button>
              <button className="menu-button" style={{ backgroundColor: '#4CAF50' }} onClick={() => setGameMode('multi')}>
                Multiplayer
              </button>
            </div>
          </div>
        </div>
      )}
      {gameMode === 'single' && <SinglePlayerGame onBack={() => setGameMode('menu')} />}
      {gameMode === 'multi' && <WordGuessingGame onBack={() => setGameMode('menu')} />}
    </div>
  );
}

export default App;
