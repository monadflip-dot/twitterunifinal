import React, { useEffect, useState } from 'react';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard';
import './App.css';

// Usar rutas relativas ya que frontend y backend están en el mismo dominio
const API_URL = '';

function App() {
  const [user, setUser] = useState(null);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Verificar si el usuario está autenticado al cargar la app
  useEffect(() => {
    // Verificar si venimos del login exitoso de Twitter
    const urlParams = new URLSearchParams(window.location.search);
    const fromTwitter = urlParams.get('fromTwitter');
    
    if (fromTwitter === 'success') {
      // Limpiar la URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Verificar autenticación inmediatamente
      checkAuthStatus();
    } else {
      checkAuthStatus();
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/user`, { 
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (res.status === 200) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          fetchMissions();
        }
      } else if (res.status === 401) {
        // Usuario no autenticado, es normal
        setUser(null);
      }
    } catch (error) {
      console.log('Usuario no autenticado');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMissions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/missions`, { 
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMissions(data.missions || []);
      }
    } catch (error) {
      console.error('Error fetching missions:', error);
    }
  };

  const handleLogin = () => {
    window.location.href = `${API_URL}/auth/twitter`;
  };

  const handleMissionAction = async (missionId) => {
    try {
      const res = await fetch(`${API_URL}/api/missions/${missionId}/complete`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMissions((prev) =>
            prev.map((m) => (m.id === missionId ? { ...m, completed: true } : m))
          );
          
          // Mostrar mensaje con puntos ganados
          const mission = missions.find(m => m.id === missionId);
          const points = data.points || mission?.points || 0;
          alert(`¡Misión completada! 🎉\n\nHas ganado ${points} puntos por ${getMissionTypeLabel(mission?.type)}`);
        } else {
          alert('No se pudo verificar la misión. ¿Seguro que realizaste la acción en Twitter?\n\nRecuerda que debes:\n1. Ir al tweet de ABSPFC\n2. Realizar la acción (like, retweet o comentar)\n3. Volver aquí y hacer click en "Completar"');
        }
      } else {
        alert('Error al verificar la misión. Inténtalo de nuevo.');
      }
    } catch (error) {
      alert('Error de conexión. Verifica tu conexión a internet.');
    }
  };

  const getMissionTypeLabel = (type) => {
    const labels = {
      like: 'dar like',
      retweet: 'hacer retweet',
      comment: 'comentar'
    };
    return labels[type] || 'completar la misión';
  };

  if (loading) return <div className="app-container">Cargando...</div>;

  return (
    <div className="app-container">
      {!user ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <Dashboard user={user} missions={missions} onMissionAction={handleMissionAction} />
      )}
    </div>
  );
}

export default App;
