// Vercel Serverless Function - Complete implementation
console.log('🚀 API function loaded successfully');

// Import required modules
const { dbHelpers } = require('../backend/database');
const { auth: firebaseAdminAuth, db: firestoreDb } = require('../backend/firebase-admin');
const jwt = require('jsonwebtoken');

// Simple ping endpoint
exports.ping = async (req, res) => {
  console.log('🏓 Ping endpoint called');
  try {
    res.json({ 
      message: 'pong', 
      timestamp: new Date().toISOString(),
      status: 'working'
    });
  } catch (error) {
    console.error('❌ Error in ping:', error);
    res.status(500).json({ error: error.message });
  }
};

// Twitter OAuth initiation - OAuth v1 (consumer keys)
exports.twitterAuth = async (req, res) => {
  console.log('🔐 Starting Twitter OAuth v1 authentication...');
  
  try {
    // Check if required environment variables are set for OAuth v1
    if (!process.env.TWITTER_CONSUMER_KEY || !process.env.TWITTER_CONSUMER_SECRET) {
      console.log('❌ Missing Twitter OAuth v1 environment variables');
      console.log('🔍 TWITTER_CONSUMER_KEY:', process.env.TWITTER_CONSUMER_KEY ? '✅ Set' : '❌ Missing');
      console.log('🔍 TWITTER_CONSUMER_SECRET:', process.env.TWITTER_CONSUMER_SECRET ? '✅ Set' : '❌ Missing');
      return res.status(500).json({
        error: 'Twitter OAuth v1 configuration missing',
        details: 'TWITTER_CONSUMER_KEY or TWITTER_CONSUMER_SECRET not set'
      });
    }
    
    console.log('✅ Twitter environment variables found');
    console.log('🔍 Consumer Key length:', process.env.TWITTER_CONSUMER_KEY.length);
    console.log('🔍 Consumer Secret length:', process.env.TWITTER_CONSUMER_SECRET.length);
    
    // For OAuth v1, we need to initiate the OAuth flow
    // This will redirect to Twitter for authorization
    const { TwitterApi } = require('twitter-api-v2');
    
    console.log('📦 Twitter API v2 package loaded successfully');
    
    // Create Twitter client with consumer keys
    const client = new TwitterApi({
      appKey: process.env.TWITTER_CONSUMER_KEY,
      appSecret: process.env.TWITTER_CONSUMER_SECRET,
    });
    
    console.log('🔧 Twitter client created successfully');
    
    const callbackUrl = 'https://www.pfcwhitelist.xyz/auth/twitter/callback';
    console.log('🔗 Callback URL:', callbackUrl);
    
    // Generate OAuth v1 authorization URL
    console.log('🔄 Generating OAuth v1 authorization link...');
    const authLink = await client.generateAuthLink(
      callbackUrl,
      { scope: ['tweet.read', 'users.read'] }
    );
    
    console.log('✅ OAuth v1 authorization link generated successfully');
    console.log('🔗 Redirecting to Twitter OAuth v1:', authLink.url);
    
    // Redirect to Twitter for authorization
    res.redirect(authLink.url);
    
  } catch (error) {
    console.error('💥 Error in Twitter OAuth v1:', error);
    console.error('🔍 Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Twitter OAuth v1 authentication failed',
      details: error.message,
      code: error.code || 'unknown',
      statusCode: error.statusCode || 'unknown'
    });
  }
};

// Twitter OAuth callback - OAuth v1
exports.twitterCallback = async (req, res) => {
  console.log('🔄 Twitter OAuth v1 callback received');
  
  try {
    const { oauth_token, oauth_verifier } = req.query;
    
    if (!oauth_token || !oauth_verifier) {
      console.log('❌ Missing OAuth tokens in callback');
      return res.status(400).json({
        error: 'Missing OAuth tokens',
        details: 'oauth_token or oauth_verifier not provided'
      });
    }
    
    const { TwitterApi } = require('twitter-api-v2');
    
    // Create Twitter client with consumer keys
    const client = new TwitterApi({
      appKey: process.env.TWITTER_CONSUMER_KEY,
      appSecret: process.env.TWITTER_CONSUMER_SECRET,
    });
    
    // Exchange OAuth tokens for access tokens
    const { accessToken, accessSecret, screenName, userId } = await client.loginWithOAuth1({
      accessToken: oauth_token,
      accessSecret: oauth_verifier,
    });
    
    console.log('✅ OAuth v1 tokens obtained for user:', screenName);
    
    // Create user object with Twitter credentials
    const user = {
      id: userId,
      username: screenName,
      displayName: screenName,
      photo: null,
      accessToken: accessToken,
      accessSecret: accessSecret,
      twitter: {
        id: userId,
        screenName: screenName
      }
    };
    
    // Generate JWT token
    const token = jwt.sign(user, process.env.SESSION_SECRET || 'your-secret-key', { expiresIn: '24h' });
    
    // Set cookie and redirect to frontend
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    
    // Redirect to frontend with success
    res.redirect('https://www.pfcwhitelist.xyz/dashboard?login=success&token=' + token);
    
  } catch (error) {
    console.error('💥 Error in Twitter OAuth v1 callback:', error);
    res.redirect('https://www.pfcwhitelist.xyz?login=error&message=' + encodeURIComponent(error.message));
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

// User endpoint to verify authentication
exports.getUser = async (req, res) => {
  console.log('👤 /api/user endpoint called');
  
  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key');
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    console.log('✅ JWT token verified for user:', decoded.username);
    
    // Return user data
    res.json({
      user: {
        id: decoded.id,
        username: decoded.username,
        displayName: decoded.displayName,
        photo: decoded.photo,
        twitter: decoded.twitter
      }
    });
    
  } catch (error) {
    console.error('💥 Error in /api/user:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Debug endpoint to check Twitter environment variables
exports.debugTwitter = async (req, res) => {
  console.log('🔍 Debug Twitter environment variables');
  
  try {
    const twitterVars = {
      TWITTER_CONSUMER_KEY: {
        exists: !!process.env.TWITTER_CONSUMER_KEY,
        length: process.env.TWITTER_CONSUMER_KEY ? process.env.TWITTER_CONSUMER_KEY.length : 0,
        preview: process.env.TWITTER_CONSUMER_KEY ? 
          process.env.TWITTER_CONSUMER_KEY.substring(0, 8) + '...' : 'Not set'
      },
      TWITTER_CONSUMER_SECRET: {
        exists: !!process.env.TWITTER_CONSUMER_SECRET,
        length: process.env.TWITTER_CONSUMER_SECRET ? process.env.TWITTER_CONSUMER_SECRET.length : 0,
        preview: process.env.TWITTER_CONSUMER_SECRET ? 
          process.env.TWITTER_CONSUMER_SECRET.substring(0, 8) + '...' : 'Not set'
      },
      SESSION_SECRET: {
        exists: !!process.env.SESSION_SECRET,
        length: process.env.SESSION_SECRET ? process.env.SESSION_SECRET.length : 0
      }
    };
    
    console.log('🔍 Twitter environment variables status:', twitterVars);
    
    res.json({
      message: 'Twitter environment variables debug info',
      twitter: twitterVars,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error in debug endpoint:', error);
    res.status(500).json({
      error: 'Debug endpoint failed',
      details: error.message
    });
  }
};

// Main handler for Vercel
module.exports = async (req, res) => {
  console.log('🚀 Main handler called');
  console.log('📝 Request method:', req.method);
  console.log('📝 Request URL:', req.url);
  
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Route handling
    if (req.url === '/ping' || req.url === '/ping/') {
      return await exports.ping(req, res);
    }
    
    if (req.url === '/auth/twitter' || req.url === '/auth/twitter/') {
      return await exports.twitterAuth(req, res);
    }
    
    if (req.url === '/auth/twitter/callback' || req.url === '/auth/twitter/callback/') {
      return await exports.twitterCallback(req, res);
    }
    
    if (req.url === '/api/auth/firebase' || req.url === '/api/auth/firebase/') {
      if (req.method === 'POST') {
        return await exports.firebaseAuth(req, res);
      }
    }
    
    if (req.url === '/api/auth/logout' || req.url === '/api/auth/logout/') {
      if (req.method === 'POST') {
        return await exports.logout(req, res);
      }
    }

    if (req.url === '/api/user' || req.url === '/api/user/') {
      if (req.method === 'GET') {
        return await exports.getUser(req, res);
      }
    }
    
    if (req.url === '/debug/twitter' || req.url === '/debug/twitter/') {
      return await exports.debugTwitter(req, res);
    }
    
    // Default response for unmatched routes
    res.json({
      message: 'API is working',
      endpoint: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
      note: 'This endpoint exists but has no specific handler'
    });
    
  } catch (error) {
    console.error('💥 Error in main handler:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
    });
  }
};
