import React, { useState } from 'react';

function MissionItem({ mission, onComplete, loadingMissionId }) {
  const [started, setStarted] = useState(false);
  const getMissionIcon = (type) => {
    switch (type) {
      case 'like':
        return 'fas fa-heart';
      case 'retweet':
        return 'fas fa-retweet';
      case 'comment':
        return 'fas fa-comment';
      case 'follow':
        return 'fas fa-user-plus';
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
      case 'follow':
        return 'Seguir Usuario';
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
        
        <div className="mission-footer">
          <div className="mission-points">
            +{mission.points} pts
          </div>
          
          <button
            className={`mission-button ${mission.completed ? 'completed' : ''}`}
            onClick={handleButtonClick}
            disabled={mission.completed || loadingMissionId === mission.id}
          >
            {mission.completed ? 'Completada' : 
             loadingMissionId === mission.id ? (
               <span>
                 <i className="fas fa-spinner fa-spin"></i> Verificando...
               </span>
             ) : (
               started ? 'Completar Misión' : 'Empezar Misión'
             )
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default MissionItem;
