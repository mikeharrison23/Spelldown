const { validateWord, checkGuess, makeComputerGuess } = require('../utils/gameLogic');

// Store active single-player games
const singlePlayerGames = new Map();

const validatePlayerWord = (req, res) => {
  try {
    const { word } = req.body;
    if (!word) {
      return res.status(400).json({ error: 'No word provided' });
    }
    
    const isValid = validateWord(word);
    res.json({ valid: isValid });
  } catch (error) {
    console.error('Error in word validation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const startGame = (req, res) => {
  try {
    const { playerWord } = req.body;
    
    if (!validateWord(playerWord)) {
      return res.status(400).json({ error: 'Invalid word' });
    }
    
    // Generate unique game ID
    const gameId = Date.now().toString();
    
    // Initialize game state
    const gameState = {
      playerWord: playerWord.toLowerCase(),
      computerWord: makeComputerGuess([]),
      playerGuesses: [],
      computerGuesses: [],
      currentTurn: 'player',
      gameOver: false,
      winner: null
    };
    
    // Store game state
    singlePlayerGames.set(gameId, gameState);
    
    res.json({ gameId });
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const makePlayerGuess = (req, res) => {
  try {
    const { gameId, guess } = req.body;
    
    // Validate game exists
    const game = singlePlayerGames.get(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Validate guess
    if (!validateWord(guess)) {
      return res.status(400).json({ error: 'Invalid word' });
    }
    
    // Check if game is already over
    if (game.gameOver) {
      return res.status(400).json({ error: 'Game is already over' });
    }
    
    // Process player's guess
    const playerGuessResult = checkGuess(guess.toLowerCase(), game.computerWord);
    game.playerGuesses.push({ guess: guess.toLowerCase(), result: playerGuessResult });
    
    // Check if player won
    const playerWon = playerGuessResult.every(r => r === 'correct');
    if (playerWon) {
      game.gameOver = true;
      game.winner = 'player';
      singlePlayerGames.delete(gameId); // Clean up finished game
      return res.json({
        playerGuessResult,
        gameOver: true,
        winner: 'player',
        computerWord: game.computerWord,
        message: `Congratulations! You won! You correctly guessed the computer's word: ${game.computerWord}. The computer was trying to guess your word: ${game.playerWord}`,
        canShareWord: true,
        playerWord: game.playerWord
      });
    }
    
    // Computer's turn
    const computerGuess = makeComputerGuess(game.computerGuesses);
    const computerGuessResult = checkGuess(computerGuess, game.playerWord);
    game.computerGuesses.push({ guess: computerGuess, result: computerGuessResult });
    
    // Check if computer won
    const computerWon = computerGuessResult.every(r => r === 'correct');
    if (computerWon) {
      game.gameOver = true;
      game.winner = 'computer';
      singlePlayerGames.delete(gameId); // Clean up finished game
      return res.json({
        playerGuessResult,
        computerGuessResult: { guess: computerGuess, result: computerGuessResult },
        gameOver: true,
        winner: 'computer',
        computerWord: game.computerWord,
        message: `Game Over! The computer won by guessing your word: ${game.playerWord}. The computer's word was: ${game.computerWord}`,
        canShareWord: false
      });
    }
    
    res.json({
      playerGuessResult,
      computerGuessResult: { guess: computerGuess, result: computerGuessResult },
      gameOver: game.gameOver,
      winner: game.winner,
      currentTurn: 'player',
      message: 'Your turn! Make your next guess.'
    });
  } catch (error) {
    console.error('Error processing guess:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  validatePlayerWord,
  startGame,
  makePlayerGuess
};