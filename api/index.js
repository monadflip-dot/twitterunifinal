// Vercel Serverless Function - Simple and functional version
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

// Twitter OAuth 2.0 callback endpoint
exports.twitterOAuth2Callback = async (req, res) => {
  console.log('🔄 /api/auth/twitter/callback endpoint called');
  
  try {
    const { code, state } = req.query;
    
    if (!code) {
      console.error('❌ No authorization code received');
      return res.status(400).json({ error: 'Authorization code required' });
    }
    
    console.log('✅ Authorization code received:', code.substring(0, 10) + '...');
    
    // Exchange code for access token
    const tokenResponse = await exchangeCodeForToken(code);
    
    if (!tokenResponse.success) {
      console.error('❌ Failed to exchange code for token');
      return res.status(400).json({ error: 'Token exchange failed' });
    }
    
    // Get user profile using access token
    const userProfile = await getUserProfile(tokenResponse.accessToken);
    
    if (!userProfile.success) {
      console.error('❌ Failed to get user profile');
      return res.status(400).json({ error: 'Failed to get user profile' });
    }
    
    // Create or update user in database
    const user = {
      id: userProfile.data.id,
      username: userProfile.data.username,
      displayName: userProfile.data.name,
      photo: userProfile.data.profile_image_url,
      accessToken: tokenResponse.accessToken,
      twitter: {
        id: userProfile.data.id,
        screenName: userProfile.data.username
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
    }
    
    // Generate JWT token
    const token = jwt.sign(user, process.env.SESSION_SECRET || 'your-secret-key', { expiresIn: '24h' });
    
    // Redirect to frontend with token
    const redirectUrl = `https://www.pfcwhitelist.xyz/?token=${encodeURIComponent(token)}`;
    
    console.log('✅ OAuth 2.0 flow completed, redirecting to frontend');
    res.redirect(redirectUrl);
    
  } catch (err) {
    console.error('💥 Error in Twitter OAuth 2.0 callback:', err);
    res.redirect('https://www.pfcwhitelist.xyz/?error=oauth_failed');
  }
};

// Exchange authorization code for access token
async function exchangeCodeForToken(code) {
  try {
    // Use OAuth 2.0 variables (CLIENT_ID and CLIENT_SECRET) for OAuth 2.0
    const clientId = process.env.TWITTER_CLIENT_ID || process.env.TWITTER_CONSUMER_KEY;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET || process.env.TWITTER_CONSUMER_SECRET;
    const redirectUri = 'https://www.pfcwhitelist.xyz/auth/callback';
    
    console.log('🔄 Exchanging code for token...');
    console.log('🔄 Client ID:', clientId ? '✅ Set' : '❌ Missing');
    console.log('🔄 Using OAuth 2.0 variables:', !!process.env.TWITTER_CLIENT_ID ? '✅ CLIENT_ID/CLIENT_SECRET' : '⚠️ CONSUMER_KEY/CONSUMER_SECRET (fallback)');
    console.log('🔄 Redirect URI:', redirectUri);
    
    // FIXED: Add PKCE code verifier for OAuth 2.0 security
    const codeVerifier = generateCodeVerifier();
    
    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier // Add PKCE code verifier
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Token exchange failed:', response.status, errorText);
      return { success: false, error: errorText };
    }
    
    const data = await response.json();
    console.log('✅ Token exchange successful');
    
    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token
    };
    
  } catch (error) {
    console.error('💥 Error in token exchange:', error);
    return { success: false, error: error.message };
  }
}

// Get user profile using access token
async function getUserProfile(accessToken) {
  try {
    const response = await fetch('https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      console.error('❌ Failed to get user profile:', response.status);
      return { success: false };
    }
    
    const data = await response.json();
    console.log('✅ User profile retrieved:', data.data.username);
    
    return {
      success: true,
      data: data.data
    };
    
  } catch (error) {
    console.error('💥 Error getting user profile:', error);
    return { success: false };
  }
}

// Twitter OAuth 2.0 authorization endpoint
exports.twitterOAuth2Authorize = async (req, res) => {
  console.log('🔗 /api/auth/twitter/authorize endpoint called');
  
  try {
    // Twitter OAuth 2.0 configuration - Use CLIENT_ID for OAuth 2.0
    const clientId = process.env.TWITTER_CLIENT_ID || process.env.TWITTER_CONSUMER_KEY;
    const redirectUri = 'https://www.pfcwhitelist.xyz/auth/callback';
    
    console.log('🔍 Debug info:');
    console.log('🔍 TWITTER_CLIENT_ID:', process.env.TWITTER_CLIENT_ID ? '✅ Set' : '❌ Missing');
    console.log('🔍 TWITTER_CLIENT_SECRET:', process.env.TWITTER_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
    console.log('🔍 TWITTER_CONSUMER_KEY:', process.env.TWITTER_CONSUMER_KEY ? '✅ Set' : '❌ Missing');
    console.log('🔍 Using OAuth version:', process.env.TWITTER_CLIENT_ID ? '2.0' : '1.0a (fallback)');
    
    if (!clientId) {
      console.error('❌ No Twitter credentials configured');
      return res.status(500).json({ 
        error: 'Twitter OAuth 2.0 configuration missing',
        details: {
          clientId: process.env.TWITTER_CLIENT_ID ? 'Set' : 'Missing',
          clientSecret: process.env.TWITTER_CLIENT_SECRET ? 'Set' : 'Missing',
          consumerKey: process.env.TWITTER_CONSUMER_KEY ? 'Set' : 'Missing',
          consumerSecret: process.env.TWITTER_CONSUMER_SECRET ? 'Set' : 'Missing'
        },
        solution: 'Add TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET to Vercel environment variables'
      });
    }
    
    // Generate state parameter for security
    const state = Math.random().toString(36).substring(7);
    
    // FIXED: Use correct Twitter OAuth 2.0 authorization endpoint
    // The correct endpoint is /i/oauth2/authorize with proper parameters
    const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'tweet.read users.read');
    authUrl.searchParams.set('state', state);
    
    // Add additional required parameters for better compatibility
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('code_challenge', generateCodeChallenge());
    
    const finalAuthUrl = authUrl.toString();
    
    console.log('🔗 Generated OAuth 2.0 authorization URL');
    console.log('🔗 Client ID:', clientId);
    console.log('🔗 Redirect URI:', redirectUri);
    console.log('🔗 Full Auth URL:', finalAuthUrl);
    console.log('🔗 Using OAuth 2.0 variables:', !!process.env.TWITTER_CLIENT_ID ? '✅ CLIENT_ID' : '⚠️ CONSUMER_KEY (fallback)');
    
    return res.json({
      success: true,
      authUrl: finalAuthUrl,
      message: 'OAuth 2.0 authorization URL generated',
      debug: {
        clientId: clientId ? '✅ Set' : '❌ Missing',
        redirectUri: redirectUri,
        state: state,
        oauthVersion: process.env.TWITTER_CLIENT_ID ? '2.0' : '1.0a (fallback)',
        credentials: {
          clientId: !!process.env.TWITTER_CLIENT_ID,
          clientSecret: !!process.env.TWITTER_CLIENT_SECRET,
          consumerKey: !!process.env.TWITTER_CONSUMER_KEY,
          consumerSecret: !!process.env.TWITTER_CONSUMER_SECRET
        }
      }
    });
    
  } catch (err) {
    console.error('💥 Error in Twitter OAuth 2.0 authorize:', err);
    return res.status(500).json({ 
      error: 'Failed to generate authorization URL',
      details: err.message
    });
  }
};

// Helper function to generate PKCE code challenge
function generateCodeChallenge() {
  // FIXED: Generate proper SHA256 hash of the code verifier
  const crypto = require('crypto');
  const codeVerifier = generateCodeVerifier();
  const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64');
  // Make it URL-safe by replacing + with - and / with _
  return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Helper function to generate PKCE code verifier
function generateCodeVerifier() {
  // For simplicity, using a fixed verifier. In production, generate this dynamically
  return '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
}

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

// Debug endpoint for Twitter OAuth issues
exports.debugTwitter = async (req, res) => {
  console.log('🔍 /api/debug/twitter endpoint called');
  
  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      twitterConfig: {
        // OAuth 2.0 variables (PRIMARY)
        clientId: process.env.TWITTER_CLIENT_ID ? '✅ Set' : '❌ Missing',
        clientSecret: process.env.TWITTER_CLIENT_SECRET ? '✅ Set' : '❌ Missing',
        
        // OAuth 1.0a variables (FALLBACK)
        consumerKey: process.env.TWITTER_CONSUMER_KEY ? '✅ Set' : '❌ Missing',
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET ? '✅ Set' : '❌ Missing',
        
        // Session secret
        sessionSecret: process.env.SESSION_SECRET ? '✅ Set' : '❌ Missing'
      },
      firebaseConfig: {
        projectId: process.env.FIREBASE_PROJECT_ID || '❌ Missing',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? '✅ Set' : '❌ Missing',
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? '✅ Set' : '❌ Missing'
      },
      oauthFlow: {
        currentVersion: process.env.TWITTER_CLIENT_ID ? '2.0' : '1.0a (fallback)',
        callbackUrl: 'https://www.pfcwhitelist.xyz/auth/callback',
        scope: 'tweet.read users.read'
      },
      recommendations: [
        '1. Add TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET to Vercel environment variables',
        '2. Ensure Twitter Developer Portal has OAuth 2.0 enabled',
        '3. Verify callback URL matches: https://www.pfcwhitelist.xyz/auth/callback',
        '4. Check Twitter app type is "Web App, Automated App or Bot"'
      ]
    };
    
    return res.json({
      success: true,
      debug: debugInfo
    });
    
  } catch (err) {
    console.error('💥 Error in debug endpoint:', err);
    return res.status(500).json({ error: 'Debug failed' });
  }
};

// User verification endpoint
exports.getUser = async (req, res) => {
  console.log('👤 /api/user endpoint called');
  
  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization header' });
    }
    
    const token = authHeader.substring(7);
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key');
    console.log('✅ JWT token verified for user:', decoded.username);
    
    // Return user data
    return res.json({
      success: true,
      user: {
        id: decoded.id,
        username: decoded.username,
        displayName: decoded.displayName,
        photo: decoded.photo,
        twitter: decoded.twitter
      }
    });
    
  } catch (err) {
    console.error('💥 Error in /api/user:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Logout endpoint (alternative path)
exports.logoutAlt = async (req, res) => {
  console.log('📱 /api/logout endpoint called');
  
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

// Missions endpoint
exports.getMissions = async (req, res) => {
  console.log('🎯 /api/missions endpoint called');
  
  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization header' });
    }
    
    const token = authHeader.substring(7);
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key');
    console.log('✅ JWT token verified for user:', decoded.username);
    
    // Get missions from Firebase
    try {
      const missionsSnapshot = await firestoreDb.collection('missions').get();
      const missions = [];
      
      missionsSnapshot.forEach(doc => {
        const missionData = doc.data();
        missions.push({
          id: doc.id,
          title: missionData.title || 'Mission',
          description: missionData.description || 'Complete this mission',
          points: missionData.points || 10,
          completed: missionData.completed || false,
          type: missionData.type || 'general',
          requirements: missionData.requirements || [],
          ...missionData
        });
      });
      
      console.log('✅ Missions loaded from Firebase:', missions.length);
      
      return res.json({
        success: true,
        missions: missions,
        count: missions.length
      });
      
    } catch (firebaseError) {
      console.error('❌ Error loading missions from Firebase:', firebaseError);
      
      // Return fallback missions if Firebase fails
      const fallbackMissions = [
        {
          id: '1',
          title: 'Follow on Twitter',
          description: 'Follow our official Twitter account',
          points: 50,
          completed: false,
          type: 'social'
        },
        {
          id: '2',
          title: 'Retweet Announcement',
          description: 'Retweet our latest announcement',
          points: 100,
          completed: false,
          type: 'social'
        },
        {
          id: '3',
          title: 'Join Discord',
          description: 'Join our Discord community',
          points: 75,
          completed: false,
          type: 'community'
        }
      ];
      
      return res.json({
        success: true,
        missions: fallbackMissions,
        count: fallbackMissions.length,
        note: 'Using fallback missions due to Firebase connection issue'
      });
    }
    
  } catch (err) {
    console.error('💥 Error in /api/missions:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// User stats endpoint
exports.getUserStats = async (req, res) => {
  console.log('📊 /api/user/stats endpoint called');
  
  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization header' });
    }
    
    const token = authHeader.substring(7);
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key');
    console.log('✅ JWT token verified for user:', decoded.username);
    
    try {
      // FIXED: Use correct collection 'userProgress' instead of 'userMissions'
      const userProgressSnapshot = await firestoreDb
        .collection('userProgress')
        .where('userId', '==', decoded.id)
        .get();
      
      let userProgress = null;
      if (!userProgressSnapshot.empty) {
        userProgress = userProgressSnapshot.docs[0].data();
        console.log('✅ User progress found:', userProgress);
      }
      
      // Get all missions to calculate stats
      const missionsSnapshot = await firestoreDb.collection('missions').get();
      const allMissions = [];
      missionsSnapshot.forEach(doc => {
        allMissions.push(doc.data());
      });
      
      // Calculate statistics based on actual Firebase structure
      let completedMissions = 0;
      let totalPoints = 0;
      
      if (userProgress) {
        // Use the actual structure: completedMissions as an object with numeric keys
        if (userProgress.completedMissions) {
          completedMissions = Object.keys(userProgress.completedMissions).length;
        }
        totalPoints = userProgress.totalPoints || 0;
      }
      
      const stats = {
        totalPoints: totalPoints,
        completedMissions: completedMissions,
        totalMissions: allMissions.length,
        pendingMissions: allMissions.length - completedMissions,
        userProgress: userProgress,
        allMissions: allMissions
      };
      
      console.log('✅ User stats calculated:', stats);
      
      return res.json({
        success: true,
        stats: stats
      });
      
    } catch (firebaseError) {
      console.error('❌ Error loading user stats from Firebase:', firebaseError);
      
      // Return fallback stats if Firebase fails
      return res.json({
        success: true,
        stats: {
          totalPoints: 0,
          completedMissions: 0,
          totalMissions: 7,
          pendingMissions: 7,
          note: 'Using fallback stats due to Firebase connection issue'
        }
      });
    }
    
  } catch (err) {
    console.error('💥 Error in /api/user/stats:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Initialize missions endpoint (creates default missions if none exist)
exports.initializeMissions = async (req, res) => {
  console.log('🚀 /api/missions/initialize endpoint called');
  
  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization header' });
    }
    
    const token = authHeader.substring(7);
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key');
    console.log('✅ JWT token verified for user:', decoded.username);
    
    try {
      // Check if missions already exist
      const existingMissions = await firestoreDb.collection('missions').get();
      
      if (!existingMissions.empty) {
        console.log('✅ Missions already exist, no need to initialize');
        return res.json({
          success: true,
          message: 'Missions already exist',
          count: existingMissions.size
        });
      }
      
      // Create default missions
      const defaultMissions = [
        {
          id: '1',
          title: 'Follow on Twitter',
          description: 'Follow our official Twitter account @PFCWhitelist',
          points: 50,
          completed: false,
          type: 'social',
          requirements: ['Follow Twitter account'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          title: 'Retweet Announcement',
          description: 'Retweet our latest announcement about the whitelist',
          points: 100,
          completed: false,
          type: 'social',
          requirements: ['Retweet announcement'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '3',
          title: 'Join Discord Community',
          description: 'Join our Discord community to stay updated',
          points: 75,
          completed: false,
          type: 'community',
          requirements: ['Join Discord server'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '4',
          title: 'Share Project',
          description: 'Share our project on your social media',
          points: 125,
          completed: false,
          type: 'promotion',
          requirements: ['Share on social media'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '5',
          title: 'Like Official Posts',
          description: 'Like our official posts on Twitter',
          points: 60,
          completed: false,
          type: 'engagement',
          requirements: ['Like official posts'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '6',
          title: 'Comment on Posts',
          description: 'Leave meaningful comments on our posts',
          points: 80,
          completed: false,
          type: 'engagement',
          requirements: ['Comment on posts'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '7',
          title: 'Invite Friends',
          description: 'Invite your friends to join the whitelist',
          points: 150,
          completed: false,
          type: 'referral',
          requirements: ['Invite friends'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Add missions to Firebase
      const batch = firestoreDb.batch();
      
      defaultMissions.forEach(mission => {
        const missionRef = firestoreDb.collection('missions').doc(mission.id);
        batch.set(missionRef, mission);
      });
      
      await batch.commit();
      console.log('✅ Default missions created in Firebase');
      
      return res.json({
        success: true,
        message: 'Default missions initialized successfully',
        missions: defaultMissions,
        count: defaultMissions.length
      });
      
    } catch (firebaseError) {
      console.error('❌ Error initializing missions in Firebase:', firebaseError);
      return res.status(500).json({ 
        error: 'Failed to initialize missions',
        details: firebaseError.message
      });
    }
    
  } catch (err) {
    console.error('💥 Error in initialize missions:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Main handler for Vercel
module.exports = async (req, res) => {
  console.log('🚀 Main handler called');
  console.log('📝 Request method:', req.method);
  console.log('📝 Request URL:', req.url);
  
  try {
    // Set CORS headers for production
    res.setHeader('Access-Control-Allow-Origin', 'https://www.pfcwhitelist.xyz');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Route handling
    if (req.url === '/ping' || req.url === '/ping/') {
      return await exports.ping(req, res);
    }
    
    if (req.url === '/api/debug/twitter' || req.url === '/api/debug/twitter/') {
      if (req.method === 'GET') {
        return await exports.debugTwitter(req, res);
      }
    }
    
    if (req.url === '/api/auth/twitter/authorize' || req.url === '/api/auth/twitter/authorize/') {
      if (req.method === 'GET') {
        return await exports.twitterOAuth2Authorize(req, res);
      }
    }
    
    // FIXED: Handle callback URL with query parameters
    if (req.url.startsWith('/auth/callback')) {
      if (req.method === 'GET') {
        console.log('🔄 OAuth callback detected, processing...');
        return await exports.twitterOAuth2Callback(req, res);
      }
    }
    
    if (req.url === '/api/auth/firebase' || req.url === '/api/auth/firebase/') {
      if (req.method === 'POST') {
        return await exports.firebaseAuth(req, res);
      }
    }

    if (req.url === '/api/user' || req.url === '/api/user/') {
      if (req.method === 'GET') {
        return await exports.getUser(req, res);
      }
    }
    
    if (req.url === '/api/missions' || req.url === '/api/missions/') {
      if (req.method === 'GET') {
        return await exports.getMissions(req, res);
      }
    }

    if (req.url === '/api/missions/initialize' || req.url === '/api/missions/initialize/') {
      if (req.method === 'POST') {
        return await exports.initializeMissions(req, res);
      }
    }

    if (req.url === '/api/user/stats' || req.url === '/api/user/stats/') {
      if (req.method === 'GET') {
        return await exports.getUserStats(req, res);
      }
    }
    
    if (req.url === '/api/logout' || req.url === '/api/logout/') {
      if (req.method === 'POST') {
        return await exports.logoutAlt(req, res);
      }
    }
    
    if (req.url === '/api/auth/logout' || req.url === '/api/auth/logout/') {
      if (req.method === 'POST') {
        return await exports.logoutAlt(req, res);
      }
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
