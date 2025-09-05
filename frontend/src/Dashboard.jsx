import React, { useState, useEffect } from 'react';
import MissionList from './MissionList';
import WalletSection from './WalletSection';
import favicon from '../images/favicon.png';

function Dashboard({ user, onLogout }) {
  const [missions, setMissions] = useState([]);
  const [stats, setStats] = useState({
    totalPoints: 0,
    completedMissions: 0,
    totalMissions: 0,
    pendingMissions: 0
  });
  const [loading, setLoading] = useState(true);
  const [loadingMissionId, setLoadingMissionId] = useState(null);

  // Debug log para ver qué usuario llega
  useEffect(() => {
    console.log('🔍 Dashboard received user:', user);
    console.log('🔍 User photo:', user?.photo);
    console.log('🔍 User displayName:', user?.displayName);
    console.log('🔍 User username:', user?.username);
    
    // Fetch missions from API
    fetchMissions();
  }, [user]);

  const fetchMissions = async () => {
    try {
      setLoading(true);
      console.log('🔍 Starting to fetch missions...');
      
      const token = localStorage.getItem('jwt_token');
      console.log('🔍 Token found:', token ? 'YES' : 'NO');
      
      if (!token) {
        console.log('❌ No JWT token found, using fallback');
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/missions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('🔍 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        const missionsData = data.missions || [];
        console.log('✅ Missions loaded from API:', missionsData.length);
        
        setMissions(missionsData);
        
        // Calculate statistics
        const completed = missionsData.filter(m => m.completed).length;
        const totalPoints = missionsData.filter(m => m.completed).reduce((sum, m) => sum + m.points, 0);
        
        setStats({
          totalPoints,
          completedMissions: completed,
          totalMissions: missionsData.length,
          pendingMissions: missionsData.length - completed
        });
        
      } else {
        console.error('❌ API failed:', response.status);
      }
    } catch (error) {
      console.error('💥 Error fetching missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMissionComplete = async (missionId) => {
    if (loadingMissionId === missionId) return; // Evitar múltiples clicks
    
    setLoadingMissionId(missionId);
    
    try {
      // Add 5 second delay with loading animation
      console.log(`⏳ Starting 5-second verification process for mission ${missionId}...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        alert('No authentication token found. Please login again.');
        return;
      }
      
      const response = await fetch('/api/missions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ missionId })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Mission completed:', data);
        
        // Update missions state
        setMissions(prev => 
          prev.map(m => m.id === missionId ? { ...m, completed: true } : m)
        );
        
        // Update statistics
        const pointsToAdd = data.mission.points;
        setStats(prev => ({
          ...prev,
          totalPoints: prev.totalPoints + pointsToAdd,
          completedMissions: prev.completedMissions + 1,
          pendingMissions: Math.max(prev.pendingMissions - 1, 0)
        }));
        
        // Show success message with verification status
        const message = data.fallback ? 
          `Mission completed! You earned ${pointsToAdd} points. (Auto-verified)` :
          `Mission completed! You earned ${pointsToAdd} points.`;
        alert(message);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to complete mission'}`);
      }
    } catch (error) {
      console.error('Error completing mission:', error);
      alert('Connection error. Try again.');
    } finally {
      setLoadingMissionId(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading missions...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-background wooden-panel">
        <div className="dashboard-panel">
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px' }}>
            <img src={favicon} alt="Logo" style={{ width: '150px', height: '150px' }} />
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
            
            {missions.length > 0 ? (
              <MissionList 
                missions={missions} 
                onMissionComplete={handleMissionComplete}
                loadingMissionId={loadingMissionId}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <i className="fas fa-exclamation-triangle" style={{ fontSize: '48px', marginBottom: '20px' }}></i>
                <h3>No missions available</h3>
                <p>Check your environment variables or try refreshing the page.</p>
              </div>
            )}
          </div>
        </div>
        <div className="bottom-left"></div>
        <div className="bottom-right"></div>
      </div>
    </div>
  );
}

export default Dashboard;
