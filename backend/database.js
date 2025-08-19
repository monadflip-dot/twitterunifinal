const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'missions.db');

// Create/connect to database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    displayName TEXT NOT NULL,
    photo TEXT,
    accessToken TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('❌ Error creating users table:', err.message);
    } else {
      console.log('✅ Users table ready');
    }
  });

  // User progress table
  db.run(`CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    missionId INTEGER NOT NULL,
    completedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    pointsEarned INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES users (id),
    UNIQUE(userId, missionId)
  )`, (err) => {
    if (err) {
      console.error('❌ Error creating user_progress table:', err.message);
    } else {
      console.log('✅ User progress table ready');
    }
  });

  // User stats table
  db.run(`CREATE TABLE IF NOT EXISTS user_stats (
    userId TEXT PRIMARY KEY,
    totalPoints INTEGER DEFAULT 0,
    completedMissions INTEGER DEFAULT 0,
    lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users (id)
  )`, (err) => {
    if (err) {
      console.error('❌ Error creating user_stats table:', err.message);
    } else {
      console.log('✅ User stats table ready');
    }
  });
}

// Database helper functions
const dbHelpers = {
  // Create or update user
  createOrUpdateUser: (userData) => {
    return new Promise((resolve, reject) => {
      const { id, username, displayName, photo, accessToken } = userData;
      
      db.run(`INSERT OR REPLACE INTO users (id, username, displayName, photo, accessToken) 
              VALUES (?, ?, ?, ?, ?)`, 
        [id, username, displayName, photo, accessToken], 
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  },

  // Get user progress
  getUserProgress: (userId) => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM user_progress WHERE userId = ? ORDER BY completedAt DESC`, 
        [userId], 
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  },

  // Get user stats
  getUserStats: (userId) => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM user_stats WHERE userId = ?`, 
        [userId], 
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row || { userId, totalPoints: 0, completedMissions: 0 });
          }
        }
      );
    });
  },

  // Complete mission and update stats
  completeMission: (userId, missionId, points) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Start transaction
        db.run('BEGIN TRANSACTION');
        
        // Insert mission completion
        db.run(`INSERT OR REPLACE INTO user_progress (userId, missionId, pointsEarned) 
                VALUES (?, ?, ?)`, 
          [userId, missionId, points], 
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              reject(err);
              return;
            }
            
            // Update or create user stats
            db.run(`INSERT OR REPLACE INTO user_stats (userId, totalPoints, completedMissions) 
                    VALUES (?, 
                      COALESCE((SELECT SUM(pointsEarned) FROM user_progress WHERE userId = ?), 0),
                      (SELECT COUNT(*) FROM user_progress WHERE userId = ?)
                    )`, 
              [userId, userId, userId], 
              function(err) {
                if (err) {
                  db.run('ROLLBACK');
                  reject(err);
                  return;
                }
                
                // Commit transaction
                db.run('COMMIT', function(err) {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(true);
                  }
                });
              }
            );
          }
        );
      });
    });
  },

  // Get leaderboard
  getLeaderboard: (limit = 10) => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT u.username, u.displayName, u.photo, s.totalPoints, s.completedMissions
              FROM users u
              JOIN user_stats s ON u.id = s.userId
              ORDER BY s.totalPoints DESC, s.completedMissions DESC
              LIMIT ?`, 
        [limit], 
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }
};

module.exports = { db, dbHelpers };
