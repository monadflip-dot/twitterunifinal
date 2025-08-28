import React, { useState, useEffect } from 'react';
import MissionList from './MissionList';
import WalletSection from './WalletSection';
import favicon from '../images/favicon.png';

// Static missions data - no backend needed
const STATIC_MISSIONS = [
  {
    id: 1,
    title: "Follow @PenguinFishingClub",
    description: "Follow our official Twitter account to stay updated with the latest news and announcements.",
    points: 50,
    completed: false,
    type: "follow"
  },
  {
    id: 2,
    title: "Retweet Announcement",
    description: "Retweet our latest announcement about the whitelist opening.",
    points: 75,
    completed: false,
    type: "retweet"
  },
  {
    id: 3,
    title: "Like 3 Posts",
    description: "Like at least 3 of our recent posts to show your support.",
    points: 25,
    completed: false,
    type: "like"
  },
  {
    id: 4,
    title: "Share Your Excitement",
    description: "Tweet about how excited you are for the Penguin Fishing Club mint.",
    points: 100,
    completed: false,
    type: "tweet"
  },
  {
    id: 5,
    title: "Join Discord",
    description: "Join our Discord community and introduce yourself.",
    points: 50,
    completed: false,
    type: "discord"
  }
];

function Dashboard({ user, onLogout }) {
  const [missions, setMissions] = useState(STATIC_MISSIONS);
  const [stats, setStats] = useState({
    totalPoints: 0,
    completedMissions: 0,
    totalMissions: STATIC_MISSIONS.length,
    pendingMissions: STATIC_MISSIONS.length
  });
  const [loading, setLoading] = useState(false);
  const [loadingMissionId, setLoadingMissionId] = useState(null);

  // Debug log para ver qué usuario llega
  useEffect(() => {
    console.log('🔍 Dashboard received user:', user);
    console.log('🔍 User photo:', user?.photo);
    console.log('🔍 User displayName:', user?.displayName);
    console.log('🔍 User username:', user?.username);
    
    // Load user progress from localStorage
    loadUserProgress();
  }, [user]);

  const loadUserProgress = () => {
    try {
      const savedProgress = localStorage.getItem(`user_progress_${user?.uid}`);
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        setMissions(progress.missions);
        setStats(progress.stats);
      }
    } catch (error) {
      console.log('No saved progress found, using default missions');
    }
  };

  const saveUserProgress = (newMissions, newStats) => {
    try {
      const progress = {
        missions: newMissions,
        stats: newStats,
        lastUpdated: Date.now()
      };
      localStorage.setItem(`user_progress_${user?.uid}`, JSON.stringify(progress));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleMissionComplete = async (missionId) => {
    if (loadingMissionId === missionId) return; // Evitar múltiples clicks
    
    setLoadingMissionId(missionId);
    
    try {
      // Simulate delay for mission verification
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Find and complete the mission
      const mission = missions.find(m => m.id === missionId);
      if (mission && !mission.completed) {
        // Mark mission as completed
        const newMissions = missions.map(m => 
          m.id === missionId ? { ...m, completed: true } : m
        );
        
        // Update statistics
        const pointsToAdd = mission.points;
        const newStats = {
          totalPoints: stats.totalPoints + pointsToAdd,
          completedMissions: stats.completedMissions + 1,
          totalMissions: stats.totalMissions,
          pendingMissions: Math.max(stats.pendingMissions - 1, 0)
        };
        
        // Update state
        setMissions(newMissions);
        setStats(newStats);
        
        // Save to localStorage
        saveUserProgress(newMissions, newStats);
        
        alert(`Mission completed! You earned ${pointsToAdd} points.`);
      } else {
        alert('Mission already completed or not found.');
      }
    } catch (error) {
      console.error('Error completing mission:', error);
      alert('Error completing mission. Try again.');
    } finally {
      setLoadingMissionId(null);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-background wooden-panel">
        <div className="dashboard-panel">
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px' }}>
            <img src={favicon} alt="Logo" style={{ width: '150px', height: '150px' }} />
          </div>
          
          {/* Offline Mode Indicator */}
          <div style={{ 
            background: 'rgba(76, 175, 80, 0.1)', 
            border: '1px solid #4caf50', 
            borderRadius: '8px', 
            padding: '10px', 
            margin: '20px', 
            textAlign: 'center',
            color: '#2e7d32'
          }}>
            <i className="fas fa-wifi"></i>
            <strong> Online Mode:</strong> Using local storage for missions and progress.
          </div>
          
          <div className="user-section">
            <div className="user-profile">
              <div className="user-info">
                <div className="user-avatar">
                  <img src={user?.photo || favicon} alt="Avatar" />
                </div>
                <div className="user-details">
                  <h3>{user?.displayName || 'User'}</h3>
                  <p>@{user?.username || 'username'}</p>
                </div>
              </div>
              <button className="logout-button" onClick={onLogout}>
                <i className="fas fa-sign-out-alt"></i>
                Logout
              </button>
            </div>
            
            <div className="stats-section">
              <div className="stats-row">
                <div className="stat-item">
                  <div className="stat-icon">
                    <i className="fas fa-star"></i>
                  </div>
                  <div className="stat-content">
                    <h4>{stats.totalPoints}</h4>
                    <p>TOTAL POINTS</p>
                  </div>
                </div>
                
                <div className="stat-item">
                  <div className="stat-icon">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <div className="stat-content">
                    <h4>{stats.completedMissions}</h4>
                    <p>COMPLETED MISSIONS</p>
                  </div>
                </div>
                
                <div className="stat-item">
                  <div className="stat-icon">
                    <i className="fas fa-list"></i>
                  </div>
                  <div className="stat-content">
                    <h4>{stats.totalMissions}</h4>
                    <p>TOTAL MISSIONS</p>
                  </div>
                </div>
                
                <div className="stat-item">
                  <div className="stat-icon">
                    <i className="fas fa-clock"></i>
                  </div>
                  <div className="stat-content">
                    <h4>{stats.pendingMissions}</h4>
                    <p>PENDING MISSIONS</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="wallet-section">
            <WalletSection />
          </div>
          
          <div className="missions-section">
            <div className="section-header">
              <h2>AVAILABLE MISSIONS</h2>
              <div className="section-separator"></div>
            </div>
            
            <MissionList 
              missions={missions} 
              onMissionComplete={handleMissionComplete}
              loadingMissionId={loadingMissionId}
            />
          </div>
        </div>
        <div className="bottom-left"></div>
        <div className="bottom-right"></div>
      </div>
    </div>
  );
}

export default Dashboard;
