import React from 'react';
import MissionItem from './MissionItem';

function MissionList({ missions, onMissionComplete, loadingMissionId }) {
  if (!missions || missions.length === 0) {
    return (
      <div className="no-missions">
        <p>No missions available at this time.</p>
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
          loadingMissionId={loadingMissionId}
        />
      ))}
    </div>
  );
}

export default MissionList;
