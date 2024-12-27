const express = require('express');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();

// Configure middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const httpServer = createServer(app);

// Configure Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['polling', 'websocket']
});

// Import routes and controllers
const singlePlayerRoutes = require('./server/routes/singleplayer');
const multiPlayerRoutes = require('./server/routes/multiplayer');
const { 
  createGame, 
  joinGame, 
  submitWord, 
  makeGuess,
  handlePlayAgain,
  games,
  playerSessions 
} = require('./server/controllers/multiplayercontroller');

// Make io available to the multiplayer controller
global.io = io;

// Mount routes
app.use('/api/singleplayer', singlePlayerRoutes);
app.use('/api/multiplayer', multiPlayerRoutes);

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
}

// Load the word list
const wordList = fs.readFileSync(path.join(__dirname, 'words.txt'), 'utf8')
  .split('\n')
  .map(word => word.trim().toLowerCase())
  .filter(word => word.length === 5);

console.log(`Loaded ${wordList.length} valid 5-letter words`);

// Game state management
const singlePlayerGames = new Map();

// Computer guessing strategy
function makeComputerGuess(previousGuesses, targetLength = 5) {
  // Filter words that match the pattern from previous guesses
  let possibleWords = [...wordList]; // wordList is already lowercase

  for (const guess of previousGuesses) {
    possibleWords = possibleWords.filter(word => {
      // Check if this word would give the same feedback as the previous guess
      for (let i = 0; i < targetLength; i++) {
        // If position was correct, word must have same letter in that position
        if (guess.correctPositions[i] && word[i] !== guess.word[i].toLowerCase()) {
          return false;
        }
        // If position was incorrect but letter exists, word must have that letter somewhere else
        if (!guess.correctPositions[i] && guess.correctLetters.includes(guess.word[i].toLowerCase())) {
          if (!word.includes(guess.word[i].toLowerCase()) || word[i] === guess.word[i].toLowerCase()) {
            return false;
          }
        }
        // If letter wasn't in word at all, word cannot contain this letter
        if (!guess.correctPositions[i] && !guess.correctLetters.includes(guess.word[i].toLowerCase())) {
          if (word.includes(guess.word[i].toLowerCase())) {
            return false;
          }
        }
      }
      return true;
    });
  }

  // If no words match the pattern, return a random word as fallback
  if (possibleWords.length === 0) {
    const randomIndex = Math.floor(Math.random() * wordList.length);
    return wordList[randomIndex];
  }

  // Return a random word from possible words
  const randomIndex = Math.floor(Math.random() * possibleWords.length);
  return possibleWords[randomIndex];
}

// Check guess against target word
function checkGuess(guess, targetWord) {
  const result = {
    word: guess.toLowerCase(),
    correctPositions: new Array(5).fill(false),
    correctLetters: []
  };

  // Check for correct positions
  for (let i = 0; i < 5; i++) {
    if (guess[i].toLowerCase() === targetWord[i].toLowerCase()) {
      result.correctPositions[i] = true;
    }
  }

  // Check for correct letters in wrong positions
  const remainingTargetLetters = targetWord.toLowerCase().split('');
  const remainingGuessLetters = guess.toLowerCase().split('');
  
  // Remove exact matches first
  result.correctPositions.forEach((isCorrect, index) => {
    if (isCorrect) {
      remainingTargetLetters[index] = null;
      remainingGuessLetters[index] = null;
    }
  });

  // Check remaining letters
  remainingGuessLetters.forEach((letter, index) => {
    if (letter === null) return;
    
    const targetIndex = remainingTargetLetters.indexOf(letter);
    if (targetIndex !== -1) {
      result.correctLetters.push(letter);
      remainingTargetLetters[targetIndex] = null;
    }
  });

  return result;
}

// Multiplayer socket.io logic
io.on('connection', (socket) => {
  console.log('\n=== Socket Connected ===');
  console.log('New connection:', socket.id);

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  socket.on('disconnect', () => {
    console.log('\n=== Socket Disconnected ===');
    console.log('Disconnected:', socket.id);
    
    // Clean up any game state
    const gameCode = playerSessions.get(socket.id);
    if (gameCode) {
      const game = games.get(gameCode);
      if (game) {
        game.players.delete(socket.id);
        if (game.players.size === 0) {
          games.delete(gameCode);
        } else {
          // Notify remaining player
          socket.to(gameCode).emit('player-disconnected', {
            message: 'Your opponent has disconnected'
          });
        }
      }
      playerSessions.delete(socket.id);
    }
  });

  // Game events
  socket.on('createGame', () => {
    console.log('Create game request from:', socket.id);
    createGame(socket);
  });
  
  socket.on('joinGame', (data) => {
    console.log('Join game request from:', socket.id, data);
    joinGame(socket, data);
  });
  
  socket.on('submitWord', (data) => {
    console.log('Submit word request from:', socket.id, data);
    submitWord(socket, data);
  });
  
  socket.on('makeGuess', (data) => {
    console.log('Make guess request from:', socket.id, data);
    makeGuess(socket, data);
  });
  
  socket.on('playAgain', (data) => {
    console.log('Play again request from:', socket.id, data);
    handlePlayAgain(socket, data);
  });
});

// Debug endpoint to check active games
app.get('/debug/games', (req, res) => {
  const gamesList = Array.from(games.entries()).map(([code, game]) => ({
    code,
    players: game.players.size,
    phase: game.gamePhase
  }));
  res.json(gamesList);
});

// Add words.txt endpoint
app.get('/api/words', (req, res) => {
  const filePath = path.join(__dirname, 'words.txt');
  console.log('Reading words from:', filePath);
  
  try {
    const words = fs.readFileSync(filePath, 'utf8');
    console.log('Words loaded successfully');
    console.log('First 100 characters:', words.substring(0, 100));
    console.log('Total length:', words.length);
    console.log('Number of lines:', words.split('\n').length);
    res.send(words);
  } catch (error) {
    console.error('Error reading words.txt:', error);
    res.status(500).send('Error reading words file');
  }
});

const PORT = 3001;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
