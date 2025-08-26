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

// Create a manual match
router.post('/create', (req, res) => {
  const { player1Id, player2Id } = req.body;
  
  if (!player1Id || !player2Id) {
    return res.status(400).json({ error: 'Both players are required' });
  }
  
  if (player1Id === player2Id) {
    return res.status(400).json({ error: 'Players cannot play against themselves' });
  }
  
  db.createMatch(player1Id, player2Id, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json({ 
      message: 'Match created successfully',
      matchId: this.lastID
    });
  });
});

// Get all pending matches
router.get('/pending', (req, res) => {
  db.getPendingMatches((err, matches) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(matches);
  });
});

// Get match by ID
router.get('/:matchId', (req, res) => {
  const { matchId } = req.params;
  
  db.getMatchById(matchId, (err, match) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json(match);
  });
});

// Report match result
router.post('/:matchId/report', (req, res) => {
  const { matchId } = req.params;
  const { winnerId, reportedBy } = req.body;
  
  if (!winnerId) {
    return res.status(400).json({ error: 'Winner ID is required' });
  }
  
  // First verify the match exists and is pending
  db.getMatchById(matchId, (err, match) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    if (match.status === 'completed') {
      return res.status(400).json({ error: 'Match has already been reported' });
    }
    
    // Verify winner is one of the players
    if (winnerId !== match.player1_id && winnerId !== match.player2_id) {
      return res.status(400).json({ error: 'Winner must be one of the match participants' });
    }
    
    db.reportMatch(matchId, winnerId, reportedBy, (err, prizeInfo) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const response = { 
        message: 'Match reported successfully',
        match: {
          id: matchId,
          winnerId: winnerId,
          winnerName: winnerId === match.player1_id ? match.player1_name : match.player2_name
        }
      };
      
      if (prizeInfo && prizeInfo.eligible) {
        response.prize = {
          type: prizeInfo.prizeType,
          message: `Congratulations! You've earned a prize for ${prizeInfo.prizeType.replace('_', ' ')}!`
        };
      }
      
      res.json(response);
    });
  });
});

// Update match (for corrections)
router.put('/:matchId', (req, res) => {
  const { matchId } = req.params;
  const { winnerId, status } = req.body;
  
  db.updateMatch(matchId, { winner_id: winnerId, status }, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json({ message: 'Match updated successfully' });
  });
});

// Delete match (admin only)
router.delete('/:matchId', (req, res) => {
  const { matchId } = req.params;
  
  db.deleteMatch(matchId, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json({ message: 'Match deleted successfully' });
  });
});

module.exports = router;
