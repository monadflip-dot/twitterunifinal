// Dynamic database layer: prefers Firebase Firestore; falls back to SQLite if not configured
let useFirestore = false;
let admin = null;
let firestoreDb = null;

try {
	// Try to load Firebase Admin
	({ admin, db: firestoreDb } = require('./firebase-admin'));
	useFirestore = !!firestoreDb;
	console.log('✅ Database: Using Firebase Firestore');
} catch (err) {
	console.warn('⚠️ Firebase not configured. Falling back to SQLite.', err?.message || err);
}

// Firestore implementation
if (useFirestore) {
	const { FieldValue } = admin.firestore;

	const dbHelpers = {
		createOrUpdateUser: async ({ id, username, displayName, photo, accessToken }) => {
			await firestoreDb.collection('users').doc(id).set({
				id,
				username,
				displayName,
				photo: photo || null,
				accessToken: accessToken || '',
				updatedAt: FieldValue.serverTimestamp()
			}, { merge: true });
			return id;
		},

		getUserProgress: async (userId) => {
			const snap = await firestoreDb.collection('user_progress')
				.where('userId', '==', userId)
				.orderBy('completedAt', 'desc')
				.get();
			return snap.docs.map(d => d.data());
		},

		getUserStats: async (userId) => {
			const ref = firestoreDb.collection('user_stats').doc(userId);
			const doc = await ref.get();
			if (!doc.exists) return { userId, totalPoints: 0, completedMissions: 0 };
			return doc.data();
		},

		completeMission: async (userId, missionId, points) => {
			const progressRef = firestoreDb.collection('user_progress').doc(`${userId}_${missionId}`);
			const statsRef = firestoreDb.collection('user_stats').doc(userId);
			await firestoreDb.runTransaction(async (tx) => {
				const progressDoc = await tx.get(progressRef);
				if (progressDoc.exists) {
					// Already completed: no-op
					return;
				}
				tx.set(progressRef, {
					id: `${userId}_${missionId}`,
					userId,
					missionId,
					pointsEarned: points,
					completedAt: FieldValue.serverTimestamp()
				});

				const statsDoc = await tx.get(statsRef);
				if (statsDoc.exists) {
					tx.update(statsRef, {
						totalPoints: FieldValue.increment(points),
						completedMissions: FieldValue.increment(1),
						lastUpdated: FieldValue.serverTimestamp()
					});
				} else {
					tx.set(statsRef, {
						userId,
						totalPoints: points,
						completedMissions: 1,
						lastUpdated: FieldValue.serverTimestamp()
					});
				}
			});
			return true;
		},

		getLeaderboard: async (limit = 10) => {
			const snap = await firestoreDb.collection('user_stats')
				.orderBy('totalPoints', 'desc')
				.orderBy('completedMissions', 'desc')
				.limit(limit)
				.get();
			// Join with user profiles
			const rows = [];
			for (const doc of snap.docs) {
				const s = doc.data();
				const uDoc = await firestoreDb.collection('users').doc(s.userId).get();
				const u = uDoc.exists ? uDoc.data() : { username: 'user', displayName: 'User', photo: null };
				rows.push({
					username: u.username,
					displayName: u.displayName,
					photo: u.photo || null,
					totalPoints: s.totalPoints || 0,
					completedMissions: s.completedMissions || 0
				});
			}
			return rows;
		}
	};

	module.exports = { db: null, dbHelpers };
	return;
}

// =========================
// SQLite fallback
// =========================
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
		if (err) console.error('❌ Error creating users table:', err.message);
	});

	// User progress
	db.run(`CREATE TABLE IF NOT EXISTS user_progress (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		userId TEXT NOT NULL,
		missionId INTEGER NOT NULL,
		completedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
		pointsEarned INTEGER NOT NULL,
		UNIQUE(userId, missionId)
	)`, (err) => {
		if (err) console.error('❌ Error creating user_progress table:', err.message);
	});

	// User stats
	db.run(`CREATE TABLE IF NOT EXISTS user_stats (
		userId TEXT PRIMARY KEY,
		totalPoints INTEGER DEFAULT 0,
		completedMissions INTEGER DEFAULT 0,
		lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP
	)`, (err) => {
		if (err) console.error('❌ Error creating user_stats table:', err.message);
	});
}

const dbHelpers = {
	createOrUpdateUser: (userData) => {
		return new Promise((resolve, reject) => {
			const { id, username, displayName, photo, accessToken } = userData;
			db.run(`INSERT OR REPLACE INTO users (id, username, displayName, photo, accessToken) VALUES (?, ?, ?, ?, ?)`,
				[id, username, displayName, photo, accessToken],
				function (err) {
					if (err) return reject(err);
					resolve(this.lastID);
				}
			);
		});
	},

	getUserProgress: (userId) => {
		return new Promise((resolve, reject) => {
			db.all(`SELECT * FROM user_progress WHERE userId = ? ORDER BY completedAt DESC`, [userId], (err, rows) => {
				if (err) return reject(err);
				resolve(rows);
			});
		});
	},

	getUserStats: (userId) => {
		return new Promise((resolve, reject) => {
			db.get(`SELECT * FROM user_stats WHERE userId = ?`, [userId], (err, row) => {
				if (err) return reject(err);
				resolve(row || { userId, totalPoints: 0, completedMissions: 0 });
			});
		});
	},

	completeMission: (userId, missionId, points) => {
		return new Promise((resolve, reject) => {
			db.serialize(() => {
				db.run('BEGIN TRANSACTION');
				db.run(`INSERT OR REPLACE INTO user_progress (userId, missionId, pointsEarned) VALUES (?, ?, ?)`, [userId, missionId, points], function (err) {
					if (err) { db.run('ROLLBACK'); return reject(err); }
					db.run(`INSERT OR REPLACE INTO user_stats (userId, totalPoints, completedMissions) VALUES (?, COALESCE((SELECT SUM(pointsEarned) FROM user_progress WHERE userId = ?), 0), (SELECT COUNT(*) FROM user_progress WHERE userId = ?))`, [userId, userId, userId], function (err) {
						if (err) { db.run('ROLLBACK'); return reject(err); }
						db.run('COMMIT', function (err) {
							if (err) return reject(err);
							resolve(true);
						});
					});
				});
			});
		});
	},

	getLeaderboard: (limit = 10) => {
		return new Promise((resolve, reject) => {
			db.all(`SELECT u.username, u.displayName, u.photo, s.totalPoints, s.completedMissions FROM users u JOIN user_stats s ON u.id = s.userId ORDER BY s.totalPoints DESC, s.completedMissions DESC LIMIT ?`, [limit], (err, rows) => {
				if (err) return reject(err);
				resolve(rows);
			});
		});
	}
};

module.exports = { db, dbHelpers };
