const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const router = express.Router();

// Middleware para proteger rutas (usando JWT en lugar de sesiones)
function ensureAuthenticated(req, res, next) {
  if (req.user) {
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
    completed: false
  },
  { 
    id: 2, 
    type: 'retweet', 
    description: 'Haz retweet al tweet de ABSPFC', 
    tweetId: '1957149650118377661', 
    points: 75,
    completed: false
  },
  { 
    id: 3, 
    type: 'comment', 
    description: 'Comenta en el tweet de ABSPFC', 
    tweetId: '1957149650118377661', 
    points: 100,
    completed: false
  },
  {
    id: 4,
    type: 'follow',
    description: 'Sigue la cuenta oficial de ABSPFC en Twitter',
    targetUserId: 'ABSPFC',
    points: 150,
    completed: false
  }
];

// Obtener misiones
router.get('/', ensureAuthenticated, (req, res) => {
  res.json({ missions: exampleMissions });
});

// Completar misión (verificación real con endpoints de escritura)
router.post('/:id/complete', ensureAuthenticated, async (req, res) => {
  const missionId = parseInt(req.params.id, 10);
  const mission = exampleMissions.find(m => m.id === missionId);
  if (!mission) return res.status(404).json({ error: 'Misión no encontrada' });

  const { accessToken, id: userId } = req.user;
  
  // Usar OAuth 2.0 con access token
  const client = new TwitterApi(accessToken);

  try {
    if (mission.type === 'like') {
      // Intentar dar like al tweet
      const likeResponse = await client.v2.like(userId, mission.tweetId);
      if (likeResponse.data && likeResponse.data.liked) {
        return res.json({ success: true, missionId, type: 'like', points: mission.points });
      } else {
        return res.json({ success: false, message: 'No se pudo dar like al tweet' });
      }
    }
    
    if (mission.type === 'retweet') {
      // Intentar hacer retweet
      const retweetResponse = await client.v2.retweet(userId, mission.tweetId);
      if (retweetResponse.data && retweetResponse.data.retweeted) {
        return res.json({ success: true, missionId, type: 'retweet', points: mission.points });
      } else {
        return res.json({ success: false, message: 'No se pudo hacer retweet' });
      }
    }
    
    if (mission.type === 'comment') {
      // Para comentarios, necesitamos crear un tweet como respuesta
      const commentText = `¡Excelente contenido! #ABSPFC`;
      const replyResponse = await client.v2.reply(commentText, userId, mission.tweetId);
      if (replyResponse.data && replyResponse.data.id) {
        return res.json({ success: true, missionId, type: 'comment', points: mission.points });
      } else {
        return res.json({ success: false, message: 'No se pudo comentar en el tweet' });
      }
    }
    
    if (mission.type === 'follow') {
      // Intentar seguir al usuario objetivo
      const followResponse = await client.v2.follow(userId, mission.targetUserId);
      if (followResponse.data && followResponse.data.following) {
        return res.json({ success: true, missionId, type: 'follow', points: mission.points });
      } else {
        return res.json({ success: false, message: 'No se pudo seguir al usuario' });
      }
    }
    
    return res.status(400).json({ error: 'Tipo de misión no soportado' });
  } catch (err) {
    console.error('Error ejecutando misión:', err);
    
    // Si la acción ya fue realizada, marcar como exitosa
    if (err.code === 139 && err.message.includes('already')) {
      return res.json({ 
        success: true, 
        missionId, 
        type: mission.type, 
        points: mission.points,
        message: 'Acción ya realizada anteriormente'
      });
    }
    
    return res.status(500).json({ error: 'Error ejecutando la acción en Twitter' });
  }
});

module.exports = router;
