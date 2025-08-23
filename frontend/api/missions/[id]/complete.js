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

// Real missions data
const missions = [
  {
    id: 1, 
    type: 'like', 
    title: 'Like the ABSPFC tweet about the match',
    description: 'Like the ABSPFC tweet about the match', 
    tweetId: '1957140118377661', 
    points: 50,
    completed: false
  },
  { 
    id: 2, 
    type: 'retweet', 
    title: 'Retweet the ABSPFC tweet',
    description: 'Retweet the ABSPFC tweet', 
    tweetId: '1957140118377661', 
    points: 75,
    completed: false
  },
  { 
    id: 3, 
    type: 'comment', 
    title: 'Comment on the ABSPFC tweet',
    description: 'Comment on the ABSPFC tweet', 
    tweetId: '1957140118377661', 
    points: 100,
    completed: false
  },
  {
    id: 4,
    type: 'follow',
    title: 'Follow the official ABSPFC account on Twitter',
    description: 'Follow the official ABSPFC account on Twitter',
    targetUserId: 'ABSPFC',
    points: 150,
    completed: false
  },
  {
    id: 5, 
    type: 'like', 
    title: 'Like the latest ABSPFC tweet',
    description: 'Like the latest ABSPFC tweet', 
    tweetId: '1959220121584513532', 
    points: 50,
    completed: false
  },
  { 
    id: 6, 
    type: 'retweet', 
    title: 'Retweet the latest ABSPFC tweet',
    description: 'Retweet the latest ABSPFC tweet', 
    tweetId: '1959220121584513532', 
    points: 75,
    completed: false
  },
  { 
    id: 7, 
    type: 'comment', 
    title: 'Comment on the latest ABSPFC tweet',
    description: 'Comment on the latest ABSPFC tweet', 
    tweetId: '1959220121584513532', 
    points: 100,
    completed: false
  }
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key');
    const missionId = parseInt(req.query.id, 10);
    
    // Find mission
    const mission = missions.find(m => m.id === missionId);
    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    // Check if user has Twitter credentials
    if (!decoded.accessToken) {
      return res.status(403).json({ 
        error: 'Twitter access token not available. Please reconnect your Twitter account.',
        details: 'User needs to re-authenticate with Twitter'
      });
    }

    // Check if already completed
    const userProgressRef = db.collection('userProgress').doc(decoded.id);
    const userProgressDoc = await userProgressRef.get();
    
    let completedMissions = [];
    let totalPoints = 0;
    
    if (userProgressDoc.exists) {
      const data = userProgressDoc.data();
      completedMissions = data.completedMissions || [];
      totalPoints = data.totalPoints || 0;
    }
    
    if (completedMissions.includes(missionId)) {
      return res.status(400).json({ error: 'Mission already completed' });
    }
    
    // Add mission to completed list and update points
    completedMissions.push(missionId);
    totalPoints += mission.points;
    
    // Save to Firestore
    await userProgressRef.set({
      userId: decoded.id,
      completedMissions,
      totalPoints,
      lastUpdated: new Date()
    }, { merge: true });
    
    console.log(`Mission ${missionId} completed by user ${decoded.id}`);

    return res.json({ 
      success: true, 
      missionId, 
      type: mission.type, 
      points: mission.points,
      totalPoints,
      message: 'Mission completed successfully!'
    });

  } catch (error) {
    console.error('Mission completion error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
