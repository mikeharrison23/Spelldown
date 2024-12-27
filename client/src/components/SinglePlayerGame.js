import React, { useState } from 'react';
import './WordGuessingGame.css';

const API_BASE_URL = 'http://localhost:3001';

const SinglePlayerGame = ({ onBack }) => {
  const [gamePhase, setGamePhase] = useState('setup');
  const [playerWord, setPlayerWord] = useState('');
  const [gameId, setGameId] = useState(null);
  const [currentGuess, setCurrentGuess] = useState('');
  const [playerGuesses, setPlayerGuesses] = useState([]);
  const [computerGuesses, setComputerGuesses] = useState([]);
  const [message, setMessage] = useState('Enter your 5-letter word to start the game.');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [letterStates, setLetterStates] = useState({});
  const [computerWord, setComputerWord] = useState(null);

  const startGame = async () => {
    if (!playerWord || playerWord.length !== 5) {
      setMessage('Please enter a 5-letter word');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/singleplayer/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: playerWord })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.valid) {
        setMessage('Please enter a valid word from the dictionary.');
        return;
      }

      // Start the game
      const startResponse = await fetch(`${API_BASE_URL}/api/singleplayer/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerWord })
      });

      if (!startResponse.ok) {
        throw new Error(`HTTP error! status: ${startResponse.status}`);
      }

      const startData = await startResponse.json();

      setGameId(startData.gameId);
      setGamePhase('playing');
      setCurrentTurn('player');
      setMessage('Game started! Make your guess.');
    } catch (error) {
      console.error('Error starting game:', error);
      setMessage('Error starting game. Please try again.');
    }
  };

  const handleGuessSubmit = async () => {
    if (!currentGuess || currentGuess.length !== 5) {
      setMessage('Please enter a 5-letter word');
      return;
    }

    try {
      // First validate the word
      const validateResponse = await fetch(`${API_BASE_URL}/api/singleplayer/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: currentGuess })
      });

      if (!validateResponse.ok) {
        throw new Error(`HTTP error! status: ${validateResponse.status}`);
      }

      const validateData = await validateResponse.json();

      if (!validateData.valid) {
        setMessage('Invalid word! Please use a word from our dictionary.');
        return;
      }

      // Submit the guess
      const response = await fetch(`${API_BASE_URL}/api/singleplayer/player-guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, guess: currentGuess })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Update game state
      setPlayerGuesses([...playerGuesses, data.playerGuessResult]);
      if (data.computerGuessResult) {
        setComputerGuesses([...computerGuesses, data.computerGuessResult]);
      }
      setCurrentGuess('');
      setCurrentTurn(data.currentTurn);

      if (data.gameOver) {
        setGameOver(true);
        setWinner(data.winner);
        setComputerWord(data.computerWord);
        setMessage(data.winner === 'player' 
          ? 'Congratulations! You won!' 
          : `Game Over! The computer won. The word was ${data.computerWord}`
        );
      } else {
        setMessage(data.currentTurn === 'player' 
          ? 'Your turn! Make a guess.' 
          : "Computer is thinking..."
        );
      }
    } catch (error) {
      console.error('Error submitting guess:', error);
      setMessage('Error submitting guess. Please try again.');
    }
  };

  const handleLetterClick = (guessIndex, letterIndex, event) => {
    event.preventDefault();
    const letterKey = `${guessIndex}-${letterIndex}`;
    
    setLetterStates(prevStates => {
      const currentState = prevStates[letterKey] || 'none';
      let newState;
      
      if (event.type === 'dblclick') {
        newState = currentState === 'crossed' ? 'none' : 'crossed';
      } else {
        newState = currentState === 'green' ? 'none' : 'green';
      }
      
      return {
        ...prevStates,
        [letterKey]: newState
      };
    });
  };

  const getLetterClass = (guessIndex, letterIndex) => {
    const state = letterStates[`${guessIndex}-${letterIndex}`];
    if (state === 'green') return 'letter-box highlighted-green';
    if (state === 'crossed') return 'letter-box crossed-out';
    return 'letter-box';
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      if (gamePhase === 'setup') {
        startGame();
      } else if (!gameOver && currentTurn === 'player') {
        handleGuessSubmit();
      }
    }
  };

  const startNewGame = () => {
    setGamePhase('setup');
    setPlayerWord('');
    setGameId(null);
    setCurrentGuess('');
    setPlayerGuesses([]);
    setComputerGuesses([]);
    setMessage('Enter your 5-letter word to start the game.');
    setGameOver(false);
    setWinner(null);
    setCurrentTurn(null);
    setLetterStates({});
    setComputerWord(null);
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <button onClick={onBack} className="back-button">Back to Menu</button>
        <h1>SpellDown</h1>
        <div style={{ width: '80px' }}></div>
      </div>

      <div className="message-alert">
        {message}
      </div>

      {gamePhase === 'setup' ? (
        <div className="guess-input-container">
          <input
            type="text"
            maxLength="5"
            value={playerWord}
            onChange={(e) => setPlayerWord(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            placeholder="Enter your 5-letter word"
            className="guess-input"
          />
          <button
            onClick={startGame}
            className="guess-button"
          >
            Start Game
          </button>
        </div>
      ) : (
        <>
          <div className="game-boards">
            <div className="player-board">
              <h3>Your Guesses</h3>
              <div className="guesses-container">
                {playerGuesses.map((guess, guessIndex) => (
                  <div key={guessIndex} className="guess-row">
                    <div className="guess-word">
                      {guess.word.split('').map((letter, letterIndex) => (
                        <span
                          key={letterIndex}
                          className={
                            guess.correctPositions[letterIndex]
                              ? 'letter-box correct-position'
                              : guess.correctLetters.includes(letter)
                              ? 'letter-box correct-letter'
                              : 'letter-box'
                          }
                        >
                          {letter}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="computer-board">
              <h3>Computer's Guesses</h3>
              <div className="guesses-container">
                {computerGuesses.map((guess, guessIndex) => (
                  <div key={guessIndex} className="guess-row">
                    <div className="guess-word">
                      {guess.word.split('').map((letter, letterIndex) => (
                        <span
                          key={letterIndex}
                          className={
                            guess.correctPositions[letterIndex]
                              ? 'letter-box correct-position'
                              : guess.correctLetters.includes(letter)
                              ? 'letter-box correct-letter'
                              : 'letter-box'
                          }
                        >
                          {letter}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {currentTurn === 'player' && !gameOver && (
            <div className="guess-input-container">
              <input
                type="text"
                maxLength="5"
                value={currentGuess}
                onChange={(e) => setCurrentGuess(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="Enter your guess"
                className="guess-input"
              />
              <button
                onClick={handleGuessSubmit}
                className="guess-button"
              >
                Guess
              </button>
            </div>
          )}
        </>
      )}

      {gameOver && (
        <div className="play-again-section">
          <button onClick={startNewGame} className="play-again-button">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};

export default SinglePlayerGame;
