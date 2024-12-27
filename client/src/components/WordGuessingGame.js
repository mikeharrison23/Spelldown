import React, { useState, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import { SERVER_URL } from '../config';
import './WordGuessingGame.css';

const WordGuessingGame = ({ onBack }) => {
  const [gamePhase, setGamePhase] = useState('menu');
  const [gameCode, setGameCode] = useState('');
  const [playerNumber, setPlayerNumber] = useState(null);
  const [currentWord, setCurrentWord] = useState('');
  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [message, setMessage] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [currentTurn, setCurrentTurn] = useState(1);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [winner, setWinner] = useState(null);
  const [winningWord, setWinningWord] = useState('');
  const [playAgainVotes, setPlayAgainVotes] = useState(0);
  const [hasVotedPlayAgain, setHasVotedPlayAgain] = useState(false);
  const [letterStates, setLetterStates] = useState({});
  const [myWord, setMyWord] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);
  const [socket, setSocket] = useState(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    // Create a new socket connection
    const newSocket = io(SERVER_URL, {
      transports: ['polling', 'websocket'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
      forceNew: true
    });

    setSocket(newSocket);

    // Set up event listeners
    newSocket.on('connect', () => {
      console.log('Connected to server with ID:', newSocket.id);
      setMessage('');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setMessage('Connection error. Please try again.');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setMessage('Disconnected from server. Trying to reconnect...');
    });

    newSocket.on('game-created', ({ gameCode, playerNumber: pNum }) => {
      console.log('Game created:', { gameCode, playerNumber: pNum });
      setGameCode(gameCode);
      setPlayerNumber(pNum);
      setGamePhase('waiting');
      setMessage(`Waiting for player 2 to join. Game code: ${gameCode}`);
    });

    newSocket.on('game-ready', () => {
      console.log('Game ready');
      setGamePhase('submitWord');
      setMessage('Game ready! Please enter your 5-letter word.');
    });

    newSocket.on('join-game-success', ({ gameCode, playerNumber: pNum }) => {
      console.log('Joined game:', { gameCode, playerNumber: pNum });
      setGameCode(gameCode);
      setPlayerNumber(pNum);
      setGamePhase('waiting');
      setMessage('Successfully joined game. Waiting to start...');
    });

    newSocket.on('word-accepted', () => {
      console.log('Word accepted');
      setMessage('Word accepted. Waiting for other player...');
    });

    newSocket.on('game-started', ({ currentTurn }) => {
      console.log('Game started:', { currentTurn });
      setGamePhase('playing');
      setCurrentTurn(currentTurn);
      const isMyTurnNow = currentTurn === playerNumber;
      setIsMyTurn(isMyTurnNow);
      setMessage(isMyTurnNow ? 'Your turn! Make a guess.' : 'Waiting for other player to guess...');
    });

    newSocket.on('guess-result', ({ guesses: newGuesses, currentTurn }) => {
      console.log('Guess result:', { newGuesses, currentTurn });
      setGuesses(newGuesses);
      setCurrentTurn(currentTurn);
      const isMyTurnNow = currentTurn === playerNumber;
      setIsMyTurn(isMyTurnNow);
      setCurrentGuess('');
      setMessage(isMyTurnNow ? 'Your turn! Make a guess.' : 'Waiting for other player to guess...');
    });

    newSocket.on('play-again-vote', ({ votes }) => {
      console.log('Play again votes:', votes);
      setPlayAgainVotes(votes);
      setMessage(`Waiting for other player... (${votes}/2 votes to play again)`);
    });

    newSocket.on('game-restart', () => {
      console.log('Game restarting');
      setGamePhase('submitWord');
      setCurrentWord('');
      setCurrentGuess('');
      setGuesses([]);
      setWinner(null);
      setWinningWord('');
      setMessage('Game restarted! Please enter your 5-letter word.');
      setPlayAgainVotes(0);
      setHasVotedPlayAgain(false);
      setLetterStates({});
      setMyWord('');
    });

    newSocket.on('player-disconnected', () => {
      console.log('Player disconnected');
      setMessage('Other player disconnected. Game ended.');
      setGamePhase('menu');
      setGuesses([]);
      setCurrentWord('');
      setGameCode('');
      setPlayerNumber(null);
      setCurrentTurn(1);
      setIsMyTurn(false);
    });

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up socket connection');
      if (newSocket) {
        // Remove all listeners
        newSocket.off('connect');
        newSocket.off('connect_error');
        newSocket.off('disconnect');
        newSocket.off('game-created');
        newSocket.off('game-ready');
        newSocket.off('join-game-success');
        newSocket.off('word-accepted');
        newSocket.off('game-started');
        newSocket.off('guess-result');
        newSocket.off('play-again-vote');
        newSocket.off('game-restart');
        newSocket.off('player-disconnected');
        
        // Disconnect the socket
        newSocket.disconnect();
      }
    };
  }, []); // Empty dependency array since we only want to run this once

  useEffect(() => {
    if (!socket) return;

    const handleGameOver = (data) => {
      console.log('Game over event received:', data);
      const { winner, winningWord, guessedBy, wordOwner, guesses } = data;
      
      // Update game state
      setGamePhase('gameover');
      setWinner(winner);
      setWinningWord(winningWord);
      if (guesses) setGuesses(guesses);
      
      console.log('Game over state:', {
        currentPlayer: playerNumber,
        winner,
        winningWord,
        playerState: {
          myNumber: playerNumber,
          winner,
          gamePhase: 'gameover'
        }
      });

      // Determine the appropriate message based on player role
      let winMessage;
      if (playerNumber === winner) {
        winMessage = `Congratulations! You won by guessing "${winningWord}"!`;
        console.log('Setting winner message for player', playerNumber);
      } else {
        winMessage = `Game Over! Player ${winner} guessed your word "${winningWord}"!`;
        console.log('Setting loser message for player', playerNumber);
      }
      
      console.log('Final game over state:', {
        message: winMessage,
        myNumber: playerNumber,
        winner,
        isWinner: playerNumber === winner
      });
      
      setMessage(winMessage);
      
      // Reset play again state
      setPlayAgainVotes(0);
      setHasVotedPlayAgain(false);
      setCurrentGuess('');
      setIsMyTurn(false);
    };

    // Add game over handler
    socket.on('game-over', handleGameOver);

    // Cleanup
    return () => {
      socket.off('game-over', handleGameOver);
    };
  }, [socket, playerNumber]); // Add playerNumber as dependency

  useEffect(() => {
    // Don't update message if game is over
    if (gamePhase === 'gameover') return;

    const isMyTurnNow = currentTurn === playerNumber;
    setIsMyTurn(isMyTurnNow);
    setMessage(isMyTurnNow ? 'Your turn! Make a guess.' : 'Waiting for other player to guess...');
    console.log('Turn state updated:', { currentTurn, playerNumber, isMyTurn: isMyTurnNow });
  }, [playerNumber, currentTurn, gamePhase]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showHowToPlay && !event.target.closest('.help-button') && !event.target.closest('.help-popover')) {
        setShowHowToPlay(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHowToPlay]);

  const validateWord = (word) => {
    return word.length === 5 && /^[a-zA-Z]+$/.test(word);
  };

  const handleCreateGame = () => {
    console.log('Creating new game');
    socket.emit('createGame');
  };

  const handleJoinGame = () => {
    if (!joinCode) {
      setMessage('Please enter a game code');
      return;
    }
    console.log('Joining game with code:', joinCode);
    socket.emit('joinGame', { gameCode: joinCode });
  };

  const handleWordSubmit = () => {
    if (!currentWord || currentWord.length !== 5) {
      setMessage('Please enter a 5-letter word');
      return;
    }

    const word = currentWord.toUpperCase();
    console.log('Submitting word:', word, 'Player:', playerNumber);
    socket.emit('submitWord', { word, playerNumber });
    setMyWord(word);
  };
  
  const handleSubmitGuess = () => {
    if (!socket) {
      console.error('No socket connection');
      return;
    }

    if (!currentGuess || currentGuess.length !== 5) {
      setMessage('Please enter a 5-letter word');
      return;
    }

    if (!isMyTurn) {
      setMessage("It's not your turn!");
      return;
    }

    console.log('Submitting guess:', {
      gameCode,
      guess: currentGuess,
      playerNumber,
      currentTurn,
      isMyTurn
    });
    
    socket.emit('makeGuess', { 
      gameCode, 
      guess: currentGuess.toUpperCase()
    });
  };

  const handlePlayAgain = () => {
    if (!hasVotedPlayAgain && socket) {
      console.log('Sending play again request', {
        gameCode,
        playerNumber,
        hasVotedPlayAgain
      });
      
      socket.emit('playAgain', { gameCode });
      setHasVotedPlayAgain(true);
      setMessage('Waiting for other player...');
    } else {
      console.log('Already voted or no socket connection', {
        hasVotedPlayAgain,
        hasSocket: !!socket
      });
    }
  };

  const handleLetterClick = (guessIndex, letterIndex, event) => {
    event.preventDefault(); // Prevent default behavior
    const letterKey = `${guessIndex}-${letterIndex}`;
    
    setLetterStates(prevStates => {
      const currentState = prevStates[letterKey] || 'none';
      let newState;
      
      if (event.type === 'dblclick') {
        // Double click
        newState = currentState === 'crossed' ? 'none' : 'crossed';
      } else {
        // Single click
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

  const renderGuesses = () => {
    return (
      <div className="guesses-container">
        {guesses
          .filter(g => g.playerNumber === playerNumber)
          .map((guess, guessIndex) => (
            <div key={guessIndex} className="guess-row">
              <div className="guess-word">
                {guess.word.split('').map((letter, letterIndex) => (
                  <span
                    key={letterIndex}
                    className={getLetterClass(guessIndex, letterIndex)}
                    onClick={(e) => handleLetterClick(guessIndex, letterIndex, e)}
                    onDoubleClick={(e) => handleLetterClick(guessIndex, letterIndex, e)}
                  >
                    {letter}
                  </span>
                ))}
              </div>
              <div className="correct-count">
                {guess.correctPositions.filter(pos => pos === true).length}
              </div>
            </div>
          ))}
      </div>
    );
  };

  const renderGuessInput = () => {
    const isDisabled = !isMyTurn || gamePhase !== 'playing';
    const placeholder = isMyTurn ? 'Enter your guess' : 'Waiting for other player...';
    
    return (
      <div className="guess-input-container">
        <input
          type="text"
          maxLength={5}
          placeholder={placeholder}
          value={currentGuess}
          onChange={(e) => setCurrentGuess(e.target.value.toUpperCase())}
          className="guess-input"
          disabled={isDisabled}
        />
        <button 
          className="guess-button"
          onClick={handleSubmitGuess}
          disabled={isDisabled}
        >
          Guess
        </button>
      </div>
    );
  };

  useEffect(() => {
    console.log('Game state updated:', {
      phase: gamePhase,
      playerNumber,
      currentTurn,
      isMyTurn,
      guessesCount: guesses.length,
      guesses: guesses.map(g => ({
        word: g?.word,
        player: g?.playerNumber,
        positions: g?.correctPositions,
        letters: g?.correctLetters
      }))
    });
  }, [gamePhase, playerNumber, currentTurn, isMyTurn, guesses]);

  const myGuesses = useMemo(() => {
    const filtered = guesses.filter(g => g && g.playerNumber === playerNumber);
    console.log('Computing my guesses:', {
      myPlayerNumber: playerNumber,
      filtered: filtered.map(g => ({ word: g.word, player: g.playerNumber }))
    });
    return filtered;
  }, [guesses, playerNumber]);

  const opponentGuesses = useMemo(() => {
    const filtered = guesses.filter(g => g && g.playerNumber !== playerNumber);
    console.log('Computing opponent guesses:', {
      myPlayerNumber: playerNumber,
      filtered: filtered.map(g => ({ word: g.word, player: g.playerNumber }))
    });
    return filtered;
  }, [guesses, playerNumber]);

  const latestOpponentGuess = useMemo(() => {
    return guesses
      .filter(g => g.playerNumber !== playerNumber)
      .slice(-1)[0];
  }, [guesses, playerNumber]);

  const renderHeader = () => {
    return (
      <div className="game-header">
        <div className="header-left">
          <button className="back-button" onClick={onBack}>
            Back to Menu
          </button>
        </div>
        <div className="header-center">
          <h1 className="game-title">SpellDown</h1>
          <button 
            className="help-button" 
            onClick={() => setShowHowToPlay(!showHowToPlay)}
            aria-label="How to play"
          >
            ?
          </button>
          {showHowToPlay && (
            <div className="help-popover">
              <h3>How to Play</h3>
              <p>Challenge your opponent to a word guessing duel!</p>
              <ul>
                <li>Create a game and share the code with your opponent</li>
                <li>Each player enters a 5-letter word</li>
                <li>Take turns guessing your opponent's word</li>
                <li>After each guess, you'll see how many letters are in the correct position</li>
                <li>First player to guess their opponent's word wins!</li>
              </ul>
            </div>
          )}
        </div>
        <div className="header-right"></div>
      </div>
    );
  };

  return (
    <div className="game-container">
      {renderHeader()}
      
      <div className="game-content">
        {gamePhase === 'menu' && (
          <div className="menu-phase">
            <button onClick={handleCreateGame}>Create Game</button>
            <div className="join-game-section">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter game code"
                maxLength={6}
              />
              <button onClick={handleJoinGame}>Join Game</button>
            </div>
            {message && <div className="message-alert">{message}</div>}
          </div>
        )}

        {gamePhase === 'waiting' && (
          <div className="waiting-phase">
            <h2>Game Code: {gameCode}</h2>
            <p>Share this code with player 2</p>
            {message && <div className="message-alert">{message}</div>}
          </div>
        )}

        {gamePhase === 'submitWord' && (
          <div className="setup-phase">
            <div className="input-group">
              <label>Enter your 5-letter word:</label>
              <div className="input-with-button">
                <input
                  type="text"
                  value={currentWord}
                  onChange={(e) => setCurrentWord(e.target.value.toUpperCase())}
                  placeholder="Enter your 5-letter word"
                  maxLength={5}
                />
                <button onClick={handleWordSubmit}>Submit Word</button>
              </div>
            </div>
            {message && <div className="message-alert">{message}</div>}
          </div>
        )}

        {gamePhase === 'playing' && (
          <div className="play-phase">
            <div className="game-top">
              <div className="word-display">
                <h3>Your Word</h3>
                <span className="player-word">{myWord || '-----'}</span>
              </div>
              <div className="game-status">
                {message && <div className="message-alert">{message}</div>}
              </div>
            </div>

            <div className="game-layout">
             

              <div className="game-main">
                {latestOpponentGuess && (
                  <div className="opponent-guess-section">
                    <h3>Opponent's Latest Guess</h3>
                    <div className="guess-row">
                      <div className="guess-word">
                        {latestOpponentGuess.word.split('').map((letter, letterIndex) => (
                          <span key={letterIndex} className="letter-box">
                            {letter}
                          </span>
                        ))}
                      </div>
                      <div className="correct-count">
                        {latestOpponentGuess.correctPositions.filter(pos => pos === true).length}
                      </div>
                    </div>
                  </div>
                )}
                {renderGuessInput()}
                <div className="game-board">
                  {renderGuesses()}
                </div>
              </div>
            </div>
          </div>
        )}

        {gamePhase === 'gameover' && (
          <div className="gameover-phase">
            <h2>{message}</h2>
            {hasVotedPlayAgain ? (
              <p>Waiting for other player... ({playAgainVotes}/2)</p>
            ) : (
              <button onClick={handlePlayAgain}>Play Again</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WordGuessingGame;