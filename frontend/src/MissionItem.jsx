import React from 'react';

const actionLabels = {
  like: 'Dar Like',
  retweet: 'Retuitear',
  comment: 'Comentar',
};

const actionIcons = {
  like: '❤️',
  retweet: '🔄',
  comment: '💬',
};

const MissionItem = ({ mission, onAction }) => (
  <div className={`mission-card ${mission.completed ? 'completed' : ''}`}>
    <div className="mission-header">
      <div className="mission-type">
        <span>{actionIcons[mission.type]}</span>
        {actionLabels[mission.type]}
      </div>
      <div className="mission-points">
        +{mission.points} pts
      </div>
    </div>
    
    <div className="mission-description">
      {mission.description}
    </div>
    
    {mission.tweetUrl && (
      <a 
        href={mission.tweetUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="mission-tweet-link"
      >
        🔗 Ver tweet en Twitter
      </a>
    )}
    
    <button
      className={`mission-button ${mission.completed ? 'completed' : ''}`}
      onClick={() => onAction(mission.id)}
      disabled={mission.completed}
    >
      {mission.completed ? '✅ Completada' : 'Completar Misión'}
    </button>
  </div>
);

export default MissionItem;
