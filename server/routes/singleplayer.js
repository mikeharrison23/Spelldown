const express = require('express');
const router = express.Router();
const { validatePlayerWord, startGame, makePlayerGuess } = require('../controllers/singleplayercontroller');

// Single player routes
router.post('/validate', validatePlayerWord);
router.post('/start', startGame);
router.post('/player-guess', makePlayerGuess);

module.exports = router;