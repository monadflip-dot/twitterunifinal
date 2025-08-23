// Centralized missions data
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

module.exports = { allMissions };
