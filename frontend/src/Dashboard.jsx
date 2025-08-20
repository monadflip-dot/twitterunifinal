import React, { useState, useEffect } from 'react';
import MissionList from './MissionList';
import favicon from '../images/favicon.png';

const API_URL = process.env.REACT_APP_API_URL || 'https://twitterunifinal.onrender.com';

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
      const response = await fetch(`${API_URL}/api/missions`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const missionsData = data.missions || [];
        setMissions(missionsData);
        
        // Calcular estadísticas
        const completed = missionsData.filter(m => m.completed).length;
        setStats({
          totalPoints: missionsData.filter(m => m.completed).reduce((sum, m) => sum + m.points, 0),
          completedMissions: completed,
          totalMissions: missionsData.length,
          pendingMissions: missionsData.length - completed
        });
      }
    } catch (error) {
      console.error('Error fetching missions:', error);
    }
  };

  const handleMissionComplete = async (missionId) => {
    if (loadingMissionId === missionId) return; // Evitar múltiples clicks
    
    setLoadingMissionId(missionId);
    
    try {
      console.log(`🚀 Starting mission completion for mission ${missionId}`);
      
      // Simular delay de lectura/verificación
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const response = await fetch(`${API_URL}/api/missions/${missionId}/complete`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`📡 Response status: ${response.status}`);
      console.log(`📡 Response headers:`, response.headers);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Respuesta de la API:', data);
        
        if (data.success) {
          // Misión completada exitosamente
          const mission = missions.find(m => m.id === missionId);
          console.log('✅ Misión encontrada:', mission);
          console.log('✅ Puntos de la misión:', mission?.points);
          console.log('✅ Puntos de la respuesta:', data.points);
          
          setMissions(prev => {
            const newMissions = prev.map(m => m.id === missionId ? { ...m, completed: true } : m);
            console.log('🔄 Misiones antes de actualizar:', prev);
            console.log('🔄 Misiones después de actualizar:', newMissions);
            return newMissions;
          });
          
          // Actualizar estadísticas usando los puntos de la misión local
          const pointsToAdd = mission?.points || 0;
          console.log('💰 Puntos a agregar:', pointsToAdd);
          console.log('📊 Estadísticas antes de actualizar:', stats);
          
          setStats(prev => {
            const newStats = {
              ...prev,
              totalPoints: prev.totalPoints + pointsToAdd,
              completedMissions: prev.completedMissions + 1,
              pendingMissions: Math.max(prev.pendingMissions - 1, 0)
            };
            console.log('📊 Nuevas estadísticas:', newStats);
            return newStats;
          });
          
          // Mostrar mensaje de éxito
          alert(`¡Misión completada exitosamente! +${pointsToAdd} puntos`);
        } else {
          alert('Could not verify the mission. Make sure you have completed the action on Twitter before clicking "Complete".');
        }
      } else if (response.status === 429) {
        const errorData = await response.json();
        alert(`Rate limit exceeded: ${errorData.error}\n\nWait a few minutes before trying to verify the mission.`);
      } else if (response.status === 403) {
        const errorData = await response.json();
        alert(`Permission error: ${errorData.error}\n\nVerify your Twitter account and granted permissions.`);
      } else if (response.status === 500) {
        const errorData = await response.json();
        alert(`Server error: ${errorData.error}\n\nDetails: ${errorData.details || 'Unknown error'}`);
      } else if (response.status === 502) {
        alert('Server temporarily unavailable (502 Bad Gateway). This usually means the backend is restarting. Please try again in a few minutes.');
      } else if (response.status === 503) {
        alert('Service temporarily unavailable (503). The server is overloaded. Please try again later.');
      } else if (response.status === 504) {
        alert('Gateway timeout (504). The request took too long to complete. Please try again.');
      } else {
        const errorText = await response.text();
        console.error('❌ Unexpected error response:', errorText);
        alert(`Error verifying the mission (Status: ${response.status}). Try again or contact support if the problem persists.`);
      }
    } catch (error) {
      console.error('💥 Error completing mission:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        alert('Connection error: Unable to reach the server. Please check your internet connection and try again.');
      } else if (error.name === 'AbortError') {
        alert('Request timeout: The operation took too long. Please try again.');
      } else {
        alert(`Connection error: ${error.message}. Try again.`);
      }
    } finally {
      setLoadingMissionId(null);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-background">
        <div className="dashboard-panel">
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <img src={favicon} alt="Logo" style={{ width: '100px', height: '100px' }} />
          </div>
          <div className="dashboard-header">
            <h1>MISSIONS DASHBOARD</h1>
            <div className="header-separator"></div>
            <p className="dashboard-subtitle">Complete missions and earn points</p>
          </div>
          
          <div className="user-section">
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
      </div>
    </div>
  );
}

export default Dashboard;
