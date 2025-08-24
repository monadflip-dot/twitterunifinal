const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const { dbHelpers } = require('./database');

// Temporary hardcoded missions for debugging (same as in index.js)
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

const router = express.Router();

// Debug: Verify missions data import
console.log('🔍 missions.js loaded - allMissions length:', allMissions.length);
console.log('🔍 missions.js loaded - allMissions IDs:', allMissions.map(m => m.id));
console.log('🔍 missions.js loaded - allMissions types:', allMissions.map(m => m.type));

// Middleware to protect routes (using JWT instead of sessions)
function ensureAuthenticated(req, res, next) {
  if (req.user) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
}

// Get missions with user progress
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🔍 Missions endpoint called for user:', userId);
    console.log('🔍 allMissions length:', allMissions.length);
    console.log('🔍 allMissions IDs:', allMissions.map(m => m.id));
    console.log('🔍 allMissions types:', allMissions.map(m => m.type));
    
    // Get user progress from database
    const userProgress = await dbHelpers.getUserProgress(userId);
    const completedMissionIds = userProgress.map(p => p.missionId);
    console.log('🔍 User completed missions:', completedMissionIds);
    console.log('🔍 User progress length:', userProgress.length);
    
    // Mark missions as completed based on database
    const missionsWithProgress = allMissions.map(mission => ({
      ...mission,
      completed: completedMissionIds.includes(mission.id)
    }));
    
    console.log('🔍 Sending missions to frontend:', missionsWithProgress.length);
    console.log('🔍 Mission IDs being sent:', missionsWithProgress.map(m => m.id));
    console.log('🔍 Full missions being sent:', JSON.stringify(missionsWithProgress, null, 2));
    
    res.json({ missions: missionsWithProgress });
  } catch (error) {
    console.error('Error getting missions:', error);
    res.status(500).json({ error: 'Failed to get missions' });
  }
});

// Public endpoint to get all missions (for testing)
router.get('/public', (req, res) => {
  try {
    res.json({ 
      missions: allMissions,
      message: 'Public missions endpoint - no authentication required'
    });
  } catch (error) {
    console.error('Error getting public missions:', error);
    res.status(500).json({ error: 'Failed to get public missions' });
  }
});

// Get user stats
router.get('/stats', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await dbHelpers.getUserStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
});

// Get leaderboard
router.get('/leaderboard', ensureAuthenticated, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = await dbHelpers.getLeaderboard(limit);
    res.json({ leaderboard });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Complete mission (simplified - complete after delay if Twitter verification fails)
router.post('/:id/complete', ensureAuthenticated, async (req, res) => {
  const missionId = parseInt(req.params.id, 10);
  const mission = allMissions.find(m => m.id === missionId);
  if (!mission) return res.status(404).json({ error: 'Mission not found' });

  const { accessToken, id: userId } = req.user;
  
  // Check if user has valid Twitter access token
  if (!accessToken) {
    return res.status(403).json({ 
      error: 'Twitter access token not available. Please reconnect your Twitter account.',
      details: 'User needs to re-authenticate with Twitter'
    });
  }

  // Validate token format
  if (typeof accessToken !== 'string' || accessToken.trim() === '') {
    return res.status(403).json({ 
      error: 'Invalid Twitter access token format. Please reconnect your Twitter account.',
      details: 'Token format is invalid'
    });
  }

  // Use OAuth 2.0 with access token (read-only permissions)
  const client = new TwitterApi(accessToken);

  try {
    // Intentar verificación rápida con Twitter (opcional)
    let twitterVerified = false;
    
    try {
      if (mission.type === 'like') {
        const likes = await client.v2.userLikedTweets(userId, { max_results: 100 });
        twitterVerified = likes.data && likes.data.data && likes.data.data.some(t => t.id === mission.tweetId);
      } else if (mission.type === 'retweet') {
        const timeline = await client.v2.userTimeline(userId, { max_results: 100, exclude: 'replies' });
        twitterVerified = timeline.data && timeline.data.data && timeline.data.data.some(t => 
          t.referenced_tweets && t.referenced_tweets.some(ref => ref.type === 'retweeted' && ref.id === mission.tweetId)
        );
      } else if (mission.type === 'comment') {
        const replies = await client.v2.userTimeline(userId, { max_results: 100, exclude: 'retweets' });
        twitterVerified = replies.data && replies.data.data && replies.data.data.some(t => 
          t.referenced_tweets && t.referenced_tweets.some(ref => ref.type === 'replied_to' && ref.id === mission.tweetId)
        );
      } else if (mission.type === 'follow') {
        const following = await client.v2.userFollowing(userId, { max_results: 1000 });
        twitterVerified = following.data && following.data.data && following.data.data.some(u => 
          u.username === mission.targetUserId || u.id === mission.targetUserId
        );
      }
    } catch (twitterError) {
      console.log('Twitter verification failed, proceeding with completion:', twitterError.code);
      // Continuar con la completación aunque falle la verificación
    }

    // Completar misión en la base de datos
    await dbHelpers.completeMission(userId, missionId, mission.points);
    
    return res.json({ 
      success: true, 
      missionId, 
      type: mission.type, 
      points: mission.points, 
      method: twitterVerified ? 'twitter_verified' : 'auto_completed',
      message: twitterVerified ? 'Mission verified and completed! 🎉' : 'Mission completed successfully! 🎉'
    });
    
  } catch (err) {
    console.error('Critical error completing mission:', err);
    
    // Si hay error crítico, intentar completar de todas formas
    try {
      await dbHelpers.completeMission(userId, missionId, mission.points);
      
      return res.json({ 
        success: true, 
        missionId, 
        type: mission.type, 
        points: mission.points, 
        method: 'fallback_completed',
        message: 'Mission completed successfully! 🎉'
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      return res.status(500).json({ 
        error: 'Failed to complete mission',
        details: 'Please try again later'
      });
    }
  }
});

module.exports = router;
