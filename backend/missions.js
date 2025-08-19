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
      console.log('Like response:', likeResponse);
      return res.json({ success: true, missionId, type: 'like', points: mission.points });
    }
    
    if (mission.type === 'retweet') {
      // Intentar hacer retweet
      const retweetResponse = await client.v2.retweet(userId, mission.tweetId);
      console.log('Retweet response:', retweetResponse);
      return res.json({ success: true, missionId, type: 'retweet', points: mission.points });
    }
    
    if (mission.type === 'comment') {
      // Para comentarios, crear un tweet como respuesta
      const commentText = `¡Excelente contenido! #ABSPFC`;
      const replyResponse = await client.v2.reply(commentText, userId, mission.tweetId);
      console.log('Reply response:', replyResponse);
      return res.json({ success: true, missionId, type: 'comment', points: mission.points });
    }
    
    if (mission.type === 'follow') {
      // Intentar seguir al usuario objetivo
      const followResponse = await client.v2.follow(userId, mission.targetUserId);
      console.log('Follow response:', followResponse);
      return res.json({ success: true, missionId, type: 'follow', points: mission.points });
    }
    
    return res.status(400).json({ error: 'Tipo de misión no soportado' });
  } catch (err) {
    console.error('Error ejecutando misión:', err);
    
    // Si la acción ya fue realizada, marcar como exitosa
    if (err.code === 139 || err.message.includes('already') || err.message.includes('duplicate')) {
      return res.json({ 
        success: true, 
        missionId, 
        type: mission.type, 
        points: mission.points,
        message: 'Acción ya realizada anteriormente'
      });
    }
    
    // Si es un error de permisos o autenticación
    if (err.code === 403 || err.code === 401) {
      return res.status(403).json({ 
        error: 'No tienes permisos para realizar esta acción. Verifica tu cuenta de Twitter.',
        code: err.code
      });
    }
    
    // Si es un error de rate limit
    if (err.code === 429) {
      return res.status(429).json({ 
        error: 'Rate limit excedido. Espera unos minutos antes de intentar verificar la misión.',
        retryAfter: err.rateLimit?.reset || Date.now() + 900000
      });
    }
    
    return res.status(500).json({ 
      error: 'Error ejecutando la acción en Twitter',
      details: err.message,
      code: err.code
    });
  }
});

module.exports = router;
