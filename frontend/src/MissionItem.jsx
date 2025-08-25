import React, { useState } from 'react';

function MissionItem({ mission, onComplete, loadingMissionId }) {
  const [started, setStarted] = useState(false);
  const getMissionIcon = (type) => {
    switch (type) {
      case 'social': return 'fas fa-share-alt';
      case 'engagement': return 'fas fa-heart';
      case 'community': return 'fas fa-users';
      case 'promotion': return 'fas fa-bullhorn';
      case 'referral': return 'fas fa-user-plus';
      default: return 'fas fa-star';
    }
  };

  const getMissionTypeLabel = (type) => {
    switch (type) {
      case 'social': return 'Social';
      case 'engagement': return 'Engagement';
      case 'community': return 'Community';
      case 'promotion': return 'Promotion';
      case 'referral': return 'Referral';
      default: return 'General';
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

  const getButtonText = () => {
    if (mission.completed) return 'Completed';
    if (loadingMissionId === mission.id) {
      return (
        <span>
          <i className="fas fa-spinner fa-spin"></i> Completing...
        </span>
      );
    }
    if (started) return 'Complete Mission';
    return 'Start Mission';
  };

  const getButtonClass = () => {
    if (mission.completed) return 'mission-button completed';
    if (started) return 'mission-button verify';
    return 'mission-button start';
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
          <h3>{mission.title}</h3>
          <div className={`status-tag ${getStatusTag(mission.completed).class}`}>
            {getStatusTag(mission.completed).text}
          </div>
        </div>
        
        <div className="mission-type-badge">
          <span className="type-label">{getMissionTypeLabel(mission.type)}</span>
        </div>

        
        <div className="mission-description">
          {mission.description}
        </div>
        
        <div className="mission-footer">
          <div className="mission-points">
            +{mission.points} pts
          </div>
          
          <button
            className={getButtonClass()}
            onClick={handleButtonClick}
            disabled={mission.completed || loadingMissionId === mission.id}
          >
            {getButtonText()}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MissionItem;
