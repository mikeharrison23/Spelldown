const express = require('express');
const router = express.Router();

// Since multiplayer uses WebSocket, we only need a few HTTP endpoints
router.get('/active-games', (req, res) => {
  const activeGames = Array.from(games.entries()).map(([code, game]) => ({
    code,
    players: game.players.size,
    phase: game.gamePhase
  }));
  res.json(activeGames);
});

module.exports = router;