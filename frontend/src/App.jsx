import React, { useState, useEffect } from 'react';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard';
import './App.css';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

const API_URL = 'https://www.pfcwhitelist.xyz';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
    // Check if we have a token in URL (from Twitter OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
      console.log('🔑 JWT token found in URL, saving to localStorage');
      localStorage.setItem('jwt_token', tokenFromUrl);
      // Remove token from URL
      window.history.replaceState({}, document.title, '/');
      // Check auth status again with the new token
      checkAuthStatus();
      // Redirect to dashboard after login
      window.location.href = '/dashboard';
    } else {
      // If already authenticated, redirect to dashboard
      const token = localStorage.getItem('jwt_token');
      if (token && window.location.pathname === '/') {
        window.location.href = '/dashboard';
      }
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setLoading(false);
        return;
      }
      // This endpoint does not exist, so skip user fetch
      setIsAuthenticated(true);
      setLoading(false);
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      if (token) {
        await fetch(`${API_URL}/api/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
      localStorage.removeItem('jwt_token');
      try { await signOut(auth); } catch {}
      setIsAuthenticated(false);
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      localStorage.removeItem('jwt_token');
      setIsAuthenticated(false);
      setUser(null);
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Routing logic: show dashboard if on /dashboard and authenticated
  if (isAuthenticated && window.location.pathname === '/dashboard') {
    return (
      <div className="app">
        <Dashboard user={user} onLogout={handleLogout} />
      </div>
    );
  }

  // Show login page for all other routes
  return (
    <div className="app">
      <LoginPage />
    </div>
  );
}

export default App;
