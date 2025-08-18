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

  return (
    <div style={{ width: '100%' }}>
      {/* Header con perfil y puntos */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 40,
        padding: '20px 0',
        borderBottom: '2px solid #f0f0f0'
      }}>
        {/* Perfil del usuario - Parte superior izquierda */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src={user.photo || user.avatar} 
            alt={user.displayName || user.name} 
            style={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              marginRight: 20,
              border: '3px solid #1da1f2'
            }} 
          />
          <div>
            <h2 style={{ margin: 0, fontSize: 28, color: '#1a1a1a' }}>
              {user.displayName || user.name}
            </h2>
            <span style={{ color: '#666', fontSize: 18, display: 'block', marginBottom: 8 }}>
              @{user.username}
            </span>
            <div style={{ color: '#888', fontSize: 14 }}>
              {completedMissions} de {missions.length} misiones completadas
            </div>
          </div>
        </div>

        {/* Sistema de puntos - Parte superior derecha */}
        <div style={{ 
          textAlign: 'center',
          background: 'linear-gradient(135deg, #1da1f2, #0d8bd9)',
          color: 'white',
          padding: '20px 30px',
          borderRadius: '15px',
          boxShadow: '0 4px 15px rgba(29, 161, 242, 0.3)'
        }}>
          <div style={{ fontSize: 14, marginBottom: 5, opacity: 0.9 }}>
            PUNTOS TOTALES
          </div>
          <div style={{ fontSize: 36, fontWeight: 'bold', marginBottom: 5 }}>
            {totalPoints}
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            ¡Sigue completando misiones!
          </div>
        </div>
      </div>

      {/* Botón de cerrar sesión */}
      <div style={{ textAlign: 'right', marginBottom: 30 }}>
        <button
          style={{ 
            background: '#f8f9fa', 
            border: '1px solid #dee2e6',
            borderRadius: '8px', 
            padding: '12px 24px', 
            fontSize: 16, 
            cursor: 'pointer',
            color: '#6c757d',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#e9ecef';
            e.target.style.borderColor = '#adb5bd';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#f8f9fa';
            e.target.style.borderColor = '#dee2e6';
          }}
          onClick={() => { window.location.href = `${API_URL}/auth/logout`; }}
        >
          Cerrar sesión
        </button>
      </div>

      {/* Título de misiones */}
      <h3 style={{ 
        textAlign: 'center', 
        fontSize: 28, 
        marginBottom: 32,
        color: '#1a1a1a',
        fontWeight: '600'
      }}>
        🎯 Misiones Disponibles
      </h3>

      {/* Lista de misiones */}
      <MissionList missions={missions} onMissionAction={onMissionAction} />
    </div>
  );
};

export default Dashboard;
