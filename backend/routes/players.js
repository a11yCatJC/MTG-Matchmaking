const express = require('express');
const router = express.Router();
const db = require('../database');

// Get all players
router.get('/', (req, res) => {
  db.getAllPlayers((err, players) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(players);
  });
});

// Get players by office
router.get('/office/:office', (req, res) => {
  const office = req.params.office;
  db.getPlayersByOffice(office, (err, players) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(players);
  });
});

// Add new player
router.post('/', (req, res) => {
  const player = req.body;
  db.addPlayer(player, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, message: 'Player added successfully' });
  });
});

// Get leaderboard
router.get('/leaderboard/:office?', (req, res) => {
  const office = req.params.office;
  db.getLeaderboard(office, (err, leaderboard) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(leaderboard);
  });
});

module.exports = router;
