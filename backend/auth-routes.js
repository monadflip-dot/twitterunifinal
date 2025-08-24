const express = require('express');
const jwt = require('jsonwebtoken');
const { auth: firebaseAdminAuth } = require('./firebase-admin');
const { dbHelpers } = require('./database');

const router = express.Router();

// Firebase Auth login endpoint (from frontend)
router.post('/firebase', async (req, res) => {
  console.log('📱 /api/auth/firebase endpoint called');
  try {
    const { idToken, twitterAccessToken, twitterAccessSecret, profile } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ error: 'Missing Firebase ID token' });
    }

    // Verify Firebase ID token
    const decoded = await firebaseAdminAuth.verifyIdToken(idToken);
    console.log('✅ Firebase ID token verified for uid:', decoded.uid);

    // Check if user has Twitter access token
    if (!twitterAccessToken) {
      console.log('⚠️ No Twitter access token, redirecting to Twitter OAuth');
      return res.json({ 
        success: false, 
        action: 'redirect_to_twitter',
        message: 'Twitter authentication required'
      });
    }

    // Build user object (prefer Twitter profile info if available)
    const user = {
      id: decoded.uid, // Always use Firebase UID for identity
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
    console.log('🔑 Twitter access token available:', !!user.accessToken);

    // Persist basic user info (tokens remain in JWT)
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

    // Issue our JWT session cookie
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
      token: token // Enviar el token en la respuesta para que el frontend lo guarde
    });
  } catch (err) {
    console.error('💥 Error in /api/auth/firebase:', err);
    return res.status(401).json({ error: 'Firebase auth failed' });
  }
});

// Add explicit logout to clear JWT cookie
router.post('/logout', (req, res) => {
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

module.exports = router;
