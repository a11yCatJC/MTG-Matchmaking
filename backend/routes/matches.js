const express = require('express');
const router = express.Router();
const db = require('../database');

// Get all pending matches
router.get('/pending', (req, res) => {
  db.getPendingMatches((err, matches) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(matches);
  });
});

// Get matches by player
router.get('/player/:playerId', (req, res) => {
  const playerId = req.params.playerId;
  db.getMatchesByPlayer(playerId, (err, matches) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(matches);
  });
});

// Create a new match
router.post('/create', (req, res) => {
  const { player1_id, player2_id, tournament_id } = req.body;
  
  // Validate that players are different
  if (player1_id === player2_id) {
    return res.status(400).json({ error: 'Players cannot play against themselves' });
  }
  
  // Check if players are in the same office
  db.getPlayerById(player1_id, (err, player1) => {
    if (err || !player1) {
      return res.status(400).json({ error: 'Player 1 not found' });
    }
    
    db.getPlayerById(player2_id, (err, player2) => {
      if (err || !player2) {
        return res.status(400).json({ error: 'Player 2 not found' });
      }
      
      if (player1.office !== player2.office) {
        return res.status(400).json({ error: 'Players must be in the same office' });
      }
      
      db.createMatch(player1_id, player2_id, function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Get the created match with player details
        db.getMatchById(this.lastID, (err, match) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          res.json({
            message: 'Match created successfully',
            match: match
          });
        });
      });
    });
  });
});

// Join matchmaking queue
router.post('/queue/join', (req, res) => {
  const { playerId, office } = req.body;
  
  // Check if player is already in queue
  db.isPlayerInQueue(playerId, (err, inQueue) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (inQueue) {
      return res.status(400).json({ error: 'Player already in queue' });
    }
    
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

// Get current queue status
router.get('/queue/:office', (req, res) => {
  const office = req.params.office;
  db.getQueueByOffice(office, (err, queue) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(queue);
  });
});

// Report match result
router.post('/:matchId/report', (req, res) => {
  const { matchId } = req.params;
  const { winnerId, reportedBy } = req.body;
  
  // Validate that the match exists and is pending
  db.getMatchById(matchId, (err, match) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    if (match.status !== 'pending') {
      return res.status(400).json({ error: 'Match has already been completed' });
    }
    
    // Validate that winnerId is one of the players
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
          ...match,
          winner_id: winnerId,
          status: 'completed'
        }
      };
      
      if (prizeInfo && prizeInfo.eligible) {
        response.prize = {
          playerId: winnerId,
          type: prizeInfo.prizeType,
          message: `Congratulations! You've earned a prize for ${prizeInfo.prizeType.replace('_', ' ')}!`,
          wins: prizeInfo.wins,
          losses: prizeInfo.losses
        };
      }
      
      res.json(response);
    });
  });
});

// Cancel/Delete a pending match
router.delete('/:matchId', (req, res) => {
  const { matchId } = req.params;
  
  db.getMatchById(matchId, (err, match) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    if (match.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot delete completed matches' });
    }
    
    db.deleteMatch(matchId, (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ message: 'Match deleted successfully' });
    });
  });
});

// Get match statistics
router.get('/stats/:playerId', (req, res) => {
  const playerId = req.params.playerId;
  const weekStart = req.query.week_start || db.getWeekStart(new Date());
  
  db.getPlayerMatchStats(playerId, weekStart, (err, stats) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(stats);
  });
});

module.exports = router;
