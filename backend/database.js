const { admin, db: firestoreDb } = require('./firebase-admin');

if (!firestoreDb) {
	throw new Error('Firebase Firestore is not configured. Ensure FIREBASE_SERVICE_ACCOUNT is set.');
}

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
			// READS FIRST
			const [progressDoc, statsDoc] = await Promise.all([
				tx.get(progressRef),
				tx.get(statsRef)
			]);

			// If already completed, no writes needed
			if (progressDoc.exists) {
				return;
			}

			// WRITES AFTER ALL READS
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
		return true;
	},

	getLeaderboard: async (limit = 10) => {
		const snap = await firestoreDb.collection('user_stats')
			.orderBy('totalPoints', 'desc')
			.orderBy('completedMissions', 'desc')
			.limit(limit)
			.get();
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

module.exports = { db: firestoreDb, dbHelpers };
