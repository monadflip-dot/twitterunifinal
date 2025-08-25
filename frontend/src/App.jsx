import React, { useState, useEffect } from 'react';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard';
import './App.css';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

const API_URL = process.env.REACT_APP_API_URL || '';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
    
    // Check if we have a token in URL (from Twitter OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const authMethod = urlParams.get('auth_method');
    
    if (tokenFromUrl) {
      console.log('🔑 JWT token found in URL, saving to localStorage');
      localStorage.setItem('jwt_token', tokenFromUrl);
      
      // Remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Check auth status again with the new token
      checkAuthStatus();
    }
    
    // Check if we need to initiate Firebase Twitter auth
    if (authMethod === 'firebase_twitter') {
      console.log('🔐 Initiating Firebase Twitter authentication...');
      
      // Remove auth_method from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Import and trigger Firebase Twitter login
      import('./firebase').then(({ auth, twitterProvider }) => {
        import('firebase/auth').then(({ signInWithPopup }) => {
          signInWithPopup(auth, twitterProvider)
            .then((result) => {
              console.log('✅ Firebase Twitter auth successful:', result.user);
              // Handle successful login
              handleFirebaseLogin(result);
            })
            .catch((error) => {
              console.error('❌ Firebase Twitter auth failed:', error);
              // Handle error
              alert('Twitter login failed: ' + error.message);
            });
        });
      });
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
      
      const response = await fetch(`${API_URL}/api/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      if (token) {
        // Call logout API
        await fetch(`${API_URL}/api/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
      // Clear JWT token from localStorage
      localStorage.removeItem('jwt_token');
      try { await signOut(auth); } catch {}
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      // Even if API call fails, clear local state
      localStorage.removeItem('jwt_token');
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const handleFirebaseLogin = async (result) => {
    try {
      console.log('🔄 Processing Firebase login result...');
      
      // Get Twitter access token from Firebase result
      const credential = result.credential;
      const accessToken = credential?.accessToken;
      const accessSecret = credential?.secret;
      
      console.log('🔑 Twitter access token obtained:', !!accessToken);
      
      if (!accessToken) {
        console.log('⚠️ No Twitter access token, user needs to reconnect Twitter');
        alert('Twitter access token not found. Please try logging in again.');
        return;
      }
      
      // Get user profile from Twitter
      const profile = {
        id_str: result.user.providerData[0]?.uid,
        screen_name: result.user.providerData[0]?.screenName,
        name: result.user.providerData[0]?.displayName,
        photoURL: result.user.providerData[0]?.photoURL
      };
      
      console.log('👤 User profile:', profile);
      
      // Get Firebase ID token
      const idToken = await result.user.getIdToken();
      
      // Send to backend for JWT generation
      const response = await fetch('/api/auth/firebase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken,
          twitterAccessToken: accessToken,
          twitterAccessSecret: accessSecret,
          profile
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend authentication successful');
        
        // Save JWT token
        localStorage.setItem('jwt_token', data.token);
        
        // Update auth state
        setUser({
          id: result.user.uid,
          username: profile.screen_name || result.user.displayName,
          displayName: profile.name || result.user.displayName,
          photo: profile.photoURL || result.user.photoURL
        });
        setIsAuthenticated(true);
        
        console.log('🎉 User successfully logged in and authenticated');
        
      } else {
        console.error('❌ Backend authentication failed:', response.status);
        const errorData = await response.json();
        alert('Authentication failed: ' + (errorData.error || 'Unknown error'));
      }
      
    } catch (error) {
      console.error('💥 Error processing Firebase login:', error);
      alert('Error processing login: ' + error.message);
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

  return (
    <div className="app">
      {isAuthenticated ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <LoginPage />
      )}
    </div>
  );
}

export default App;
