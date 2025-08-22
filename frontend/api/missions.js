import jwt from 'jsonwebtoken';

// Mock missions data - puedes expandir esto
const missions = [
  {
    id: 1,
    title: "Follow @PenguinFishingClub",
    description: "Follow our official Twitter account",
    type: "follow",
    points: 100,
    completed: false
  },
  {
    id: 2,
    title: "Like our latest tweet",
    description: "Like our most recent post",
    type: "like",
    points: 50,
    completed: false
  },
  {
    id: 3,
    title: "Retweet announcement",
    description: "Retweet our latest announcement",
    type: "retweet",
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
