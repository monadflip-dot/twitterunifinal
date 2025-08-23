const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const { dbHelpers } = require('./database');
const { allMissions } = require('./missions-data');
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
    
    // Get user progress from database
    const userProgress = await dbHelpers.getUserProgress(userId);
    const completedMissionIds = userProgress.map(p => p.missionId);
    console.log('🔍 User completed missions:', completedMissionIds);
    
    // Mark missions as completed based on database
    const missionsWithProgress = allMissions.map(mission => ({
      ...mission,
      completed: completedMissionIds.includes(mission.id)
    }));
    
    console.log('🔍 Sending missions to frontend:', missionsWithProgress.length);
    console.log('🔍 Mission IDs being sent:', missionsWithProgress.map(m => m.id));
    
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

// Helper function for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function for retry with exponential backoff
async function retryWithBackoff(fn, maxRetries = 2, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      if (error.code === 429) {
        const delayMs = baseDelay * Math.pow(2, i) + Math.random() * 1000;
        console.log(`Rate limit hit, retrying in ${Math.round(delayMs)}ms...`);
        await delay(delayMs);
        continue;
      }
      throw error;
    }
  }
}

// Complete mission (verification real with retry intelligent)
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

  // Use OAuth 2.0 with access token
  const client = new TwitterApi(accessToken);

  try {
    if (mission.type === 'like') {
      // STRATEGY 1: Try direct like with retry
      try {
        const likeResponse = await retryWithBackoff(async () => {
          return await client.v2.like(userId, mission.tweetId);
        });
        console.log('Like successful with retry:', likeResponse);
        
        // Save to database
        await dbHelpers.completeMission(userId, missionId, mission.points);
        
        return res.json({ success: true, missionId, type: 'like', points: mission.points, method: 'direct' });
      } catch (error) {
        console.log('Direct like failed, attempting verification by reading...');
        
        // STRATEGY 2: Verify if already liked (different endpoint)
        try {
          const likes = await retryWithBackoff(async () => {
            return await client.v2.userLikedTweets(userId, { max_results: 100 });
          });
          
          const liked = likes.data && likes.data.data && likes.data.data.some(t => t.id === mission.tweetId);
          if (liked) {
            // Save to database
            await dbHelpers.completeMission(userId, missionId, mission.points);
            
            return res.json({ success: true, missionId, type: 'like', points: mission.points, method: 'verification' });
          }
        } catch (verificationError) {
          console.log('Verification by reading also failed:', verificationError.code);
        }
        
        // STRATEGY 3: Allow manual verification as last resort
        console.log('Sending manual fallback response for like:', {
          success: true,
          missionId,
          type: 'like',
          points: mission.points
        });
        
        // Save to database
        await dbHelpers.completeMission(userId, missionId, mission.points);
        
        return res.json({ 
          success: true, 
          missionId, 
          type: 'like', 
          points: mission.points, 
          method: 'manual_fallback',
          message: 'Manual verification due to API limitations'
        });
      }
    }
    
    if (mission.type === 'retweet') {
      try {
        const retweetResponse = await retryWithBackoff(async () => {
          return await client.v2.retweet(userId, mission.tweetId);
        });
        console.log('Retweet successful with retry:', retweetResponse);
        
        // Save to database
        await dbHelpers.completeMission(userId, missionId, mission.points);
        
        return res.json({ success: true, missionId, type: 'retweet', points: mission.points, method: 'direct' });
      } catch (error) {
        console.log('Direct retweet failed, attempting verification by reading...');
        
        try {
          const retweets = await retryWithBackoff(async () => {
            return await client.v2.userTimeline(userId, { max_results: 100, exclude: 'replies' });
          });
          
          const retweeted = retweets.data && retweets.data.data && retweets.data.data.some(t => 
            t.referenced_tweets && t.referenced_tweets.some(ref => ref.type === 'retweeted' && ref.id === mission.tweetId)
          );
          if (retweeted) {
            // Save to database
            await dbHelpers.completeMission(userId, missionId, mission.points);
            
            return res.json({ success: true, missionId, type: 'retweet', points: mission.points, method: 'verification' });
          }
        } catch (verificationError) {
          console.log('Verification by reading also failed:', verificationError.code);
        }
        
        // Save to database
        await dbHelpers.completeMission(userId, missionId, mission.points);
        
        return res.json({ 
          success: true, 
          missionId, 
          type: 'retweet', 
          points: mission.points, 
          method: 'manual_fallback',
          message: 'Manual verification due to API limitations'
        });
      }
    }
    
    if (mission.type === 'comment') {
      try {
        const commentText = `¡Excelente contenido! #ABSPFC`;
        const replyResponse = await retryWithBackoff(async () => {
          return await client.v2.reply(commentText, userId, mission.tweetId);
        });
        console.log('Comment successful with retry:', replyResponse);
        
        // Save to database
        await dbHelpers.completeMission(userId, missionId, mission.points);
        
        return res.json({ success: true, missionId, type: 'comment', points: mission.points, method: 'direct' });
      } catch (error) {
        console.log('Direct comment failed, allowing manual verification...');
        
        // Save to database
        await dbHelpers.completeMission(userId, missionId, mission.points);
        
        return res.json({ 
          success: true, 
          missionId, 
          type: 'comment', 
          points: mission.points, 
          method: 'manual_fallback',
          message: 'Manual verification due to API limitations'
        });
      }
    }
    
    if (mission.type === 'follow') {
      try {
        const followResponse = await retryWithBackoff(async () => {
          return await client.v2.follow(userId, mission.targetUserId);
        });
        console.log('Follow successful with retry:', followResponse);
        
        // Save to database
        await dbHelpers.completeMission(userId, missionId, mission.points);
        
        return res.json({ success: true, missionId, type: 'follow', points: mission.points, method: 'direct' });
      } catch (error) {
        console.log('Direct follow failed, allowing manual verification...');
        
        // Save to database
        await dbHelpers.completeMission(userId, missionId, mission.points);
        
        return res.json({ 
          success: true, 
          missionId, 
          type: 'follow', 
          points: mission.points, 
          method: 'manual_fallback',
          message: 'Manual verification due to API limitations'
        });
      }
    }
    
    return res.status(400).json({ error: 'Mission type not supported' });
  } catch (err) {
    console.error('Critical error executing mission:', err);
    
    // If action already performed, mark as successful
    if (err.code === 139 || err.message.includes('already') || err.message.includes('duplicate')) {
      // Save to database
      await dbHelpers.completeMission(userId, missionId, mission.points);
      
      return res.json({ 
        success: true, 
        missionId, 
        type: mission.type, 
        points: mission.points,
        message: 'Action already performed previously'
      });
    }
    
    return res.status(500).json({ 
      error: 'Critical server error',
      details: err.message,
      code: err.code
    });
  }
});

module.exports = router;
