// --- IMPORTS Y CONFIGURACIÓN INICIAL ---
const { dbHelpers } = require('../backend/database');
const { auth: firebaseAdminAuth, db: firestoreDb } = require('../backend/firebase-admin');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// --- UTILS PKCE ---
function generateCodeVerifier() {
  // En producción, deberías guardar el code_verifier por usuario/estado
  return '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
}
function generateCodeChallenge() {
  const codeVerifier = generateCodeVerifier();
  const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64');
  return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// --- ENDPOINT: /api/auth/twitter/authorize ---
exports.twitterOAuth2Authorize = async (req, res) => {
  try {
    const clientId = process.env.TWITTER_CLIENT_ID;
    const redirectUri = 'https://www.pfcwhitelist.xyz/auth/callback';
    if (!clientId) return res.status(500).json({ error: 'Missing TWITTER_CLIENT_ID' });
    const state = Math.random().toString(36).substring(7);
    const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'tweet.read users.read');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('code_challenge', generateCodeChallenge());
    return res.json({ success: true, authUrl: authUrl.toString() });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate authorization URL', details: err.message });
  }
};

// --- ENDPOINT: /auth/callback ---
exports.twitterOAuth2Callback = async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).json({ error: 'Authorization code required' });
    // Intercambiar código por token
    const tokenResponse = await exchangeCodeForToken(code);
    if (!tokenResponse.success) return res.status(400).json({ error: 'Token exchange failed' });
    // Obtener perfil de usuario
    const userProfile = await getUserProfile(tokenResponse.accessToken);
    if (!userProfile.success) return res.status(400).json({ error: 'Failed to get user profile' });
    // Guardar usuario en Firebase
    const user = {
      id: userProfile.data.id,
      username: userProfile.data.username,
      displayName: userProfile.data.name,
      photo: userProfile.data.profile_image_url,
      accessToken: tokenResponse.accessToken,
      twitter: { id: userProfile.data.id, screenName: userProfile.data.username }
    };
    try {
      await dbHelpers.createOrUpdateUser({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        photo: user.photo,
        accessToken: user.accessToken
      });
    } catch {}
    // Generar JWT
    const token = jwt.sign(user, process.env.SESSION_SECRET || 'your-secret-key', { expiresIn: '24h' });
    // Redirigir a frontend
    const redirectUrl = `https://www.pfcwhitelist.xyz/?token=${encodeURIComponent(token)}`;
    return res.redirect(redirectUrl);
  } catch (err) {
    return res.redirect('https://www.pfcwhitelist.xyz/?error=oauth_failed');
  }
};

// --- FUNCIONES AUXILIARES ---
async function exchangeCodeForToken(code) {
  try {
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    const redirectUri = 'https://www.pfcwhitelist.xyz/auth/callback';
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
        code_verifier: codeVerifier
      })
    });
    if (!response.ok) return { success: false, error: await response.text() };
    const data = await response.json();
    return { success: true, accessToken: data.access_token, refreshToken: data.refresh_token };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function getUserProfile(accessToken) {
  try {
    const response = await fetch('https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) return { success: false };
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    return { success: false };
  }
}

// --- FUNCION AUXILIAR: Búsqueda inteligente de usuario en Firebase ---
async function findFirebaseUserId(decoded, firestoreDb) {
  // 1. Buscar por username exacto en users
  let usersSnapshot = await firestoreDb.collection('users').where('username', '==', decoded.username).get();
  if (!usersSnapshot.empty) {
    return usersSnapshot.docs[0].data().id;
  }
  // 2. Buscar por displayName en users
  let displayNameSnapshot = await firestoreDb.collection('users').where('displayName', '==', decoded.displayName || decoded.username).get();
  if (!displayNameSnapshot.empty) {
    return displayNameSnapshot.docs[0].data().id;
  }
  // 3. Buscar coincidencia parcial en users
  let allUsersSnapshot = await firestoreDb.collection('users').get();
  let bestMatch = null;
  let bestScore = 0;
  allUsersSnapshot.forEach(doc => {
    const userData = doc.data();
    if (userData.username) {
      const firebaseUsername = userData.username.toLowerCase();
      const jwtUsername = decoded.username.toLowerCase();
      let score = 0;
      if (firebaseUsername === jwtUsername) score = 100;
      else if (firebaseUsername.includes(jwtUsername)) score = 80;
      else if (jwtUsername.includes(firebaseUsername)) score = 70;
      else if (firebaseUsername.includes(jwtUsername.substring(0, Math.min(4, jwtUsername.length)))) score = 50;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { id: doc.id, ...userData, score };
      }
    }
  });
  if (bestMatch && bestScore >= 50) {
    return bestMatch.id;
  }
  // 4. Buscar en userProgress por username
  let userProgressSnapshot = await firestoreDb.collection('userProgress').where('username', '==', decoded.username).get();
  if (!userProgressSnapshot.empty) {
    return userProgressSnapshot.docs[0].data().userId;
  }
  // 5. Buscar coincidencia parcial en userProgress
  let allUserProgressSnapshot = await firestoreDb.collection('userProgress').get();
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
    return userProgressBestMatch.userId;
  }
  // 6. Fallback: usar el id del JWT
  return decoded.id;
}

// --- ENDPOINT: /api/missions ---
exports.getMissions = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token || req.query?.token;
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key');
    // --- Búsqueda inteligente de usuario en Firebase ---
    let firebaseUserId = await findFirebaseUserId(decoded, firestoreDb);
    // --- Buscar misiones completadas ---
    let completedMissions = [];
    let userProgressSnapshot = await firestoreDb.collection('userProgress').where('userId', '==', firebaseUserId).get();
    if (!userProgressSnapshot.empty) {
      const userProgress = userProgressSnapshot.docs[0].data();
      if (userProgress.completedMissions) completedMissions = Object.values(userProgress.completedMissions);
    }
    // --- Cargar misiones ---
    const missionsSnapshot = await firestoreDb.collection('missions').get();
    const missions = [];
    missionsSnapshot.forEach(doc => {
      const missionData = doc.data();
      const missionId = doc.id;
      const isCompleted = completedMissions.includes(parseInt(missionId)) || completedMissions.includes(missionId);
      missions.push({
        id: doc.id,
        title: missionData.title || 'Mission',
        description: missionData.description || 'Complete this mission',
        points: missionData.points || 10,
        completed: isCompleted,
        type: missionData.type || 'general',
        requirements: missionData.requirements || [],
        ...missionData
      });
    });
    return res.json({ success: true, missions, count: missions.length, completedMissions });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// --- ENDPOINT: /api/user/stats ---
exports.getUserStats = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token || req.query?.token;
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key');
    console.log('🔍 [STATS] JWT username:', decoded.username);
    console.log('🔍 [STATS] JWT displayName:', decoded.displayName);
    let firebaseUserId = await findFirebaseUserId(decoded, firestoreDb);
    console.log('🔍 [STATS] Firebase userId found:', firebaseUserId);
    let completedMissions = [];
    let totalPoints = 0;
    let userWallet = null;
    let userProgressSnapshot = await firestoreDb.collection('userProgress').where('userId', '==', firebaseUserId).get();
    if (!userProgressSnapshot.empty) {
      const userProgress = userProgressSnapshot.docs[0].data();
      console.log('🔍 [STATS] userProgress found:', userProgress);
      if (userProgress.completedMissions) completedMissions = Object.values(userProgress.completedMissions);
      totalPoints = userProgress.totalPoints || 0;
    } else {
      console.log('⚠️ [STATS] No userProgress found for userId:', firebaseUserId);
    }
    let userWalletSnapshot = await firestoreDb.collection('userWallets').where('userId', '==', firebaseUserId).get();
    if (!userWalletSnapshot.empty) {
      userWallet = userWalletSnapshot.docs[0].data();
      console.log('🔍 [STATS] userWallet found:', userWallet);
    } else {
      console.log('⚠️ [STATS] No userWallet found for userId:', firebaseUserId);
    }
    const missionsSnapshot = await firestoreDb.collection('missions').get();
    const allMissions = [];
    missionsSnapshot.forEach(doc => { allMissions.push(doc.data()); });
    completedMissions = [...new Set(completedMissions)];
    const stats = {
      totalPoints,
      completedMissions: completedMissions.length,
      totalMissions: allMissions.length,
      pendingMissions: allMissions.length - completedMissions.length,
      completedMissionIds: completedMissions,
      userWallet,
      allMissions,
      firebaseUserId
    };
    console.log('✅ [STATS] Final stats:', stats);
    return res.json({ success: true, stats });
  } catch (err) {
    console.error('💥 [STATS] Error:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// --- ENDPOINT: /api/user ---
exports.getUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token || req.query?.token;
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key');
    return res.json({ user: {
      id: decoded.id,
      username: decoded.username,
      displayName: decoded.displayName,
      photo: decoded.photo
    }});
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// --- ENDPOINT: /api/debug/userdata ---
exports.debugUserData = async (req, res) => {
  try {
    const userProgressSnapshot = await firestoreDb.collection('userProgress').get();
    const userWalletsSnapshot = await firestoreDb.collection('userWallets').get();
    const userProgress = [];
    userProgressSnapshot.forEach(doc => userProgress.push({ id: doc.id, ...doc.data() }));
    const userWallets = [];
    userWalletsSnapshot.forEach(doc => userWallets.push({ id: doc.id, ...doc.data() }));
    return res.json({ userProgress, userWallets });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// --- HANDLER PRINCIPAL PARA VERCEL ---
module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://www.pfcwhitelist.xyz');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  // Routing
  if (req.url === '/api/auth/twitter/authorize') return exports.twitterOAuth2Authorize(req, res);
  if (req.url.startsWith('/auth/callback')) return exports.twitterOAuth2Callback(req, res);
  if (req.url === '/api/missions') return exports.getMissions(req, res);
  if (req.url === '/api/user/stats') return exports.getUserStats(req, res);
  if (req.url === '/api/user') return exports.getUser(req, res);
  if (req.url === '/api/debug/userdata') return exports.debugUserData(req, res);
  // Ping
  if (req.url === '/ping') return res.json({ message: 'pong', status: 'working' });
  // Default
  return res.status(404).json({ error: 'This endpoint exists but has no specific handler' });
};
