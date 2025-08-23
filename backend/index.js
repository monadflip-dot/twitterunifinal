require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('./auth');
const missionsRouter = require('./missions');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const path = require('path');
const cookieParser = require('cookie-parser');
const { dbHelpers } = require('./database');
const { auth: firebaseAdminAuth } = require('./firebase-admin');
const { firestoreDb } = require('./firebase-admin'); // Added for wallet endpoint

const app = express();
const PORT = process.env.PORT || 3001;

// Temporary storage for OAuth state (works better with Render's multiple instances)
const oauthStates = new Map();

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'https://www.fishingclubmissions.xyz',
    'https://fishingclubmissions.xyz',
    'https://www.fishingclubmissions.xyz/',
    'https://fishingclubmissions.xyz/',
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

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
// app.use(passport.initialize());
// app.use(passport.session());

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

// Routes
app.use('/api/missions', authenticateJWT, missionsRouter);

// Firebase Auth login endpoint (from frontend)
app.post('/auth/firebase', async (req, res) => {
  try {
    const { idToken, twitterAccessToken, twitterAccessSecret, profile } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ error: 'Missing Firebase ID token' });
    }

    // Verify Firebase ID token
    const decoded = await firebaseAdminAuth.verifyIdToken(idToken);
    console.log('✅ Firebase ID token verified for uid:', decoded.uid);

    // Build user object (prefer Twitter profile info if available)
    const user = {
      id: decoded.uid, // Always use Firebase UID for identity
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

    console.log('👤 Creating session for user:', user.username);

    // Persist basic user info (tokens remain in JWT)
    try {
      await dbHelpers.createOrUpdateUser({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        photo: user.photo,
        accessToken: user.accessToken || ''
      });
      console.log('✅ User saved to database:', user.username);
    } catch (dbError) {
      console.error('❌ Error saving user to database:', dbError);
      // Continue even if DB write fails
    }

    // Issue our JWT session cookie
    const token = jwt.sign(user, process.env.SESSION_SECRET || 'your-secret-key', { expiresIn: '24h' });
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('💥 Error in /auth/firebase:', err);
    return res.status(401).json({ error: 'Firebase auth failed' });
  }
});

// Add explicit logout to clear JWT cookie
app.post('/auth/logout', (req, res) => {
  try {
    res.clearCookie('jwt', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Logout failed' });
  }
});

// Twitter OAuth routes - Direct implementation without Passport
app.get('/auth/twitter', (req, res) => {
  console.log('🔐 Starting Twitter authentication...');
  console.log('🔑 Client ID:', process.env.TWITTER_CLIENT_ID ? 'Set' : 'Missing');
  console.log('🔑 Client Secret:', process.env.TWITTER_CLIENT_SECRET ? 'Set' : 'Missing');
  console.log('🔗 Callback URL:', process.env.TWITTER_CALLBACK_URL || 'Not set');
  
  // Generate state and code verifier for PKCE
  const state = Math.random().toString(36).substring(2, 15);
  const codeVerifier = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // Store in temporary memory storage with timestamp
  oauthStates.set(state, {
    codeVerifier: codeVerifier,
    timestamp: Date.now()
  });
  
  // Clean up old states (older than 10 minutes)
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [key, value] of oauthStates.entries()) {
    if (value.timestamp < tenMinutesAgo) {
      oauthStates.delete(key);
    }
  }
  
  console.log('✅ OAuth state stored in memory:', state);
  console.log('✅ Code verifier stored:', codeVerifier);
  console.log('✅ Total states in memory:', oauthStates.size);
  
  // Build Twitter OAuth URL with PKCE
  const authUrl = `https://twitter.com/i/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${process.env.TWITTER_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.TWITTER_CALLBACK_URL)}&` +
    `scope=tweet.read%20users.read%20like.write%20like.read&` +
    `state=${state}&` +
    `code_challenge_method=S256&` +
    `code_challenge=${generateCodeChallenge(codeVerifier)}`;
  
  console.log('🔗 Redirecting to:', authUrl);
  res.redirect(authUrl);
});

// Helper function to generate PKCE code challenge
function generateCodeChallenge(verifier) {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return hash.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

app.get('/auth/twitter/callback', async (req, res) => {
  console.log('📱 Twitter callback received');
  console.log('Query params:', req.query);
  console.log('Total states in memory:', oauthStates.size);
  
  const { code, state, error } = req.query;
  
  // Check for errors
  if (error) {
    console.log('❌ Twitter OAuth error:', error);
    return res.redirect(`${process.env.FRONTEND_URL || 'https://twitterunifinal.onrender.com'}?error=${error}`);
  }
  
  // Verify state with memory storage
  if (!oauthStates.has(state)) {
    console.log('❌ No OAuth state found in memory storage');
    console.log('Received state:', state);
    console.log('Available states:', Array.from(oauthStates.keys()));
    return res.redirect(`${process.env.FRONTEND_URL || 'https://twitterunifinal.onrender.com'}?error=no_session_state`);
  }
  
  const oauthData = oauthStates.get(state);
  console.log('✅ OAuth state found in memory:', state);
  console.log('✅ Code verifier from memory:', oauthData.codeVerifier);
  
  try {
    console.log('🔄 Exchanging code for token...');
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.TWITTER_CALLBACK_URL,
        code_verifier: oauthData.codeVerifier
      })
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.log('❌ Token exchange failed:', tokenResponse.status, errorText);
      return res.redirect(`${process.env.FRONTEND_URL || 'https://twitterunifinal.onrender.com'}?error=token_error`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('✅ Token obtained successfully');
    
    // Get user info
    const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=id,username,name,profile_image_url', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });
    
    let user;
    if (userResponse.ok) {
      const userData = await userResponse.json();
      user = {
        id: userData.data.id,
        username: userData.data.username,
        displayName: userData.data.name,
        photo: userData.data.profile_image_url,
        accessToken: tokenData.access_token
      };
    } else {
      // Fallback user data
      user = {
        id: 'twitter_user_' + Date.now(),
        username: 'twitter_user',
        displayName: 'Twitter User',
        photo: null,
        accessToken: tokenData.access_token
      };
    }
    
    console.log('✅ User data obtained:', user.username);
    console.log('🔍 Full user object:', JSON.stringify(user, null, 2));
    
    // Save user to database
    try {
      await dbHelpers.createOrUpdateUser(user);
      console.log('✅ User saved to database:', user.username);
    } catch (dbError) {
      console.error('❌ Error saving user to database:', dbError);
      return res.redirect(`${process.env.FRONTEND_URL || 'https://twitterunifinal.onrender.com'}?error=db_save_error`);
    }
    
    // Generate JWT
    const token = jwt.sign(user, process.env.SESSION_SECRET || 'your-secret-key', { expiresIn: '24h' });
    
    // Set JWT cookie and redirect
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // Clear OAuth state from memory
    oauthStates.delete(state);
    console.log('✅ OAuth state cleared from memory');
    console.log('✅ Remaining states in memory:', oauthStates.size);
    
    console.log('✅ Authentication successful, redirecting to frontend');
    res.redirect(process.env.FRONTEND_URL || 'https://twitterunifinal.onrender.com');
    
  } catch (error) {
    console.error('💥 Error in OAuth callback:', error);
    // Clear OAuth state on error too
    oauthStates.delete(state);
    res.redirect(`${process.env.FRONTEND_URL || 'https://twitterunifinal.onrender.com'}?error=callback_error`);
  }
});

app.get('/auth/logout', (req, res) => {
  // Clear cookie regardless of passport session
  try {
    res.clearCookie('jwt', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
  } catch {}

  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// User info endpoint
app.get('/api/user', authenticateJWT, (req, res) => {
  console.log('👤 Authenticated user with JWT:', req.user.username);
  console.log('🔍 Full user object from JWT:', JSON.stringify(req.user, null, 2));
  res.json({ user: req.user });
});

// Wallet endpoints
app.get('/api/user/wallet', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's wallet from Firestore
    const userWalletRef = firestoreDb.collection('userWallets').doc(userId);
    const userWalletDoc = await userWalletRef.get();
    
    if (userWalletDoc.exists) {
      const data = userWalletDoc.data();
      return res.json({ 
        wallet: data.wallet,
        addedAt: data.addedAt,
        canChange: false // Once added, cannot be changed
      });
    } else {
      return res.json({ 
        wallet: null,
        canChange: true // Can add wallet if none exists
      });
    }
  } catch (error) {
    console.error('Error fetching wallet:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Direct missions endpoint (for testing and fallback)
app.get('/api/missions/direct', (req, res) => {
  try {
    const missions = [
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
    
    res.json({ 
      missions: missions,
      message: 'Direct missions endpoint - all 7 missions included'
    });
  } catch (error) {
    console.error('Error getting direct missions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test endpoint for fishingclubmissions.xyz
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is working for fishingclubmissions.xyz',
    timestamp: new Date().toISOString(),
    domain: req.get('host'),
    origin: req.get('origin')
  });
});

// Test missions endpoint for fishingclubmissions.xyz
app.get('/api/test/missions', (req, res) => {
  const testMissions = [
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
  
  res.json({ 
    missions: testMissions,
    message: 'Test missions endpoint for fishingclubmissions.xyz - All 7 missions included',
    count: testMissions.length,
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Root route - redirect to frontend
app.get('/', (req, res) => {
  res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
});

// Catch-all route for SPA - serve frontend index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
