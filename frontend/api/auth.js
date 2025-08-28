import jwt from 'jsonwebtoken';
import { getAuth } from 'firebase-admin/auth';
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { idToken, twitterAccessToken, twitterAccessSecret, profile } = req.body || {};
    
    if (!idToken) {
      return res.status(400).json({ error: 'Missing Firebase ID token' });
    }

    try {
      // Verify Firebase ID token
      const decodedToken = await getAuth().verifyIdToken(idToken);
      
      // Build user object with Firebase data
      const user = {
        id: decodedToken.uid,
        username: profile?.screenName || profile?.screen_name || profile?.displayName || decodedToken.name || 'user',
        displayName: profile?.displayName || profile?.name || decodedToken.name || 'User',
        photo: profile?.photoURL || decodedToken.picture || null,
        email: decodedToken.email || profile?.email || null,
        accessToken: twitterAccessToken || null,
        accessSecret: twitterAccessSecret || null,
        twitter: {
          id: profile?.id_str || profile?.id || decodedToken.uid,
          screenName: profile?.screenName || profile?.screen_name || decodedToken.name || 'user'
        }
      };

      // Check if user exists in Firestore, if not create them
      const userRef = db.collection('users').doc(user.id);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        // Create new user
        await userRef.set({
          ...user,
          createdAt: new Date(),
          lastLogin: new Date(),
          totalPoints: 0,
          completedMissions: []
        });
        console.log('✅ New user created:', user.username);
      } else {
        // Update last login
        await userRef.update({
          lastLogin: new Date(),
          displayName: user.displayName,
          photo: user.photo
        });
        console.log('✅ Existing user logged in:', user.username);
      }

      // Generate JWT token
      const sessionSecret = process.env.SESSION_SECRET;
      if (!sessionSecret) {
        console.error('❌ SESSION_SECRET not configured');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const token = jwt.sign(user, sessionSecret, { expiresIn: '24h' });
      
      console.log('✅ Auth successful for user:', user.username);
      console.log('✅ Generated JWT token:', token.substring(0, 20) + '...');
      
      return res.json({ 
        success: true, 
        user, 
        token,
        message: 'Authentication successful'
      });
      
    } catch (firebaseError) {
      console.error('❌ Firebase token verification failed:', firebaseError);
      return res.status(401).json({ 
        error: 'Invalid Firebase token', 
        details: firebaseError.message 
      });
    }
    
  } catch (err) {
    console.error('❌ Auth error:', err);
    return res.status(500).json({ 
      error: 'Authentication failed', 
      details: err.message 
    });
  }
}
