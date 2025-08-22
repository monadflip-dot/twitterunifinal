import jwt from 'jsonwebtoken';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key');
    
    // Get user progress from Firestore
    const userProgressRef = db.collection('userProgress').doc(decoded.id);
    const userProgressDoc = await userProgressRef.get();
    
    let completedMissions = [];
    let totalPoints = 0;
    
    if (userProgressDoc.exists) {
      const data = userProgressDoc.data();
      completedMissions = data.completedMissions || [];
      totalPoints = data.totalPoints || 0;
    }
    
    const stats = {
      totalPoints,
      completedMissions: completedMissions.length,
      totalMissions: 4, // Total missions available
      pendingMissions: 4 - completedMissions.length
    };
    
    return res.json(stats);
    
  } catch (error) {
    console.error('Stats error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
