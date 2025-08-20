// Database helpers using Firestore. Identity is based on Firebase UID passed as userId.
const { admin, db: firestoreDb } = require('./firebase-admin');

if (!firestoreDb) {
	console.error('❌ Firebase Firestore is not configured. Ensure FIREBASE_SERVICE_ACCOUNT is set.');
	throw new Error('Firebase Firestore is not configured. Ensure FIREBASE_SERVICE_ACCOUNT is set.');
}

const { FieldValue } = admin.firestore;

const dbHelpers = {
	createOrUpdateUser: async ({ id, username, displayName, photo, accessToken }) => {
		try {
			console.log('💾 Creating/updating user:', { id, username, displayName });
			await firestoreDb.collection('users').doc(id).set({
				id,
				username,
				displayName,
				photo: photo || null,
				accessToken: accessToken || '',
				updatedAt: FieldValue.serverTimestamp()
			}, { merge: true });
			console.log('✅ User saved successfully');
			return id;
		} catch (error) {
			console.error('❌ Error saving user to database:', error);
			throw error;
		}
	},

	getUserProgress: async (userId) => {
		try {
			console.log('📊 Getting user progress for:', userId);
			const snap = await firestoreDb.collection('user_progress')
				.where('userId', '==', userId)
				.orderBy('completedAt', 'desc')
				.get();
			const progress = snap.docs.map(d => d.data());
			console.log(`✅ Found ${progress.length} progress records`);
			return progress;
		} catch (error) {
			console.error('❌ Error getting user progress:', error);
			// Return empty array instead of throwing to prevent 502 errors
			return [];
		}
	},

	getUserStats: async (userId) => {
		try {
			console.log('📈 Getting user stats for:', userId);
			const ref = firestoreDb.collection('user_stats').doc(userId);
			const doc = await ref.get();
			if (!doc.exists) {
				console.log('📊 No stats found, returning default');
				return { userId, totalPoints: 0, completedMissions: 0 };
			}
			const stats = doc.data();
			console.log('✅ User stats retrieved:', stats);
			return stats;
		} catch (error) {
			console.error('❌ Error getting user stats:', error);
			// Return default stats instead of throwing
			return { userId, totalPoints: 0, completedMissions: 0 };
		}
	},

	completeMission: async (userId, missionId, points) => {
		try {
			console.log(`🎯 Completing mission: ${missionId} for user: ${userId}, points: ${points}`);
			const progressRef = firestoreDb.collection('user_progress').doc(`${userId}_${missionId}`);
			const statsRef = firestoreDb.collection('user_stats').doc(userId);
			
			await firestoreDb.runTransaction(async (tx) => {
				// READS FIRST
				const [progressDoc, statsDoc] = await Promise.all([
					tx.get(progressRef),
					tx.get(statsRef)
				]);

				if (progressDoc.exists) {
					console.log('⚠️ Mission already completed, skipping');
					return;
				}

				tx.set(progressRef, {
					id: `${userId}_${missionId}`,
					userId,
					missionId,
					pointsEarned: points,
					completedAt: FieldValue.serverTimestamp()
				});

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
			
			console.log('✅ Mission completed and saved to database');
			return true;
		} catch (error) {
			console.error('❌ Error completing mission:', error);
			throw error;
		}
	},

	getLeaderboard: async (limit = 10) => {
		try {
			console.log('🏆 Getting leaderboard, limit:', limit);
			const snap = await firestoreDb.collection('user_stats')
				.orderBy('totalPoints', 'desc')
				.orderBy('completedMissions', 'desc')
				.limit(limit)
				.get();
			
			const rows = [];
			for (const doc of snap.docs) {
				try {
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
				} catch (userError) {
					console.error('⚠️ Error getting user data for leaderboard:', userError);
					// Continue with other users
				}
			}
			
			console.log(`✅ Leaderboard retrieved with ${rows.length} users`);
			return rows;
		} catch (error) {
			console.error('❌ Error getting leaderboard:', error);
			// Return empty leaderboard instead of throwing
			return [];
		}
	}
};

module.exports = { db: firestoreDb, dbHelpers };
