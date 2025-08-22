import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import jwt from 'jsonwebtoken';

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

const auth = getAuth();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { idToken, twitterAccessToken, twitterAccessSecret, profile } = req.body || {};
    
    if (!idToken) {
      return res.status(400).json({ error: 'Missing Firebase ID token' });
    }

    // Verify Firebase ID token
    const decoded = await auth.verifyIdToken(idToken);
    
    // Build user object
    const user = {
      id: decoded.uid,
      username: profile?.screenName || profile?.screen_name || decoded.name || (decoded.uid ? decoded.uid.slice(0, 8) : 'user'),
      displayName: profile?.displayName || profile?.name || decoded.name || 'User',
      photo: profile?.photoURL || decoded.picture || null,
      accessToken: twitterAccessToken || null,
      accessSecret: twitterAccessSecret || null,
      twitter: {
        id: profile?.id_str || profile?.id || null,
        screenName: profile?.screenName || profile?.screen_name || null
      }
    };

    // Issue JWT session token
    const token = jwt.sign(user, process.env.SESSION_SECRET || 'your-secret-key', { expiresIn: '24h' });
    
    return res.json({ success: true, user, token });
    
  } catch (err) {
    console.error('Firebase auth error:', err);
    return res.status(401).json({ error: 'Firebase auth failed' });
  }
}
