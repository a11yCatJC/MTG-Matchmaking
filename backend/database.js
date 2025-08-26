const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, 'tournament.db'));
    this.init();
  }

  init() {
    this.db.serialize(() => {
      // Players table with avatar_url
      this.db.run(`
        CREATE TABLE IF NOT EXISTS players (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT,
          slack_user_id TEXT UNIQUE,
          office TEXT NOT NULL,
          avatar_url TEXT,
          join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1
        )
      `);

      // Matches table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS matches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          player1_id INTEGER,
          player2_id INTEGER,
          winner_id INTEGER,
          match_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          week_start DATE,
          status TEXT DEFAULT 'pending',
          FOREIGN KEY (player1_id) REFERENCES players(id),
          FOREIGN KEY (player2_id) REFERENCES players(id),
          FOREIGN KEY (winner_id) REFERENCES players(id)
        )
      `);

      // Matchmaking queue table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS matchmaking_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          player_id INTEGER,
          office TEXT,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (player_id) REFERENCES players(id)
        )
      `);

      // Prizes table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS prizes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          player_id INTEGER,
          prize_type TEXT,
          week_start DATE,
          earned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          claimed BOOLEAN DEFAULT 0,
          FOREIGN KEY (player_id) REFERENCES players(id)
        )
      `);

      // Check if avatar_url column exists, add it if it doesn't
      this.db.all("PRAGMA table_info(players)", (err, columns) => {
        if (!err && !columns.find(col => col.name === 'avatar_url')) {
          this.db.run("ALTER TABLE players ADD COLUMN avatar_url TEXT");
        }
      });

      // Insert sample data
      this.insertSampleData();
    });
  }

  insertSampleData() {
    const samplePlayers = [
      ['Alice Johnson', 'alice@company.com', 'U01234567', 'chicago', null],
      ['Bob Smith', 'bob@company.com', 'U01234568', 'chicago', null],
      ['Carol Davis', 'carol@company.com', 'U01234569', 'new york', null],
      ['David Wilson', 'david@company.com', 'U01234570', 'new york', null],
      ['Eve Brown', 'eve@company.com', 'U01234571', 'tempe', null],
      ['Frank Miller', 'frank@company.com', 'U01234572', 'tempe', null]
    ];

    this.db.get("SELECT COUNT(*) as count FROM players", (err, row) => {
      if (row.count === 0) {
        const stmt = this.db.prepare("INSERT INTO players (name, email, slack_user_id, office, avatar_url) VALUES (?, ?, ?, ?, ?)");
        samplePlayers.forEach(player => {
          stmt.run(player);
        });
        stmt.finalize();
      }
    });
  }

  // Player methods
  getAllPlayers(callback) {
    this.db.all("SELECT * FROM players WHERE is_active = 1", callback);
  }

  getPlayersByOffice(office, callback) {
    this.db.all("SELECT * FROM players WHERE office = ? AND is_active = 1", [office], callback);
  }

  getPlayerById(id, callback) {
    this.db.get("SELECT * FROM players WHERE id = ?", [id], callback);
  }

  getPlayerBySlackId(slackId, callback) {
    this.db.get("SELECT * FROM players WHERE slack_user_id = ?", [slackId], callback);
  }

  addPlayer(player, callback) {
    const { name, email, slack_user_id, office, avatar_url } = player;
    this.db.run(
      "INSERT INTO players (name, email, slack_user_id, office, avatar_url) VALUES (?, ?, ?, ?, ?)",
      [name, email, slack_user_id, office, avatar_url],
      callback
    );
  }

  updatePlayerAvatar(playerId, avatarUrl, callback) {
    this.db.run(
      "UPDATE players SET avatar_url = ? WHERE id = ?",
      [avatarUrl, playerId],
      callback
    );
  }

  updatePlayer(playerId, updates, callback) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(playerId);
    
    this.db.run(
      `UPDATE players SET ${fields} WHERE id = ?`,
      values,
      callback
    );
  }

  // Queue methods
  addToQueue(playerId, office, callback) {
    this.db.run(
      "INSERT INTO matchmaking_queue (player_id, office) VALUES (?, ?)",
      [playerId, office],
      callback
    );
  }

  removeFromQueue(playerId, callback) {
    this.db.run("DELETE FROM matchmaking_queue WHERE player_id = ?", [playerId], callback);
  }

  getQueueByOffice(office, callback) {
    this.db.all(`
      SELECT mq.*, p.name, p.slack_user_id, p.avatar_url
      FROM matchmaking_queue mq 
      JOIN players p ON mq.player_id = p.id 
      WHERE mq.office = ?
    `, [office], callback);
  }

  // Match methods
  createMatch(player1Id, player2Id, callback) {
    const weekStart = this.getWeekStart(new Date());
    this.db.run(
      "INSERT INTO matches (player1_id, player2_id, week_start) VALUES (?, ?, ?)",
      [player1Id, player2Id, weekStart],
      callback
    );
  }

  reportMatch(matchId, winnerId, callback) {
    this.db.run(
      "UPDATE matches SET winner_id = ?, status = 'completed' WHERE id = ?",
      [winnerId, matchId],
      (err) => {
        if (err) return callback(err);
        this.checkPrizeEligibility(winnerId, callback);
      }
    );
  }

  getWeeklyStats(playerId, weekStart, callback) {
    this.db.all(`
      SELECT 
        COUNT(CASE WHEN winner_id = ? THEN 1 END) as wins,
        COUNT(CASE WHEN winner_id != ? AND winner_id IS NOT NULL THEN 1 END) as losses
      FROM matches 
      WHERE (player1_id = ? OR player2_id = ?) 
      AND week_start = ? 
      AND status = 'completed'
    `, [playerId, playerId, playerId, playerId, weekStart], callback);
  }

  checkPrizeEligibility(playerId, callback) {
    const weekStart = this.getWeekStart(new Date());
    
    this.getWeeklyStats(playerId, weekStart, (err, stats) => {
      if (err) return callback(err);
      
      const { wins, losses } = stats[0];
      
      if (wins >= 3 || losses >= 3) {
        const prizeType = wins >= 3 ? '3_wins' : '3_losses';
        
        // Check if prize already awarded this week
        this.db.get(
          "SELECT * FROM prizes WHERE player_id = ? AND week_start = ? AND prize_type = ?",
          [playerId, weekStart, prizeType],
          (err, existingPrize) => {
            if (!existingPrize) {
              this.db.run(
                "INSERT INTO prizes (player_id, prize_type, week_start) VALUES (?, ?, ?)",
                [playerId, prizeType, weekStart],
                () => {
                  callback(null, { eligible: true, prizeType, wins, losses });
                }
              );
            } else {
              callback(null, { eligible: false, wins, losses });
            }
          }
        );
      } else {
        callback(null, { eligible: false, wins, losses });
      }
    });
  }

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  }

  getLeaderboard(office, callback) {
    let query = `
      SELECT 
        p.id,
        p.name,
        p.office,
        p.avatar_url,
        COUNT(CASE WHEN m.winner_id = p.id THEN 1 END) as wins,
        COUNT(CASE WHEN (m.player1_id = p.id OR m.player2_id = p.id) AND m.winner_id != p.id AND m.winner_id IS NOT NULL THEN 1 END) as losses,
        COUNT(CASE WHEN m.player1_id = p.id OR m.player2_id = p.id THEN 1 END) as total_games
      FROM players p
      LEFT JOIN matches m ON (p.id = m.player1_id OR p.id = m.player2_id) AND m.status = 'completed'
      WHERE p.is_active = 1
    `;
    
    const params = [];
    if (office) {
      query += " AND p.office = ?";
      params.push(office);
    }
    
    query += " GROUP BY p.id ORDER BY wins DESC, total_games DESC";
    
    this.db.all(query, params, callback);
  }

  getRecentMatches(limit = 10, callback) {
    this.db.all(`
      SELECT 
        m.*,
        p1.name as player1_name,
        p1.avatar_url as player1_avatar,
        p2.name as player2_name,
        p2.avatar_url as player2_avatar,
        winner.name as winner_name,
        winner.avatar_url as winner_avatar
      FROM matches m
      JOIN players p1 ON m.player1_id = p1.id
      JOIN players p2 ON m.player2_id = p2.id
      LEFT JOIN players winner ON m.winner_id = winner.id
      WHERE m.status = 'completed'
      ORDER BY m.match_date DESC
      LIMIT ?
    `, [limit], callback);
  }
}

module.exports = new Database();
