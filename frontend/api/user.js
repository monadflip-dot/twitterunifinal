import jwt from 'jsonwebtoken';
import { db } from './firebase-admin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get JWT from Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify JWT
    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) {
      console.error('❌ SESSION_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, sessionSecret);
    
    try {
      // Get user data from Firestore
      const userRef = db.collection('users').doc(decoded.id);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userData = userDoc.data();
      
      // Get user progress
      const progressRef = db.collection('userProgress').doc(decoded.id);
      const progressDoc = await progressRef.get();
      
      let progress = {
        completedMissions: [],
        totalPoints: 0,
        lastUpdated: null
      };
      
      if (progressDoc.exists) {
        progress = progressDoc.data();
      }
      
      // Combine user data with progress
      const userWithProgress = {
        ...userData,
        stats: {
          totalPoints: progress.totalPoints || 0,
          completedMissions: progress.completedMissions?.length || 0,
          totalMissions: 7, // Total missions available
          pendingMissions: 7 - (progress.completedMissions?.length || 0)
        }
      };
      
      console.log('✅ User data loaded from Firebase:', userData.username);
      return res.json({ user: userWithProgress });
      
    } catch (firebaseError) {
      console.error('❌ Firebase error loading user data:', firebaseError);
      // Fallback to JWT data if Firebase fails
      return res.json({ 
        user: {
          ...decoded,
          stats: {
            totalPoints: 0,
            completedMissions: 0,
            totalMissions: 7,
            pendingMissions: 7
          },
          warning: 'Using cached data due to Firebase connection issue'
        }
      });
    }
    
  } catch (error) {
    console.error('❌ JWT verification error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
