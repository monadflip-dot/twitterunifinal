import React from 'react';
import MissionItem from './MissionItem';

const MissionList = ({ missions, onMissionAction }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', width: '100%' }}>
    {missions.map((mission) => (
      <MissionItem key={mission.id} mission={mission} onAction={onMissionAction} />
    ))}
  </div>
);

export default MissionList;
