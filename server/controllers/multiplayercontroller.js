const express = require('express');
const { validateWord, checkGuess, generateGameCode } = require('../utils/gameLogic');

// Game state management
const games = new Map();
const playerSessions = new Map();

const createGame = (socket) => {
  console.log('\n=== Create Game ===');
  const gameCode = generateGameCode();
  console.log('Creating new game:', gameCode);
  
  games.set(gameCode, {
    players: new Map(),
    words: new Map(),
    currentTurn: 1,
    gamePhase: 'waiting',
    guesses: []
  });

  // Add the creator as player 1
  const game = games.get(gameCode);
  game.players.set(socket.id, 1);
  playerSessions.set(socket.id, gameCode);
  
  // Join the socket to the game room
  socket.join(gameCode);
  
  // Send the game code back to the client
  socket.emit('game-created', { 
    gameCode,
    playerNumber: 1
  });
};

const joinGame = (socket, { gameCode }) => {
  console.log('\n=== Join Game Request ===');
  console.log('Join request for game:', gameCode);
  
  try {
    const game = games.get(gameCode);
    if (!game) {
      console.error('Game not found:', gameCode);
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    if (game.players.size >= 2) {
      console.error('Game is full:', gameCode);
      socket.emit('error', { message: 'Game is full' });
      return;
    }

    if (game.gamePhase !== 'waiting') {
      console.error('Game already started:', gameCode);
      socket.emit('error', { message: 'Game has already started' });
      return;
    }

    // Add player 2
    game.players.set(socket.id, 2);
    playerSessions.set(socket.id, gameCode);
    
    // Join the socket to the game room
    socket.join(gameCode);
    
    // Notify the joining player
    socket.emit('join-game-success', {
      gameCode,
      playerNumber: 2
    });

    // Notify both players that game is ready
    io.to(gameCode).emit('game-ready');
    
    console.log('Player 2 joined game:', gameCode);
    console.log('Current players:', Array.from(game.players.entries()));

  } catch (error) {
    console.error('Error in joinGame:', error);
    socket.emit('error', { message: 'Failed to join game' });
  }
};

const submitWord = (socket, { word, playerNumber }) => {
  console.log('\n=== Submit Word Request ===');
  console.log('Word submitted:', { word, playerNumber, socketId: socket.id });
  
  try {
    const gameCode = playerSessions.get(socket.id);
    if (!gameCode) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const game = games.get(gameCode);
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const actualPlayerNumber = game.players.get(socket.id);
    if (!actualPlayerNumber) {
      socket.emit('error', { message: 'Player not found in game' });
      return;
    }

    // Validate the word
    if (!validateWord(word)) {
      socket.emit('error', { message: 'Invalid word! Please use a word from our dictionary.' });
      return;
    }

    // Store the word in uppercase
    game.words.set(actualPlayerNumber, word.toUpperCase());
    socket.emit('word-accepted');

    // Check if both players have submitted words
    if (game.words.size === 2) {
      game.gamePhase = 'playing';
      game.currentTurn = 1;
      game.guesses = [];

      // Notify all players that the game has started
      io.to(gameCode).emit('game-started', {
        currentTurn: game.currentTurn
      });
    }
  } catch (error) {
    console.error('Error in submitWord:', error);
    socket.emit('error', { message: 'Failed to submit word' });
  }
};

const makeGuess = (socket, { gameCode, guess }) => {
  console.log('\n=== Make Guess Request ===');
  console.log('Guess received:', { gameCode, guess });
  
  try {
    const game = games.get(gameCode);
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const playerNumber = game.players.get(socket.id);
    if (!playerNumber) {
      socket.emit('error', { message: 'Player not found in game' });
      return;
    }

    if (game.gamePhase !== 'playing') {
      socket.emit('error', { message: 'Game is not in playing phase' });
      return;
    }

    if (game.currentTurn !== playerNumber) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }

    if (!validateWord(guess)) {
      socket.emit('error', { message: 'Invalid word' });
      return;
    }

    const opponentNumber = playerNumber === 1 ? 2 : 1;
    const opponentWord = game.words.get(opponentNumber);
    const result = checkGuess(guess.toUpperCase(), opponentWord);

    // Store the guess
    const guessData = {
      playerNumber,
      word: guess.toUpperCase(),
      correctPositions: result.map(r => r === 'correct')
    };
    game.guesses.push(guessData);

    // Check if the guess is correct
    const isCorrect = result.every(r => r === 'correct');
    if (isCorrect) {
      console.log('Correct guess! Game over');
      
      // Update game state
      game.winner = playerNumber;
      game.winningWord = opponentWord;
      game.gamePhase = 'gameover';
      
      // Store the final guess
      const finalGuess = {
        playerNumber,
        word: guess.toUpperCase(),
        correctPositions: result.map(r => r === 'correct')
      };
      game.guesses.push(finalGuess);
      
      // First send the final guess result
      io.to(gameCode).emit('guess-result', {
        guesses: game.guesses,
        currentTurn: game.currentTurn
      });
      
      // Prepare game over data
      const gameOverData = {
        winner: playerNumber,  // The guesser is the winner
        winningWord: opponentWord,
        gameCode: gameCode,
        guesses: game.guesses
      };
      
      console.log('Game over data:', {
        ...gameOverData,
        playerInfo: {
          winner: playerNumber,
          loser: opponentNumber
        }
      });
      
      // Send game over event
      io.to(gameCode).emit('game-over', gameOverData);
      return;
    }

    // Next turn
    game.currentTurn = opponentNumber;
    io.to(gameCode).emit('guess-result', {
      guesses: game.guesses,
      currentTurn: game.currentTurn
    });

  } catch (error) {
    console.error('Error in makeGuess:', error);
    socket.emit('error', { message: 'Internal server error' });
  }
};

const handlePlayAgain = (socket, { gameCode }) => {
  console.log('\n=== Play Again Request ===');
  console.log('Play again request from:', socket.id);
  console.log('Game code from request:', gameCode);
  
  try {
    // First try to get game code from request, then fallback to player sessions
    const gameCodeToUse = gameCode || playerSessions.get(socket.id);
    console.log('Using game code:', gameCodeToUse);
    
    if (!gameCodeToUse) {
      console.error('No game found for socket:', socket.id);
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const game = games.get(gameCodeToUse);
    if (!game) {
      console.error('Game not found for code:', gameCodeToUse);
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    // Initialize playAgainVotes if it doesn't exist
    if (!game.playAgainVotes) {
      game.playAgainVotes = new Set();
    }

    // Add this player's vote
    game.playAgainVotes.add(socket.id);
    console.log('Updated votes:', game.playAgainVotes.size, 'for game:', gameCodeToUse);

    // If both players voted to play again
    if (game.playAgainVotes.size === 2) {
      console.log('Both players voted to play again. Restarting game:', gameCodeToUse);
      
      // Reset the game state
      game.words = new Map();
      game.currentTurn = 1;
      game.gamePhase = 'submitWord';
      game.guesses = [];
      game.winner = null;
      game.playAgainVotes = new Set();

      // Notify players to restart
      io.to(gameCodeToUse).emit('game-restart');
    } else {
      // Notify players about vote count
      io.to(gameCodeToUse).emit('play-again-vote', {
        votes: game.playAgainVotes.size
      });
    }
  } catch (error) {
    console.error('Error in handlePlayAgain:', error);
    socket.emit('error', { message: 'Failed to process play again request' });
  }
};

module.exports = {
  createGame,
  joinGame,
  submitWord,
  makeGuess,
  handlePlayAgain,
  games,
  playerSessions
};
