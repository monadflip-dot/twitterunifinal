import React from 'react';

function MissionItem({ mission, onComplete }) {
  const getMissionIcon = (type) => {
    switch (type) {
      case 'like':
        return 'fas fa-heart';
      case 'retweet':
        return 'fas fa-retweet';
      case 'comment':
        return 'fas fa-comment';
      default:
        return 'fas fa-star';
    }
  };

  const getMissionTypeLabel = (type) => {
    switch (type) {
      case 'like':
        return 'Dar Like';
      case 'retweet':
        return 'Hacer Retweet';
      case 'comment':
        return 'Comentar';
      default:
        return 'Completar Misión';
    }
  };

  const getStatusTag = (completed) => {
    if (completed) {
      return { text: 'COMPLETADA', class: 'status-completed' };
    }
    return { text: 'NUEVA', class: 'status-new' };
  };

  const handleComplete = () => {
    if (!mission.completed) {
      onComplete(mission.id);
    }
  };

  return (
    <div className={`mission-item ${mission.completed ? 'completed' : ''}`}>
      <div className="mission-icon">
        <div className="icon-circle">
          <i className={getMissionIcon(mission.type)}></i>
        </div>
      </div>
      
      <div className="mission-content">
        <div className="mission-header">
          <h3>{getMissionTypeLabel(mission.type)}</h3>
          <div className={`status-tag ${getStatusTag(mission.completed).class}`}>
            {getStatusTag(mission.completed).text}
          </div>
        </div>
        
        <div className="mission-date">
          {new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
        
        <div className="mission-description">
          {mission.description}
        </div>
        
        {mission.tweetUrl && (
          <a 
            href={mission.tweetUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="mission-link"
          >
            <i className="fas fa-external-link-alt"></i>
            Ver tweet en Twitter
          </a>
        )}
        
        <div className="mission-footer">
          <div className="mission-points">
            +{mission.points} pts
          </div>
          
          <button 
            className={`mission-button ${mission.completed ? 'completed' : ''}`}
            onClick={handleComplete}
            disabled={mission.completed}
          >
            {mission.completed ? 'Completada' : 'Completar Misión'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MissionItem;
