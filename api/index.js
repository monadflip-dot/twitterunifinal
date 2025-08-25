// Vercel Serverless Function - Main API entry point
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { dbHelpers } = require('../backend/database');
const { auth: firebaseAdminAuth, db: firestoreDb } = require('../backend/firebase-admin');

// Import missions router
const missionsRouter = require('../backend/missions');

const app = express();

// Middleware
app.use(cors({
  origin: [
    'https://www.pfcwhitelist.xyz',
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

// Temporary storage for OAuth state
const oauthStates = new Map();

// Middleware to verify JWT
const authenticateJWT = (req, res, next) => {
  console.log('🔐 JWT Middleware executing...');
  
  const token = req.cookies?.jwt || 
                req.headers.authorization?.split(' ')[1] || 
                req.headers.authorization;
  
  if (!token) {
    return res.status(401).json({ 
      error: 'No token provided',
      details: 'Token not found in cookies or Authorization header'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key');
    
    if (!decoded.accessToken) {
      return res.status(403).json({
        error: 'Twitter access token not available. Please reconnect your Twitter account.',
        details: 'User needs to re-authenticate with Twitter',
        action: 'reconnect_twitter',
        code: 'MISSING_ACCESS_TOKEN'
      });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        details: 'JWT token has expired, please login again'
      });
    } else {
      return res.status(401).json({ 
        error: 'Token verification failed',
        details: error.message
      });
    }
  }
};

// Test endpoints
app.get('/ping', (req, res) => {
  console.log('🏓 Ping endpoint called');
  res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

app.get('/test', (req, res) => {
  console.log('🧪 Test endpoint called');
  res.json({
    success: true,
    message: 'Backend is working correctly',
    timestamp: new Date().toISOString(),
    backend: 'Node.js/Express on Vercel',
    status: 'operational'
  });
});

app.get('/env/check', (req, res) => {
  console.log('🔍 Environment variables check endpoint called');
  
  const requiredVars = {
    SESSION_SECRET: process.env.SESSION_SECRET ? '✅ Set' : '❌ Missing',
    NODE_ENV: process.env.NODE_ENV || 'development'
  };
  
  res.json({
    success: true,
    message: 'Environment check completed',
    environment: requiredVars,
    timestamp: new Date().toISOString()
  });
});

// Auth routes
app.post('/api/auth/firebase', async (req, res) => {
  console.log('📱 /api/auth/firebase endpoint called');
  try {
    const { idToken, twitterAccessToken, twitterAccessSecret, profile } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ error: 'Missing Firebase ID token' });
    }

    const decoded = await firebaseAdminAuth.verifyIdToken(idToken);
    console.log('✅ Firebase ID token verified for uid:', decoded.uid);

    if (!twitterAccessToken) {
      console.log('⚠️ No Twitter access token, redirecting to Twitter OAuth');
      return res.json({ 
        success: false, 
        action: 'redirect_to_twitter',
        message: 'Twitter authentication required'
      });
    }

    const user = {
      id: decoded.uid,
      username: profile?.screenName || profile?.screen_name || decoded.name || (decoded.uid ? decoded.uid.slice(0, 8) : 'user'),
      displayName: profile?.displayName || profile?.name || decoded.name || 'User',
      photo: profile?.photoURL || decoded.picture || null,
      accessToken: twitterAccessToken,
      accessSecret: twitterAccessSecret || null,
      twitter: {
        id: profile?.id_str || profile?.id || null,
        screenName: profile?.screenName || profile?.screen_name || null
      }
    };

    console.log('👤 Creating session for user:', user.username);

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
    }

    const token = jwt.sign(user, process.env.SESSION_SECRET || 'your-secret-key', { expiresIn: '24h' });
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.json({ 
      success: true, 
      message: 'Authentication successful with Twitter access token',
      token: token
    });
  } catch (err) {
    console.error('💥 Error in /api/auth/firebase:', err);
    return res.status(401).json({ error: 'Firebase auth failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  console.log('📱 /api/auth/logout endpoint called');
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

// Protected routes
app.use('/api/missions', authenticateJWT, missionsRouter);

// Twitter OAuth routes
app.get('/auth/twitter', (req, res) => {
  console.log('🔐 Starting Twitter authentication...');
  
  const state = Math.random().toString(36).substring(2, 15);
  const codeVerifier = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  oauthStates.set(state, {
    codeVerifier: codeVerifier,
    timestamp: Date.now()
  });
  
  const authUrl = `https://twitter.com/i/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${process.env.TWITTER_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.TWITTER_CALLBACK_URL)}&` +
    `scope=tweet.read%20users.read&` +
    `state=${state}&` +
    `code_challenge_method=S256&` +
    `code_challenge=${generateCodeChallenge(codeVerifier)}`;
  
  console.log('🔗 Redirecting to Twitter OAuth');
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
  
  const { code, state, error } = req.query;
  
  if (error) {
    console.log('❌ Twitter OAuth error:', error);
    return res.redirect('https://pfcwhitelist.xyz?error=${error}');
  }
  
  if (!oauthStates.has(state)) {
    console.log('❌ No OAuth state found');
    return res.redirect('https://pfcwhitelist.xyz?error=no_session_state');
  }
  
  const oauthData = oauthStates.get(state);
  
  try {
    console.log('🔄 Exchanging code for token...');
    
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xwww-form-urlencoded',
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
      return res.redirect('https://pfcwhitelist.xyz?error=token_error');
    }
    
    const tokenData = await tokenResponse.json();
    console.log('✅ Token obtained successfully');
    
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
      user = {
        id: 'twitter_user_' + Date.now(),
        username: 'twitter_user',
        displayName: 'Twitter User',
        photo: null,
        accessToken: tokenData.access_token
      };
    }
    
    console.log('✅ User data obtained:', user.username);
    
    try {
      await dbHelpers.createOrUpdateUser(user);
      console.log('✅ User saved to database:', user.username);
    } catch (dbError) {
      console.error('❌ Error saving user to database:', dbError);
      return res.redirect('https://pfcwhitelist.xyz?error=db_save_error');
    }
    
    const token = jwt.sign(user, process.env.SESSION_SECRET || 'your-secret-key', { expiresIn: '24h' });
    
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    
    oauthStates.delete(state);
    console.log('✅ Authentication successful, redirecting to frontend');
    
    res.redirect(`https://www.pfcwhitelist.xyz?token=${encodeURIComponent(token)}`);
    
  } catch (error) {
    console.error('💥 Error in OAuth callback:', error);
    oauthStates.delete(state);
    res.redirect('https://pfcwhitelist.xyz?error=callback_error');
  }
});

// Export for Vercel
module.exports = app;
