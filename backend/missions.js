const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const router = express.Router();

// Middleware para proteger rutas
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'No autenticado' });
}

// Misiones específicas con la publicación de ABSPFC
const exampleMissions = [
  { 
    id: 1, 
    type: 'like', 
    description: 'Dale like al tweet de ABSPFC sobre el partido', 
    tweetId: '1957149650118377661', 
    points: 50,
    completed: false,
    tweetUrl: 'https://x.com/ABSPFC/status/1957149650118377661'
  },
  { 
    id: 2, 
    type: 'retweet', 
    description: 'Haz retweet al tweet de ABSPFC', 
    tweetId: '1957149650118377661', 
    points: 75,
    completed: false,
    tweetUrl: 'https://x.com/ABSPFC/status/1957149650118377661'
  },
  { 
    id: 3, 
    type: 'comment', 
    description: 'Comenta en el tweet de ABSPFC', 
    tweetId: '1957149650118377661', 
    points: 100,
    completed: false,
    tweetUrl: 'https://x.com/ABSPFC/status/1957149650118377661'
  },
];

// Obtener misiones
router.get('/', ensureAuthenticated, (req, res) => {
  res.json({ missions: exampleMissions });
});

// Completar misión (verificación real)
router.post('/:id/complete', ensureAuthenticated, async (req, res) => {
  const missionId = parseInt(req.params.id, 10);
  const mission = exampleMissions.find(m => m.id === missionId);
  if (!mission) return res.status(404).json({ error: 'Misión no encontrada' });

  const { token, tokenSecret, id: userId } = req.user;
  const client = new TwitterApi({
    appKey: process.env.TWITTER_CONSUMER_KEY,
    appSecret: process.env.TWITTER_CONSUMER_SECRET,
    accessToken: token,
    accessSecret: tokenSecret,
  });

  try {
    if (mission.type === 'like') {
      // Verificar si el usuario dio like al tweet
      const likes = await client.v2.userLikedTweets(userId, { max_results: 100 });
      const liked = likes.data && likes.data.data && likes.data.data.some(t => t.id === mission.tweetId);
      return res.json({ success: liked, missionId, type: 'like', points: liked ? mission.points : 0 });
    }
    if (mission.type === 'retweet') {
      // Verificar si el usuario retuiteó el tweet
      const retweets = await client.v2.userTimeline(userId, { max_results: 100, exclude: 'replies' });
      const retweeted = retweets.data && retweets.data.data && retweets.data.data.some(t => t.referenced_tweets && t.referenced_tweets.some(ref => ref.type === 'retweeted' && ref.id === mission.tweetId));
      return res.json({ success: retweeted, missionId, type: 'retweet', points: retweeted ? mission.points : 0 });
    }
    if (mission.type === 'comment') {
      // Verificar si el usuario comentó en el tweet
      const replies = await client.v2.userTimeline(userId, { max_results: 100, exclude: 'retweets' });
      const commented = replies.data && replies.data.data && replies.data.data.some(t => t.in_reply_to_user_id && t.in_reply_to_user_id === mission.tweetId);
      return res.json({ success: commented, missionId, type: 'comment', points: commented ? mission.points : 0 });
    }
    return res.status(400).json({ error: 'Tipo de misión no soportado' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error verificando la acción en Twitter' });
  }
});

module.exports = router;
