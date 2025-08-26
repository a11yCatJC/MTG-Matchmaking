const express = require('express');
const router = express.Router();
const db = require('../database');

// Join matchmaking queue
router.post('/queue/join', (req, res) => {
  const { playerId, office } = req.body;
  
  db.addToQueue(playerId, office, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Check for potential matches
    db.getQueueByOffice(office, (err, queue) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (queue.length >= 2) {
        // Create match with first two players in queue
        const player1 = queue[0];
        const player2 = queue[1];
        
        db.createMatch(player1.player_id, player2.player_id, function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          // Remove both players from queue
          db.removeFromQueue(player1.player_id, () => {
            db.removeFromQueue(player2.player_id, () => {
              res.json({
                message: 'Match created!',
                matchId: this.lastID,
                players: [player1.name, player2.name]
              });
            });
          });
        });
      } else {
        res.json({ message: 'Added to queue, waiting for opponent...' });
      }
    });
  });
});

// Leave matchmaking queue
router.post('/queue/leave', (req, res) => {
  const { playerId } = req.body;
  
  db.removeFromQueue(playerId, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Removed from queue' });
  });
});

// Report match result
router.post('/:matchId/report', (req, res) => {
  const { matchId } = req.params;
  const { winnerId } = req.body;
  
  db.reportMatch(matchId, winnerId, (err, prizeInfo) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const response = { message: 'Match reported successfully' };
    if (prizeInfo && prizeInfo.eligible) {
      response.prize = {
        type: prizeInfo.prizeType,
        message: `Congratulations! You've earned a prize for ${prizeInfo.prizeType.replace('_', ' ')}!`
      };
    }
    
    res.json(response);
  });
});

module.exports = router;

