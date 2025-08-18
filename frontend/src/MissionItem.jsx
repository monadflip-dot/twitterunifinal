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
  <div style={{
    border: '1px solid #eee',
    borderRadius: 12,
    padding: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: mission.completed ? '#e8f5e8' : 'white',
    width: 600,
    maxWidth: '100%',
    boxSizing: 'border-box',
    fontSize: 18,
    minHeight: 80,
    boxShadow: mission.completed ? '0 2px 8px rgba(76, 175, 80, 0.2)' : '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease'
  }}>
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 24, marginRight: 12 }}>
          {actionIcons[mission.type]}
        </span>
        <strong style={{ fontSize: 20, color: '#1a1a1a' }}>
          {actionLabels[mission.type]}
        </strong>
        <span style={{ 
          background: '#1da1f2', 
          color: 'white', 
          padding: '4px 12px', 
          borderRadius: '20px', 
          fontSize: 14, 
          marginLeft: 16,
          fontWeight: 'bold'
        }}>
          +{mission.points} pts
        </span>
      </div>
      <div style={{ color: '#555', fontSize: 16, marginBottom: 12 }}>
        {mission.description}
      </div>
      {mission.tweetUrl && (
        <a 
          href={mission.tweetUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            color: '#1da1f2', 
            textDecoration: 'none', 
            fontSize: 14,
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
          🔗 Ver tweet en Twitter
        </a>
      )}
    </div>
    
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      {mission.completed && (
        <div style={{ 
          color: '#4caf50', 
          fontSize: 16, 
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          ✅ Completada
        </div>
      )}
      <button
        disabled={mission.completed}
        style={{
          background: mission.completed ? '#ccc' : '#1da1f2',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '12px 24px',
          fontSize: 16,
          cursor: mission.completed ? 'not-allowed' : 'pointer',
          fontWeight: '600',
          transition: 'all 0.2s',
          minWidth: 120
        }}
        onMouseEnter={(e) => {
          if (!mission.completed) {
            e.target.style.background = '#0d8bd9';
            e.target.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if (!mission.completed) {
            e.target.style.background = '#1da1f2';
            e.target.style.transform = 'translateY(0)';
          }
        }}
        onClick={() => onAction(mission.id)}
      >
        {mission.completed ? 'Completada' : 'Completar'}
      </button>
    </div>
  </div>
);

export default MissionItem;
