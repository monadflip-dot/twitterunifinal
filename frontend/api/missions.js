import jwt from 'jsonwebtoken';

// Real missions data from the original backend
const missions = [
  {
    id: 1, 
    type: 'like', 
    title: 'Like the ABSPFC tweet about the match',
    description: 'Like the ABSPFC tweet about the match', 
    tweetId: '1957149650118377661', 
    points: 50,
    completed: false
  },
  { 
    id: 2, 
    type: 'retweet', 
    title: 'Retweet the ABSPFC tweet',
    description: 'Retweet the ABSPFC tweet', 
    tweetId: '1957149650118377661', 
    points: 75,
    completed: false
  },
  { 
    id: 3, 
    type: 'comment', 
    title: 'Comment on the ABSPFC tweet',
    description: 'Comment on the ABSPFC tweet', 
    tweetId: '1957149650118377661', 
    points: 100,
    completed: false
  },
  {
    id: 4,
    type: 'follow',
    title: 'Follow the official ABSPFC account on Twitter',
    description: 'Follow the official ABSPFC account on Twitter',
    targetUserId: 'ABSPFC',
    points: 150,
    completed: false
  }
];

export default async function handler(req, res) {
  // Verify JWT first
  const token = req.cookies?.jwt || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key');
    
    if (req.method === 'GET') {
      // Return missions for the user
      return res.json({ missions, user: decoded });
    }
    
    if (req.method === 'POST') {
      // Complete a mission
      const { missionId } = req.body;
      const mission = missions.find(m => m.id === missionId);
      
      if (!mission) {
        return res.status(404).json({ error: 'Mission not found' });
      }
      
      // Mark mission as completed
      mission.completed = true;
      
      return res.json({ 
        success: true, 
        mission,
        message: `Mission completed! You earned ${mission.points} points!`
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Missions error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}
