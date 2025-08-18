import React from 'react';
import MissionItem from './MissionItem';

const MissionList = ({ missions, onMissionAction }) => {
  if (!missions || missions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#b0b0b0' }}>
        <h3>No hay misiones disponibles</h3>
        <p>Vuelve más tarde para nuevas misiones</p>
      </div>
    );
  }

  return (
    <div className="missions-grid">
      {missions.map((mission) => (
        <MissionItem 
          key={mission.id} 
          mission={mission} 
          onAction={onMissionAction} 
        />
      ))}
    </div>
  );
};

export default MissionList;
