import React, { useState } from 'react';

function MissionItem({ mission, onComplete, loadingMissionId }) {
  const [started, setStarted] = useState(false);
  const getMissionIcon = (type) => {
    switch (type) {
      case 'like': return 'fas fa-heart';
      case 'retweet': return 'fas fa-retweet';
      case 'comment': return 'fas fa-comment';
      case 'follow': return 'fas fa-user-plus';
      default: return 'fas fa-question';
    }
  };

  const getMissionTypeLabel = (type) => {
    switch (type) {
      case 'like': return 'Like Tweet';
      case 'retweet': return 'Retweet';
      case 'comment': return 'Comment';
      case 'follow': return 'Follow User';
      default: return 'Unknown';
    }
  };

  const getStatusTag = (completed) => {
    if (completed) {
      return { text: 'COMPLETED', class: 'status-completed' };
    }
    return { text: 'NEW', class: 'status-new' };
  };

  const handleButtonClick = () => {
    if (mission.completed) return;
    if (!started) {
      // Abrir enlace según el tipo de misión
      if (mission.type === 'follow') {
        // Para misiones de follow, abrir el perfil del usuario
        window.open(`https://x.com/${mission.targetUserId}`, '_blank', 'noopener');
      } else if (['like', 'retweet', 'comment'].includes(mission.type)) {
        // Para misiones de like/retweet/comment, abrir el tweet específico
        window.open(`https://x.com/ABSPFC/status/${mission.tweetId}`, '_blank', 'noopener');
      }
      setStarted(true);
      return;
    }
    onComplete(mission.id);
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
        

        
        <div className="mission-description">
          {mission.description}
        </div>
        
        <div className="mission-footer">
          <div className="mission-points">
            +{mission.points} pts
          </div>
          
          <button
            className={`mission-button ${mission.completed ? 'completed' : ''}`}
            onClick={handleButtonClick}
            disabled={mission.completed || loadingMissionId === mission.id}
          >
            {mission.completed ? 'Completed' : 
             loadingMissionId === mission.id ? (
               <span>
                 <i className="fas fa-spinner fa-spin"></i> Verifying...
               </span>
             ) : (
               started ? 'Complete Mission' : 'Start Mission'
             )
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default MissionItem;
