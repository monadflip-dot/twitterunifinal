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
    try {
      const response = await fetch(`${API_URL}/api/missions/${missionId}/complete`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Actualizar misión como completada
          setMissions(prev => 
            prev.map(m => m.id === missionId ? { ...m, completed: true } : m)
          );
          
          // Actualizar estadísticas
          setStats(prev => ({
            ...prev,
            totalPoints: prev.totalPoints + (data.points || 0),
            completedMissions: prev.completedMissions + 1,
            pendingMissions: Math.max(prev.pendingMissions - 1, 0)
          }));
          
          // Mostrar mensaje de éxito
          const mission = missions.find(m => m.id === missionId);
          const successMessage = data.message 
            ? `¡Misión completada! 🎉\n\n${data.message}\n\nHas ganado ${mission?.points || 0} puntos!`
            : `¡Misión completada! 🎉\n\nHas ganado ${mission?.points || 0} puntos!`;
          alert(successMessage);
        } else {
          alert('No se pudo verificar la misión. Asegúrate de haber realizado la acción en Twitter antes de hacer clic en "Completar".');
        }
      } else if (response.status === 429) {
        const errorData = await response.json();
        alert(`Rate limit excedido: ${errorData.error}\n\nEspera unos minutos antes de intentar verificar la misión.`);
      } else {
        alert('Error al verificar la misión. Inténtalo de nuevo.');
      }
    } catch (error) {
      console.error('Error verificando misión:', error);
      alert('Error de conexión. Verifica tu internet e inténtalo de nuevo.');
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
            <h1>DASHBOARD DE MISIONES</h1>
            <div className="header-separator"></div>
            <p className="dashboard-subtitle">Completa misiones y gana puntos</p>
          </div>
          
          <div className="user-section">
            <div className="user-info">
              <div className="user-avatar">
                <img src={user?.photo || favicon} alt="Avatar" />
              </div>
              <div className="user-details">
                <h3>{user?.displayName || 'Usuario'}</h3>
                <p>@{user?.username || 'username'}</p>
              </div>
            </div>
            <button className="logout-button" onClick={onLogout}>
              <i className="fas fa-sign-out-alt"></i>
              Cerrar Sesión
            </button>
          </div>
          
          <div className="stats-section">
            <div className="stat-item">
              <div className="stat-icon">
                <i className="fas fa-star"></i>
              </div>
              <div className="stat-content">
                <h4>{stats.totalPoints}</h4>
                <p>PUNTOS TOTALES</p>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="stat-content">
                <h4>{stats.completedMissions}</h4>
                <p>MISIONES COMPLETADAS</p>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon">
                <i className="fas fa-list"></i>
              </div>
              <div className="stat-content">
                <h4>{stats.totalMissions}</h4>
                <p>TOTAL DE MISIONES</p>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon">
                <i className="fas fa-clock"></i>
              </div>
              <div className="stat-content">
                <h4>{stats.pendingMissions}</h4>
                <p>MISIONES PENDIENTES</p>
              </div>
            </div>
          </div>
          
          <div className="missions-section">
            <div className="section-header">
              <h2>MISIONES DISPONIBLES</h2>
              <div className="section-separator"></div>
            </div>
            
            <MissionList 
              missions={missions} 
              onMissionComplete={handleMissionComplete}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
