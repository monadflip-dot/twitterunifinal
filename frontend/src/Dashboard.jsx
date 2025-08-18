import React, { useState, useEffect } from 'react';
import MissionList from './MissionList';

// Usar rutas relativas ya que frontend y backend están en el mismo dominio
const API_URL = '';

const Dashboard = ({ user, missions, onMissionAction }) => {
  const [totalPoints, setTotalPoints] = useState(0);
  const [completedMissions, setCompletedMissions] = useState(0);

  useEffect(() => {
    // Calcular puntos totales y misiones completadas
    const completed = missions.filter(m => m.completed);
    const points = completed.reduce((sum, m) => sum + (m.points || 0), 0);
    setTotalPoints(points);
    setCompletedMissions(completed.length);
  }, [missions]);

  const handleLogout = () => {
    window.location.href = `${API_URL}/auth/logout`;
  };

  return (
    <div className="app-container">
      {/* Sidebar izquierda */}
      <div className="sidebar">
        <div className="user-profile">
          <img 
            src={user.photo || user.avatar || 'https://via.placeholder.com/80x80/8B4513/ffffff?text=U'} 
            alt="Profile" 
            className="user-avatar"
          />
          <div className="user-name">{user.displayName || user.name || 'Usuario'}</div>
          <div className="user-handle">@{user.username || 'username'}</div>
        </div>

        <div className="menu-section">
          <div className="menu-title">MENU</div>
          <div className="menu-item active">
            🏠 Dashboard
          </div>
          <div className="menu-item">
            🎯 Misiones
          </div>
          <div className="menu-item">
            👤 Perfil
          </div>
        </div>

        <button className="logout-button" onClick={handleLogout}>
          🚪 Cerrar Sesión
        </button>
      </div>

      {/* Contenido principal */}
      <div className="main-content">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Dashboard de Misiones</h1>
          <p className="dashboard-subtitle">Completa misiones y gana puntos</p>
        </div>

        {/* Stats cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{totalPoints}</div>
            <div className="stat-label">Puntos Totales</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{completedMissions}</div>
            <div className="stat-label">Misiones Completadas</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{missions?.length || 0}</div>
            <div className="stat-label">Total de Misiones</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{missions?.filter(m => !m.completed).length || 0}</div>
            <div className="stat-label">Misiones Pendientes</div>
          </div>
        </div>

        {/* Sección de misiones */}
        <div className="missions-section">
          <h2 className="section-title">
            🎯 Misiones Disponibles
          </h2>
          <MissionList missions={missions} onMissionAction={onMissionAction} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
