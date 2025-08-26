const express = require('express');
const router = express.Router();
const { WebClient } = require('@slack/web-api');
const db = require('../database');

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Handle slash commands
router.post('/commands', (req, res) => {
  const { command, text, user_id } = req.body;
  
  switch (text.toLowerCase()) {
    case 'join':
      handleJoinCommand(user_id, res);
      break;
    case 'leave':
      handleLeaveCommand(user_id, res);
      break;
    case 'stats':
      handleStatsCommand(user_id, res);
      break;
    case 'leaderboard':
      handleLeaderboardCommand(user_id, res);
      break;
    default:
      res.json({
        text: 'Available commands:\n• `/mtg join` - Join matchmaking\n• `/mtg leave` - Leave queue\n• `/mtg stats` - View your stats\n• `/mtg leaderboard` - See rankings'
      });
  }
});

function handleJoinCommand(userId, res) {
  db.getPlayerBySlackId(userId, (err, player) => {
    if (err || !player) {
      return res.json({ text: 'Please register first by visiting the tournament website!' });
    }
    
    db.addToQueue(player.id, player.office, function(err) {
      if (err) {
        return res.json({ text: 'Error joining queue. Please try again.' });
      }
      
      // Check for matches
      db.getQueueByOffice(player.office, (err, queue) => {
        if (queue.length >= 2) {
          const opponent = queue.find(q => q.player_id !== player.id);
          res.json({
            text: `🎯 Match found! You're paired with ${opponent.name}. Good luck! 🍀`
          });
        } else {
          res.json({
            text: `⏳ You've joined the ${player.office} matchmaking queue. Waiting for an opponent...`
          });
        }
      });
    });
  });
}

function handleLeaveCommand(userId, res) {
  db.getPlayerBySlackId(userId, (err, player) => {
    if (err || !player) {
      return res.json({ text: 'Player not found!' });
    }
    
    db.removeFromQueue(player.id, (err) => {
      if (err) {
        return res.json({ text: 'Error leaving queue.' });
      }
      res.json({ text: '👋 You\'ve left the matchmaking queue.' });
    });
  });
}

function handleStatsCommand(userId, res) {
  db.getPlayerBySlackId(userId, (err, player) => {
    if (err || !player) {
      return res.json({ text: 'Player not found!' });
    }
    
    const weekStart = db.getWeekStart(new Date());
    db.getWeeklyStats(player.id, weekStart, (err, stats) => {
      if (err) {
        return res.json({ text: 'Error fetching stats.' });
      }
      
      const { wins, losses } = stats[0];
      res.json({
        text: `📊 Your stats this week:\n🏆 Wins: ${wins}\n💀 Losses: ${losses}\n🎯 Games played: ${wins + losses}`
      });
    });
  });
}

function handleLeaderboardCommand(userId, res) {
  db.getPlayerBySlackId(userId, (err, player) => {
    if (err || !player) {
      return res.json({ text: 'Player not found!' });
    }
    
    db.getLeaderboard(player.office, (err, leaderboard) => {
      if (err) {
        return res.json({ text: 'Error fetching leaderboard.' });
      }
      
      let message = `🏆 ${player.office.toUpperCase()} OFFICE LEADERBOARD 🏆\n\n`;
      leaderboard.slice(0, 10).forEach((entry, index) => {
        const winRate = entry.total_games > 0 ? ((entry.wins / entry.total_games) * 100).toFixed(1) : '0.0';
        message += `${index + 1}. ${entry.name} - ${entry.wins}W/${entry.losses}L (${winRate}%)\n`;
      });
      
      res.json({ text: message });
    });
  });
}

module.exports = router;
