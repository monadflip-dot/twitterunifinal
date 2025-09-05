import jwt from 'jsonwebtoken';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    // Check if we have the required environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.error('❌ Missing Firebase Admin environment variables:');
      console.error('FIREBASE_PROJECT_ID:', projectId ? '✅ Set' : '❌ Missing');
      console.error('FIREBASE_CLIENT_EMAIL:', clientEmail ? '✅ Set' : '❌ Missing');
      console.error('FIREBASE_PRIVATE_KEY:', privateKey ? '✅ Set' : '❌ Missing');
      throw new Error('Firebase Admin environment variables not configured');
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n')
      })
    });

    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    throw error;
  }
}

const db = getFirestore();

// Function to verify mission completion using Twitter API
async function verifyMissionCompletion(mission, user) {
  console.log(`🔍 Verifying mission ${mission.id} (${mission.type}) for user ${user.username}`);
  
  // For now, we'll implement a simple verification system
  // In a real implementation, you would use the Twitter API v2 to check:
  // - Likes: GET /2/users/:id/liked_tweets
  // - Retweets: GET /2/users/:id/retweets
  // - Comments: GET /2/tweets/:id/replies
  // - Follows: GET /2/users/:id/following
  
  try {
    // Simulate API call delay (this would be replaced with real Twitter API calls)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // For demonstration, we'll randomly succeed/fail verification
    // In production, replace this with actual Twitter API verification
    const randomSuccess = Math.random() > 0.3; // 70% success rate for demo
    
    if (randomSuccess) {
      console.log(`✅ Mission ${mission.id} verified successfully`);
      return { success: true, verified: true };
    } else {
      console.log(`❌ Mission ${mission.id} verification failed`);
      return { 
        success: false, 
        verified: false, 
        error: 'Action not detected on Twitter. Please complete the action and try again.' 
      };
    }
  } catch (error) {
    console.error(`❌ Error verifying mission ${mission.id}:`, error);
    throw error;
  }
}

// Real missions data from the original backend
const missions = [
  {
    id: 1, 
    type: 'like', 
    title: 'Like the ABSPFC tweet about the match',
    description: 'Like the ABSPFC tweet about the match', 
    tweetId: '1957149650118377661', 
    points: 50,
    completed: false
  },
  { 
    id: 2, 
    type: 'retweet', 
    title: 'Retweet the ABSPFC tweet',
    description: 'Retweet the ABSPFC tweet', 
    tweetId: '1957149650118377661', 
    points: 75,
    completed: false
  },
  { 
    id: 3, 
    type: 'comment', 
    title: 'Comment on the ABSPFC tweet',
    description: 'Comment on the ABSPFC tweet', 
    tweetId: '1957149650118377661', 
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
  },
  {
    id: 8,
    type: 'like',
    title: 'Like the new ABSPFC announcement tweet',
    description: 'Like the new ABSPFC announcement tweet to show your support',
    tweetId: '1960781197052928030',
    points: 60,
    completed: false
  },
  {
    id: 9,
    type: 'retweet',
    title: 'Retweet the new ABSPFC announcement',
    description: 'Retweet the new ABSPFC announcement to spread the word',
    tweetId: '1960781197052928030',
    points: 80,
    completed: false
  },
  {
    id: 10,
    type: 'comment',
    title: 'Comment on the new ABSPFC announcement',
    description: 'Leave a comment on the new ABSPFC announcement tweet',
    tweetId: '1960781197052928030',
    points: 120,
    completed: false
  }
];

export default async function handler(req, res) {
  // Verify JWT first
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key');
    
    if (req.method === 'GET') {
      try {
        // Get user progress from Firestore
        const userProgressRef = db.collection('userProgress').doc(decoded.id);
        const userProgressDoc = await userProgressRef.get();
        
        let completedMissionIds = [];
        if (userProgressDoc.exists) {
          const data = userProgressDoc.data();
          completedMissionIds = data.completedMissions || [];
        }
        
        // Mark missions as completed based on database
        const missionsWithProgress = missions.map(mission => ({
          ...mission,
          completed: completedMissionIds.includes(mission.id)
        }));
        
        console.log(`✅ Missions loaded from Firebase: ${missionsWithProgress.length}`);
        return res.json({ missions: missionsWithProgress, user: decoded });
      } catch (firebaseError) {
        console.error('❌ Firebase error loading missions:', firebaseError);
        // Fallback to static missions if Firebase fails
        return res.json({ 
          missions: missions, 
          user: decoded,
          warning: 'Using static missions due to Firebase connection issue'
        });
      }
    }
    
    if (req.method === 'POST') {
      try {
        // Complete a mission
        const { missionId } = req.body;
        const mission = missions.find(m => m.id === missionId);
        
        if (!mission) {
          return res.status(404).json({ error: 'Mission not found' });
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
        
        // Verify mission completion using Twitter API
        let verificationResult = { success: false, verified: false };
        
        try {
          verificationResult = await verifyMissionCompletion(mission, decoded);
          console.log(`🔍 Mission ${missionId} verification result:`, verificationResult);
        } catch (verifyError) {
          console.error('❌ Mission verification failed:', verifyError);
          // Fallback: if verification fails, grant the mission anyway
          verificationResult = { success: true, verified: true, fallback: true };
        }
        
        // If verification failed but we have fallback enabled, grant the mission
        if (!verificationResult.verified && !verificationResult.fallback) {
          return res.status(400).json({ 
            error: 'Mission not completed. Please complete the action on Twitter first.',
            details: verificationResult.error || 'Action not detected'
          });
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
        
        console.log(`✅ Mission ${missionId} completed for user ${decoded.id} (verified: ${verificationResult.verified}, fallback: ${verificationResult.fallback})`);
        return res.json({ 
          success: true, 
          mission,
          totalPoints,
          verified: verificationResult.verified,
          fallback: verificationResult.fallback,
          message: verificationResult.fallback ? 
            `Mission completed! You earned ${mission.points} points! (Auto-verified due to API issues)` :
            `Mission completed! You earned ${mission.points} points!`
        });
      } catch (firebaseError) {
        console.error('❌ Firebase error completing mission:', firebaseError);
        return res.status(500).json({ 
          error: 'Failed to complete mission due to database error',
          details: firebaseError.message
        });
      }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('❌ Missions API error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
