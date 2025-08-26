const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../database');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'avatar-' + uniqueSuffix + extension);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get all players
router.get('/', (req, res) => {
  db.getAllPlayers((err, players) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(players);
  });
});

// Get single player
router.get('/:id', (req, res) => {
  const playerId = req.params.id;
  db.getPlayerById(playerId, (err, player) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(player);
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

// Update player
router.put('/:id', (req, res) => {
  const playerId = req.params.id;
  const updates = req.body;
  
  db.updatePlayer(playerId, updates, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Player updated successfully' });
  });
});

// Upload avatar
router.post('/:id/avatar', upload.single('avatar'), (req, res) => {
  const playerId = req.params.id;
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  
  // Get current player to delete old avatar if exists
  db.getPlayerById(playerId, (err, player) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Delete old avatar file if it exists
    if (player.avatar_url && player.avatar_url.startsWith('/uploads/')) {
      const oldAvatarPath = path.join(__dirname, '..', player.avatar_url);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Update player with new avatar URL
    db.updatePlayerAvatar(playerId, avatarUrl, function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ 
        message: 'Avatar uploaded successfully',
        avatarUrl: avatarUrl
      });
    });
  });
});

// Delete avatar
router.delete('/:id/avatar', (req, res) => {
  const playerId = req.params.id;
  
  db.getPlayerById(playerId, (err, player) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Delete avatar file if it exists
    if (player.avatar_url && player.avatar_url.startsWith('/uploads/')) {
      const avatarPath = path.join(__dirname, '..', player.avatar_url);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    // Remove avatar URL from database
    db.updatePlayerAvatar(playerId, null, function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ message: 'Avatar deleted successfully' });
    });
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

// Get recent matches (for displaying match history with avatars)
router.get('/matches/recent/:limit?', (req, res) => {
  const limit = parseInt(req.params.limit) || 10;
  db.getRecentMatches(limit, (err, matches) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(matches);
  });
});

module.exports = router;
