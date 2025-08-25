import React, { useState, useEffect } from 'react';
import MissionList from './MissionList';
import WalletSection from './WalletSection';
import favicon from '../images/favicon.png';

const API_URL = process.env.REACT_APP_API_URL || '';

function Dashboard({ user, onLogout }) {
  const [missions, setMissions] = useState([]);
  const [stats, setStats] = useState({
    totalPoints: 0,
    completedMissions: 0,
    totalMissions: 0,
    pendingMissions: 0
  });
  const [loading, setLoading] = useState(false);
  const [loadingMissionId, setLoadingMissionId] = useState(null);

  // Debug log para ver qué usuario llega
  useEffect(() => {
    console.log('🔍 Dashboard received user:', user);
    console.log('🔍 User photo:', user?.photo);
    console.log('🔍 User displayName:', user?.displayName);
    console.log('🔍 User username:', user?.username);
  }, [user]);

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    try {
      console.log('🔍 Starting to fetch missions...');
      console.log('🔍 API_URL:', API_URL);
      
      const token = localStorage.getItem('jwt_token');
      console.log('🔍 Token found:', token ? 'YES' : 'NO');
      
      // Intentar obtener misiones del endpoint principal
      const response = await fetch(`${API_URL}/api/missions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('🔍 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        const missionsData = data.missions || [];
        console.log('✅ Missions loaded from main endpoint:', missionsData.length);
        
        setMissions(missionsData);
        
        // Calcular estadísticas
        const completed = missionsData.filter(m => m.completed).length;
        setStats({
          totalPoints: missionsData.filter(m => m.completed).reduce((sum, m) => sum + m.points, 0),
          completedMissions: completed,
          totalMissions: missionsData.length,
          pendingMissions: missionsData.length - completed
        });
      } else {
        console.log('⚠️ Main endpoint failed, trying fallback...');
        
        // Intentar endpoint de fallback
        const fallbackResponse = await fetch(`${API_URL}/api/test/missions`);
        console.log('🔍 Fallback response status:', fallbackResponse.status);
        
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          const missionsData = data.missions || [];
          console.log('✅ Missions loaded from fallback endpoint:', missionsData.length);
          
          setMissions(missionsData);
          
          // Calcular estadísticas
          const completed = missionsData.filter(m => m.completed).length;
          setStats({
            totalPoints: missionsData.filter(m => m.completed).reduce((sum, m) => sum + m.points, 0),
            completedMissions: completed,
            totalMissions: missionsData.length,
            pendingMissions: missionsData.length - completed
          });
        } else {
          console.error('❌ Both endpoints failed');
          console.error('❌ Main endpoint status:', response.status);
          console.error('❌ Fallback endpoint status:', fallbackResponse.status);
          setMissions([]);
        }
      }
    } catch (error) {
      console.error('💥 Error fetching missions:', error);
      setMissions([]);
    }
  };

  const handleMissionComplete = async (missionId) => {
    if (loadingMissionId) return;
    
    setLoadingMissionId(missionId);
    
    try {
      // Debug: Check token before completing mission
      const token = localStorage.getItem('jwt_token');
      console.log('🔍 Debug - Token before completing mission:');
      console.log('🎫 Token exists:', !!token);
      if (token) {
        console.log('🎫 Token (first 50 chars):', token.substring(0, 50) + '...');
        console.log('🎫 Token length:', token.length);
      }
      
      // Simulate 5 second delay
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const response = await fetch(`${API_URL}/api/missions/${missionId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Mission completion response:', data);
        
        // Update missions state
        setMissions(prevMissions => 
          prevMissions.map(mission => 
            mission.id === missionId 
              ? { ...mission, completed: true }
              : mission
          )
        );
        
        // Update user stats
        if (data.points) {
          setStats(prevStats => ({
            ...prevStats,
            totalPoints: (prevStats.totalPoints || 0) + data.points,
            completedMissions: (prevStats.completedMissions || 0) + 1
          }));
        }
        
        alert(`✅ ${data.message || 'Mission completed successfully!'}`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Mission completion failed:', response.status, errorData);
        
        // 🔍 NEW: Handle re-authentication error
        if (errorData.code === 'MISSING_ACCESS_TOKEN' || 
            errorData.action === 'reconnect_twitter') {
          console.log('🔄 Twitter access token missing, forcing re-authentication...');
          
          // Clear invalid token
          localStorage.removeItem('jwt_token');
          
          // Show user-friendly message
          const shouldReconnect = confirm(
            'Your Twitter session has expired or is invalid. ' +
            'Would you like to reconnect with Twitter to complete missions?'
          );
          
          if (shouldReconnect) {
            // Redirect to login page
            window.location.href = '/';
          }
          return;
        }
        
        // Handle other errors
        alert('Error completing the mission. Please try again.');
      }
    } catch (error) {
      console.error('💥 Error in handleMissionComplete:', error);
      alert('Error completing the mission. Please try again.');
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
