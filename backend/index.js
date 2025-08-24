require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('./auth');
const missionsRouter = require('./missions');
const authRouter = require('./auth-routes');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const path = require('path');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const { dbHelpers } = require('./database');
const { auth: firebaseAdminAuth, db: firestoreDb } = require('./firebase-admin');
// const { allMissions } = require('./missions-data');

// Temporary hardcoded missions for debugging
const allMissions = [
  {
    id: 1, 
    type: 'like', 
    description: 'Like the ABSPFC tweet about the match', 
    tweetId: '1957149650118377661', 
    points: 50,
    completed: false
  },
  { 
    id: 2, 
    type: 'retweet', 
    description: 'Retweet the ABSPFC tweet', 
    tweetId: '1957149650118377661', 
    points: 75,
    completed: false
  },
  { 
    id: 3, 
    type: 'comment', 
    description: 'Comment on the ABSPFC tweet', 
    tweetId: '1957149650118377661', 
    points: 100,
    completed: false
  },
  {
    id: 4,
    type: 'follow',
    description: 'Follow the official ABSPFC account on Twitter',
    targetUserId: 'ABSPFC',
    points: 150,
    completed: false
  },
  {
    id: 5, 
    type: 'like', 
    description: 'Like the latest ABSPFC tweet', 
    tweetId: '1959220121584513532', 
    points: 50,
    completed: false
  },
  { 
    id: 6, 
    type: 'retweet', 
    description: 'Retweet the latest ABSPFC tweet', 
    tweetId: '1959220121584513532', 
    points: 75,
    completed: false
  },
  { 
    id: 7, 
    type: 'comment', 
    description: 'Comment on the latest ABSPFC tweet', 
    tweetId: '1959220121584513532', 
    points: 100,
    completed: false
  }
];

// Debug: Verify missions data import at server startup
console.log('🚀 Server starting - allMissions loaded successfully');
console.log('🚀 allMissions length:', allMissions.length);
console.log('🚀 allMissions IDs:', allMissions.map(m => m.id));
console.log('🚀 allMissions types:', allMissions.map(m => m.type));

const app = express();
const PORT = process.env.PORT || 3001;

// Temporary storage for OAuth state (works better with Render's multiple instances)
const oauthStates = new Map();

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'https://www.pfcwhitelist.xyz',
    'https://pfcwhitelist.xyz',
    'https://www.pfcwhitelist.xyz/',
    'https://pfcwhitelist.xyz/',
    'https://twitterunifinal.onrender.com',
    'https://twitterunifinal.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Middleware to verify JWT (restored from working version)
const authenticateJWT = (req, res, next) => {
  console.log('🔐 JWT Middleware executing...');
  console.log('🍪 Cookies received:', req.headers.cookie);
  
  const token = req.cookies?.jwt || req.headers.authorization?.split(' ')[1];
  
  console.log('🎫 Token found:', token ? 'YES' : 'NO');
  if (token) {
    console.log('🎫 Token (first 50 chars):', token.substring(0, 50) + '...');
  }
  
  if (!token) {
    console.log('❌ No token, returning 401');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    console.log('🔍 Verifying JWT...');
    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key');
    console.log('✅ JWT valid, user:', decoded.username);
    req.user = decoded;
    next();
  } catch (error) {
    console.log('❌ Error verifying JWT:', error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// 🔐 REGISTER ROUTES IN CORRECT ORDER
console.log('🔐 Registering routes...');

// 1. AUTH ROUTES (must be first)
app.use('/api/auth', authRouter);
console.log('✅ Auth routes registered at /api/auth');

// 2. PROTECTED ROUTES (after auth)
app.use('/api/missions', authenticateJWT, missionsRouter);
console.log('✅ Protected routes registered at /api/missions');

// 3. PUBLIC ROUTES (last)
// User info endpoint
app.get('/api/user', authenticateJWT, async (req, res) => {
  try {
    const { id: userId } = req.user;
    console.log('👤 User info requested for:', userId);
    
    // Get user progress and stats
    const userProgress = await dbHelpers.getUserProgress(userId);
    const userStats = await dbHelpers.getUserStats(userId);
    
    // Combine user info from JWT with progress/stats
    const userInfo = {
      ...req.user,
      progress: userProgress,
      stats: userStats
    };
    
    console.log('✅ User info sent for:', userInfo.username);
    res.json(userInfo);
  } catch (error) {
    console.error('❌ Error getting user info:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Twitter OAuth routes - Direct implementation without Passport
app.get('/auth/twitter', (req, res) => {
  console.log('🐦 Twitter OAuth initiated');
  
  // Generate PKCE challenge
  const codeVerifier = generateCodeVerifier();
  const state = Math.random().toString(36).substring(7);
  
  // Store state and code verifier (in production, use Redis or database)
  oauthStates.set(state, { codeVerifier, timestamp: Date.now() });
  
  // Clean up old states (older than 10 minutes)
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [key, value] of oauthStates.entries()) {
    if (value.timestamp < tenMinutesAgo) {
      oauthStates.delete(key);
    }
  }
  
  const authUrl = `https://twitter.com/i/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${process.env.TWITTER_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.TWITTER_CALLBACK_URL)}&` +
    `scope=tweet.read%20users.read&` + // Optimized scopes
    `state=${state}&` +
    `code_challenge_method=S256&` +
    `code_challenge=${generateCodeChallenge(codeVerifier)}`;
  
  console.log('🔗 Redirecting to Twitter OAuth');
  res.redirect(authUrl);
});

app.get('/auth/twitter/callback', async (req, res) => {
  console.log('🔄 Twitter OAuth callback received');
  const { code, state } = req.query;
  
  if (!code || !state) {
    console.log('❌ Missing code or state in callback');
    return res.status(400).json({ error: 'Missing authorization code or state' });
  }
  
  // Verify state and get code verifier
  const storedState = oauthStates.get(state);
  if (!storedState) {
    console.log('❌ Invalid or expired state');
    return res.status(400).json({ error: 'Invalid or expired state' });
  }
  
  // Clean up used state
  oauthStates.delete(state);
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.TWITTER_CALLBACK_URL,
        code_verifier: storedState.codeVerifier
      })
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Twitter token exchange failed:', errorText);
      throw new Error(`Twitter token exchange failed: ${tokenResponse.status}`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('✅ Twitter access token obtained');
    
    // Get user info from Twitter
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });
    
    if (!userResponse.ok) {
      throw new Error('Failed to get Twitter user info');
    }
    
    const userData = await userResponse.json();
    console.log('✅ Twitter user info obtained:', userData.data.username);
    
    // Create or update user in our database
    const user = {
      id: `twitter_${userData.data.id}`,
      username: userData.data.username,
      displayName: userData.data.name,
      photo: userData.data.profile_image_url,
      accessToken: tokenData.access_token,
      accessSecret: null,
      twitter: {
        id: userData.data.id,
        screenName: userData.data.username
      }
    };
    
    try {
      await dbHelpers.createOrUpdateUser({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        photo: user.photo,
        accessToken: user.accessToken
      });
      console.log('✅ User saved to database:', user.username);
    } catch (dbError) {
      console.error('❌ Error saving user to database:', dbError);
      // Continue even if DB write fails
    }
    
    // Issue JWT session cookie
    const token = jwt.sign(user, process.env.SESSION_SECRET || 'your-secret-key', { expiresIn: '24h' });
    
    // Redirect to frontend with token
    res.redirect(`https://www.pfcwhitelist.xyz?token=${encodeURIComponent(token)}`);
    
  } catch (error) {
    console.error('💥 Error in Twitter OAuth callback:', error);
    res.status(500).json({ error: 'OAuth callback failed' });
  }
});

// Helper functions for PKCE
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

function generateCodeChallenge(codeVerifier) {
  const hash = crypto.createHash('sha256');
  hash.update(codeVerifier);
  return base64URLEncode(hash.digest());
}

function base64URLEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

console.log('✅ All routes registered successfully');

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
