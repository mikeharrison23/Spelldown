const express = require('express');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();

// Configure middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const httpServer = createServer(app);

// Configure Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  cookie: {
    name: 'io',
    httpOnly: true,
    sameSite: 'lax'
  }
});

// Import routes and controllers
const { 
  createGame, 
  joinGame, 
  submitWord, 
  makeGuess,
  handlePlayAgain,
  games,
  playerSessions 
} = require('../server/controllers/multiplayercontroller');

// Make io available to the multiplayer controller
global.io = io;

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, 'build')));

// Load the word list
const wordList = fs.readFileSync(path.join(__dirname, '..', 'words.txt'), 'utf8')
  .split('\n')
  .map(word => word.trim().toLowerCase())
  .filter(word => word.length === 5);

console.log(`Loaded ${wordList.length} valid 5-letter words`);

// Game state management
const singlePlayerGames = new Map();

// Computer guessing strategy
function makeComputerGuess(previousGuesses, targetLength = 5) {
  let possibleWords = [...wordList];

  for (const guess of previousGuesses) {
    possibleWords = possibleWords.filter(word => {
      for (let i = 0; i < targetLength; i++) {
        if (guess.correctPositions[i] && word[i] !== guess.word[i].toLowerCase()) {
          return false;
        }
        if (!guess.correctPositions[i] && guess.correctLetters.includes(guess.word[i].toLowerCase())) {
          if (!word.includes(guess.word[i].toLowerCase()) || word[i] === guess.word[i].toLowerCase()) {
            return false;
          }
        }
        if (!guess.correctPositions[i] && !guess.correctLetters.includes(guess.word[i].toLowerCase())) {
          if (word.includes(guess.word[i].toLowerCase())) {
            return false;
          }
        }
      }
      return true;
    });
  }

  if (possibleWords.length === 0) {
    const randomIndex = Math.floor(Math.random() * wordList.length);
    return wordList[randomIndex];
  }

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

  for (let i = 0; i < 5; i++) {
    if (guess[i].toLowerCase() === targetWord[i].toLowerCase()) {
      result.correctPositions[i] = true;
    }
  }

  const remainingTargetLetters = targetWord.toLowerCase().split('');
  const remainingGuessLetters = guess.toLowerCase().split('');
  
  result.correctPositions.forEach((isCorrect, index) => {
    if (isCorrect) {
      remainingTargetLetters[index] = null;
      remainingGuessLetters[index] = null;
    }
  });

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
    
    const gameCode = playerSessions.get(socket.id);
    if (gameCode) {
      const game = games.get(gameCode);
      if (game) {
        game.players.delete(socket.id);
        if (game.players.size === 0) {
          games.delete(gameCode);
        } else {
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

// API Routes
app.get('/api/words', (req, res) => {
  const filePath = path.join(__dirname, '..', 'words.txt');
  console.log('Reading words from:', filePath);
  
  try {
    const words = fs.readFileSync(filePath, 'utf8');
    console.log('Words loaded successfully');
    res.send(words);
  } catch (error) {
    console.error('Error reading words.txt:', error);
    res.status(500).send('Error reading words file');
  }
});

// Debug endpoint
app.get('/debug/games', (req, res) => {
  const gamesList = Array.from(games.entries()).map(([code, game]) => ({
    code,
    players: game.players.size,
    phase: game.gamePhase
  }));
  res.json(gamesList);
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

httpServer.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log('Local access: http://localhost:3001');
  console.log('Network access: http://192.168.86.59:3001');
});
