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
    
    // FIXED: Use consistent PKCE code verifier
    const codeVerifier = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
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
  const codeVerifier = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
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
    console.log('🔍 JWT user ID:', decoded.id);
    
    try {
      // 1. IMPROVED: Smart user search with multiple fallback strategies
      let firebaseUserId = null;
      try {
        console.log('🔍 Smart user search in Firebase for missions...');
        
        // Strategy 1: Search by exact username match in users collection
        let usersSnapshot = await firestoreDb
          .collection('users')
          .where('username', '==', decoded.username)
          .get();
        
        if (!usersSnapshot.empty) {
          const userData = usersSnapshot.docs[0].data();
          firebaseUserId = userData.id;
          console.log('✅ Found user by exact username match in users collection for missions:', userData.username, 'Firebase ID:', firebaseUserId);
        } else {
          console.log('⚠️ No exact username match in users collection for missions, trying smart partial search...');
          
          // Strategy 2: Smart partial username search across ALL collections
          const allUsersSnapshot = await firestoreDb.collection('users').get();
          let bestMatch = null;
          let bestScore = 0;
          
          allUsersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.username) {
              const firebaseUsername = userData.username.toLowerCase();
              const jwtUsername = decoded.username.toLowerCase();
              
              // Calculate match score
              let score = 0;
              
              // Exact match gets highest score
              if (firebaseUsername === jwtUsername) {
                score = 100;
              }
              // JWT username is contained in Firebase username (e.g., "Robux" in "RobuxMemeCoin")
              else if (firebaseUsername.includes(jwtUsername)) {
                score = 80;
              }
              // Firebase username is contained in JWT username
              else if (jwtUsername.includes(firebaseUsername)) {
                score = 70;
              }
              // Partial overlap
              else if (firebaseUsername.includes(jwtUsername.substring(0, Math.min(4, jwtUsername.length)))) {
                score = 50;
              }
              // Check if displayName matches
              else if (userData.displayName && userData.displayName.toLowerCase() === jwtUsername) {
                score = 60;
              }
              
              if (score > bestScore) {
                bestScore = score;
                bestMatch = { id: doc.id, ...userData, score };
              }
            }
          });
          
          if (bestMatch && bestScore >= 50) {
            firebaseUserId = bestMatch.id;
            console.log('✅ Found user by smart partial match in users collection for missions:', bestMatch.username, 'Score:', bestScore, 'Firebase ID:', firebaseUserId);
          } else {
            console.log('⚠️ No smart match found in users collection for missions, trying displayName search...');
            
            // Strategy 3: Search by displayName in users collection
            const displayNameSnapshot = await firestoreDb
              .collection('users')
              .where('displayName', '==', decoded.displayName || decoded.username)
              .get();
            
            if (!displayNameSnapshot.empty) {
              const userData = displayNameSnapshot.docs[0].data();
              firebaseUserId = userData.id;
              console.log('✅ Found user by displayName match in users collection for missions:', userData.displayName, 'Firebase ID:', firebaseUserId);
            } else {
              console.log('⚠️ No displayName match in users collection for missions, trying userProgress collection...');
              
              // Strategy 4: Search in userProgress collection by username
              try {
                const userProgressSearchSnapshot = await firestoreDb
                  .collection('userProgress')
                  .where('username', '==', decoded.username)
                  .get();
                
                if (!userProgressSearchSnapshot.empty) {
                  const userProgressData = userProgressSearchSnapshot.docs[0].data();
                  firebaseUserId = userProgressData.userId;
                  console.log('✅ Found user by username in userProgress collection for missions:', userProgressData.username, 'Firebase ID:', firebaseUserId);
                } else {
                  console.log('⚠️ No username match in userProgress collection for missions, trying partial match...');
                  
                  // Strategy 5: Partial search in userProgress collection
                  const allUserProgressSnapshot = await firestoreDb.collection('userProgress').get();
                  let userProgressBestMatch = null;
                  let userProgressBestScore = 0;
                  
                  allUserProgressSnapshot.forEach(doc => {
                    const userProgressData = doc.data();
                    if (userProgressData.username) {
                      const firebaseUsername = userProgressData.username.toLowerCase();
                      const jwtUsername = decoded.username.toLowerCase();
                      
                      let score = 0;
                      if (firebaseUsername === jwtUsername) score = 100;
                      else if (firebaseUsername.includes(jwtUsername)) score = 80;
                      else if (jwtUsername.includes(firebaseUsername)) score = 70;
                      else if (firebaseUsername.includes(jwtUsername.substring(0, Math.min(4, jwtUsername.length)))) score = 50;
                      
                      if (score > userProgressBestScore) {
                        userProgressBestScore = score;
                        userProgressBestMatch = { ...userProgressData, score };
                      }
                    }
                  });
                  
                  if (userProgressBestMatch && userProgressBestScore >= 50) {
                    firebaseUserId = userProgressBestMatch.userId;
                    console.log('✅ Found user by partial match in userProgress collection for missions:', userProgressBestMatch.username, 'Score:', userProgressBestScore, 'Firebase ID:', firebaseUserId);
                  } else {
                    console.log('⚠️ No match found in any collection for missions, using JWT ID as fallback...');
                    firebaseUserId = decoded.id;
                  }
                }
              } catch (userProgressError) {
                console.log('⚠️ Error searching userProgress collection for missions:', userProgressError.message);
                firebaseUserId = decoded.id;
              }
            }
          }
        }
        
      } catch (error) {
        console.log('⚠️ Error in smart user search for missions:', error.message);
        firebaseUserId = decoded.id;
      }
      
      console.log('🎯 Final Firebase User ID for missions queries:', firebaseUserId);
      
      // 2. First try userProgress collection (aggregated data)
      try {
        const userProgressSnapshot = await firestoreDb
          .collection('userProgress')
          .where('userId', '==', firebaseUserId)
          .get();
        
        if (!userProgressSnapshot.empty) {
          const userProgress = userProgressSnapshot.docs[0].data();
          console.log('✅ User progress found in userProgress collection for missions');
          
          // Get completed missions from userProgress
          if (userProgress.completedMissions) {
            // Convert object values to array of mission IDs
            completedMissions = Object.values(userProgress.completedMissions);
            console.log('✅ Completed missions from userProgress for missions endpoint:', completedMissions);
          }
        }
      } catch (error) {
        console.log('⚠️ userProgress collection not accessible for missions:', error.message);
      }
      
      // 3. If no data in userProgress, check user_progress collection (individual records)
      if (completedMissions.length === 0) {
        try {
          console.log('🔍 Checking user_progress collection for individual mission records in missions endpoint...');
          const userProgressIndividualSnapshot = await firestoreDb
            .collection('user_progress')
            .where('userId', '==', firebaseUserId)
            .get();
          
          if (!userProgressIndividualSnapshot.empty) {
            console.log('✅ Found individual mission records in user_progress for missions endpoint');
            
            userProgressIndividualSnapshot.forEach(doc => {
              const missionData = doc.data();
              if (missionData.missionId) {
                completedMissions.push(missionData.missionId);
                console.log('✅ Mission completed (missions endpoint):', missionData.missionId);
              }
            });
          }
        } catch (error) {
          console.log('⚠️ user_progress collection not accessible for missions:', error.message);
        }
      }
      
      // Remove duplicates and ensure we have unique mission IDs
      completedMissions = [...new Set(completedMissions)];
      console.log('✅ Final completed missions for missions endpoint:', completedMissions);
      
      // Get missions from Firebase
      const missionsSnapshot = await firestoreDb.collection('missions').get();
      const missions = [];
      
      missionsSnapshot.forEach(doc => {
        const missionData = doc.data();
        const missionId = doc.id;
        
        // Check if this mission is completed by the user
        const isCompleted = completedMissions.includes(parseInt(missionId)) || 
                           completedMissions.includes(missionId);
        
        missions.push({
          id: doc.id,
          title: missionData.title || 'Mission',
          description: missionData.description || 'Complete this mission',
          points: missionData.points || 10,
          completed: isCompleted, // Use the real completion status
          type: missionData.type || 'general',
          requirements: missionData.requirements || [],
          ...missionData
        });
      });
      
      console.log('✅ Missions loaded from Firebase with completion status:', missions.length);
      console.log('✅ Completed missions count in missions endpoint:', missions.filter(m => m.completed).length);
      
      return res.json({
        success: true,
        missions: missions,
        count: missions.length,
        completedMissions: completedMissions,
        userProgress: { completedMissions: completedMissions },
        firebaseUserId: firebaseUserId,
        searchStrategy: 'multiple_strategies_used'
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
    console.log('🔍 JWT user ID:', decoded.id);
    console.log('🔍 JWT displayName:', decoded.displayName);
    
    try {
      // FIXED: Check ALL possible collections for user progress
      let userProgress = null;
      let completedMissions = [];
      let totalPoints = 0;
      let userWallet = null;
      
      // 1. IMPROVED: Smart user search with multiple fallback strategies
      let firebaseUserId = null;
      try {
        console.log('🔍 Smart user search in Firebase...');
        
        // Strategy 1: Search by exact username match in users collection
        let usersSnapshot = await firestoreDb
          .collection('users')
          .where('username', '==', decoded.username)
          .get();
        
        if (!usersSnapshot.empty) {
          const userData = usersSnapshot.docs[0].data();
          firebaseUserId = userData.id;
          console.log('✅ Found user by exact username match in users collection:', userData.username, 'Firebase ID:', firebaseUserId);
        } else {
          console.log('⚠️ No exact username match in users collection, trying smart partial search...');
          
          // Strategy 2: Smart partial username search across ALL collections
          const allUsersSnapshot = await firestoreDb.collection('users').get();
          let bestMatch = null;
          let bestScore = 0;
          
          allUsersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.username) {
              const firebaseUsername = userData.username.toLowerCase();
              const jwtUsername = decoded.username.toLowerCase();
              
              // Calculate match score
              let score = 0;
              
              // Exact match gets highest score
              if (firebaseUsername === jwtUsername) {
                score = 100;
              }
              // JWT username is contained in Firebase username (e.g., "Robux" in "RobuxMemeCoin")
              else if (firebaseUsername.includes(jwtUsername)) {
                score = 80;
              }
              // Firebase username is contained in JWT username
              else if (jwtUsername.includes(firebaseUsername)) {
                score = 70;
              }
              // Partial overlap
              else if (firebaseUsername.includes(jwtUsername.substring(0, Math.min(4, jwtUsername.length))) {
                score = 50;
              }
              // Check if displayName matches
              else if (userData.displayName && userData.displayName.toLowerCase() === jwtUsername) {
                score = 60;
              }
              
              if (score > bestScore) {
                bestScore = score;
                bestMatch = { id: doc.id, ...userData, score };
              }
            }
          });
          
          if (bestMatch && bestScore >= 50) {
            firebaseUserId = bestMatch.id;
            console.log('✅ Found user by smart partial match in users collection:', bestMatch.username, 'Score:', bestScore, 'Firebase ID:', firebaseUserId);
          } else {
            console.log('⚠️ No smart match found in users collection, trying displayName search...');
            
            // Strategy 3: Search by displayName in users collection
            const displayNameSnapshot = await firestoreDb
              .collection('users')
              .where('displayName', '==', decoded.displayName || decoded.username)
              .get();
            
            if (!displayNameSnapshot.empty) {
              const userData = displayNameSnapshot.docs[0].data();
              firebaseUserId = userData.id;
              console.log('✅ Found user by displayName match in users collection:', userData.displayName, 'Firebase ID:', firebaseUserId);
            } else {
              console.log('⚠️ No displayName match in users collection, trying userProgress collection...');
              
              // Strategy 4: Search in userProgress collection by username
              try {
                const userProgressSearchSnapshot = await firestoreDb
                  .collection('userProgress')
                  .where('username', '==', decoded.username)
                  .get();
                
                if (!userProgressSearchSnapshot.empty) {
                  const userProgressData = userProgressSearchSnapshot.docs[0].data();
                  firebaseUserId = userProgressData.userId;
                  console.log('✅ Found user by username in userProgress collection:', userProgressData.username, 'Firebase ID:', firebaseUserId);
                } else {
                  console.log('⚠️ No username match in userProgress collection, trying partial match...');
                  
                  // Strategy 5: Partial search in userProgress collection
                  const allUserProgressSnapshot = await firestoreDb.collection('userProgress').get();
                  let userProgressBestMatch = null;
                  let userProgressBestScore = 0;
                  
                  allUserProgressSnapshot.forEach(doc => {
                    const userProgressData = doc.data();
                    if (userProgressData.username) {
                      const firebaseUsername = userProgressData.username.toLowerCase();
                      const jwtUsername = decoded.username.toLowerCase();
                      
                      let score = 0;
                      if (firebaseUsername === jwtUsername) score = 100;
                      else if (firebaseUsername.includes(jwtUsername)) score = 80;
                      else if (jwtUsername.includes(firebaseUsername)) score = 70;
                      else if (firebaseUsername.includes(jwtUsername.substring(0, Math.min(4, jwtUsername.length)))) score = 50;
                      
                      if (score > userProgressBestScore) {
                        userProgressBestScore = score;
                        userProgressBestMatch = { ...userProgressData, score };
                      }
                    }
                  });
                  
                  if (userProgressBestMatch && userProgressBestScore >= 50) {
                    firebaseUserId = userProgressBestMatch.userId;
                    console.log('✅ Found user by partial match in userProgress collection:', userProgressBestMatch.username, 'Score:', userProgressBestScore, 'Firebase ID:', firebaseUserId);
                  } else {
                    console.log('⚠️ No match found in any collection, using JWT ID as fallback...');
                    firebaseUserId = decoded.id;
                  }
                }
              } catch (userProgressError) {
                console.log('⚠️ Error searching userProgress collection:', userProgressError.message);
                firebaseUserId = decoded.id;
              }
            }
          }
        }
        
      } catch (error) {
        console.log('⚠️ Error in smart user search:', error.message);
        firebaseUserId = decoded.id;
      }
      
      console.log('🎯 Final Firebase User ID for queries:', firebaseUserId);
      
      // 2. Check userProgress collection (aggregated data)
      try {
        const userProgressSnapshot = await firestoreDb
          .collection('userProgress')
          .where('userId', '==', firebaseUserId)
          .get();
        
        if (!userProgressSnapshot.empty) {
          userProgress = userProgressSnapshot.docs[0].data();
          console.log('✅ User progress found in userProgress collection:', userProgress);
          
          // Get completed missions from userProgress
          if (userProgress.completedMissions) {
            // Convert object values to array of mission IDs
            completedMissions = Object.values(userProgress.completedMissions);
            console.log('✅ Completed missions from userProgress:', completedMissions);
          }
          
          totalPoints = userProgress.totalPoints || 0;
          console.log('✅ Total points from userProgress:', totalPoints);
        }
      } catch (error) {
        console.log('⚠️ userProgress collection not accessible:', error.message);
      }
      
      // 3. If no data in userProgress, check user_progress collection (individual records)
      if (completedMissions.length === 0) {
        try {
          console.log('🔍 Checking user_progress collection for individual mission records...');
          const userProgressIndividualSnapshot = await firestoreDb
            .collection('user_progress')
            .where('userId', '==', firebaseUserId)
            .get();
          
          if (!userProgressIndividualSnapshot.empty) {
            console.log('✅ Found individual mission records in user_progress');
            
            userProgressIndividualSnapshot.forEach(doc => {
              const missionData = doc.data();
              if (missionData.missionId) {
                completedMissions.push(missionData.missionId);
                console.log('✅ Mission completed:', missionData.missionId, 'Points:', missionData.pointsEarned);
              }
            });
            
            // Calculate total points from individual records
            totalPoints = userProgressIndividualSnapshot.docs.reduce((sum, doc) => {
              const data = doc.data();
              return sum + (data.pointsEarned || 0);
            }, 0);
            
            console.log('✅ Total points calculated from individual records:', totalPoints);
          }
        } catch (error) {
          console.log('⚠️ user_progress collection not accessible:', error.message);
        }
      }
      
      // 4. If still no data, check user_stats collection
      if (completedMissions.length === 0) {
        try {
          console.log('🔍 Checking user_stats collection...');
          const userStatsSnapshot = await firestoreDb
            .collection('user_stats')
            .where('userId', '==', firebaseUserId)
            .get();
          
          if (!userStatsSnapshot.empty) {
            const userStats = userStatsSnapshot.docs[0].data();
            console.log('✅ User stats found:', userStats);
            
            totalPoints = userStats.totalPoints || 0;
            // Note: user_stats might not have individual mission IDs
          }
        } catch (error) {
          console.log('⚠️ user_stats collection not accessible:', error.message);
        }
      }
      
      // 5. Check for user wallet
      try {
        console.log('🔍 Checking userWallets collection...');
        const userWalletSnapshot = await firestoreDb
          .collection('userWallets')
          .where('userId', '==', firebaseUserId)
          .get();
        
        if (!userWalletSnapshot.empty) {
          userWallet = userWalletSnapshot.docs[0].data();
          console.log('✅ User wallet found:', userWallet.wallet);
        } else {
          console.log('⚠️ No wallet found for user');
        }
      } catch (error) {
        console.log('⚠️ userWallets collection not accessible:', error.message);
      }
      
      // Get all missions to calculate stats
      const missionsSnapshot = await firestoreDb.collection('missions').get();
      const allMissions = [];
      missionsSnapshot.forEach(doc => {
        allMissions.push(doc.data());
      });
      
      // Remove duplicates and ensure we have unique mission IDs
      completedMissions = [...new Set(completedMissions)];
      
      const stats = {
        totalPoints: totalPoints,
        completedMissions: completedMissions.length,
        totalMissions: allMissions.length,
        pendingMissions: allMissions.length - completedMissions.length,
        completedMissionIds: completedMissions, // Array of completed mission IDs
        userProgress: userProgress,
        userWallet: userWallet,
        allMissions: allMissions,
        firebaseUserId: firebaseUserId,
        searchStrategy: 'smart_search_with_fallbacks'
      };
      
      console.log('✅ Final user stats calculated:', stats);
      console.log('✅ Completed mission IDs:', completedMissions);
      console.log('✅ User wallet:', userWallet ? userWallet.wallet : 'None');
      
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
