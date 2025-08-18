import React from 'react';
import MissionItem from './MissionItem';

function MissionList({ missions, onMissionComplete }) {
  if (!missions || missions.length === 0) {
    return (
      <div className="no-missions">
        <p>No hay misiones disponibles en este momento.</p>
      </div>
    );
  }

  return (
    <div className="missions-list">
      {missions.map((mission) => (
        <MissionItem
          key={mission.id}
          mission={mission}
          onComplete={onMissionComplete}
        />
      ))}
    </div>
  );
}

export default MissionList;
