// Vercel Serverless Function - Simplified version
const { dbHelpers } = require('../backend/database');
const { auth: firebaseAdminAuth, db: firestoreDb } = require('../backend/firebase-admin');
const jwt = require('jsonwebtoken');

// Simple test endpoint
exports.ping = async (req, res) => {
  console.log('🏓 Ping endpoint called');
  res.json({ message: 'pong', timestamp: new Date().toISOString() });
};

// Test endpoint
exports.test = async (req, res) => {
  console.log('🧪 Test endpoint called');
  res.json({
    success: true,
    message: 'Backend is working correctly',
    timestamp: new Date().toISOString(),
    backend: 'Node.js Serverless Function on Vercel',
    status: 'operational'
  });
};

// Environment check endpoint
exports.envCheck = async (req, res) => {
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
};

// Twitter OAuth initiation
exports.twitterAuth = async (req, res) => {
  console.log('🔐 Starting Twitter authentication...');
  
  try {
    // Check if required environment variables are set
    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CALLBACK_URL) {
      console.log('❌ Missing Twitter environment variables');
      return res.status(500).json({
        error: 'Twitter configuration missing',
        details: 'TWITTER_CLIENT_ID or TWITTER_CALLBACK_URL not set'
      });
    }
    
    const state = Math.random().toString(36).substring(2, 15);
    const codeVerifier = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Generate PKCE code challenge
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    const codeChallenge = hash.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    
    const authUrl = `https://twitter.com/i/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=${process.env.TWITTER_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(process.env.TWITTER_CALLBACK_URL)}&` +
      `scope=tweet.read%20users.read&` +
      `state=${state}&` +
      `code_challenge_method=S256&` +
      `code_challenge=${codeChallenge}`;
    
    console.log('🔗 Redirecting to Twitter OAuth');
    res.redirect(authUrl);
    
  } catch (error) {
    console.error('💥 Error in Twitter auth:', error);
    res.status(500).json({
      error: 'Twitter authentication failed',
      details: error.message
    });
  }
};

// Firebase auth endpoint
exports.firebaseAuth = async (req, res) => {
  console.log('📱 /api/auth/firebase endpoint called');
  
  try {
    const { idToken, twitterAccessToken, twitterAccessSecret, profile } = req.body || {};
    
    if (!idToken) {
      return res.status(400).json({ error: 'Missing Firebase ID token' });
    }

    // Verify Firebase ID token
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

    // Build user object
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

    // Save user to database
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

    // Generate JWT token
    const token = jwt.sign(user, process.env.SESSION_SECRET || 'your-secret-key', { expiresIn: '24h' });
    
    // Set cookie and return response
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
};

// Logout endpoint
exports.logout = async (req, res) => {
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
};

// Main handler for Vercel
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    
    console.log(`🚀 Request to: ${req.method} ${pathname}`);
    
    // Route handling
    switch (pathname) {
      case '/ping':
        return await exports.ping(req, res);
        
      case '/test':
        return await exports.test(req, res);
        
      case '/env/check':
        return await exports.envCheck(req, res);
        
      case '/auth/twitter':
        return await exports.twitterAuth(req, res);
        
      case '/api/auth/firebase':
        if (req.method === 'POST') {
          return await exports.firebaseAuth(req, res);
        }
        break;
        
      case '/api/auth/logout':
        if (req.method === 'POST') {
          return await exports.logout(req, res);
        }
        break;
        
      default:
        res.status(404).json({
          error: 'Endpoint not found',
          path: pathname,
          method: req.method
        });
    }
    
  } catch (error) {
    console.error('💥 Error in main handler:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};
