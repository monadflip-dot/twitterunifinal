import React, { useState, useEffect } from 'react';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard';
import './App.css';
import { auth } from './firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const userData = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'User',
          photo: firebaseUser.photoURL,
          username: firebaseUser.displayName || 'user',
          email: firebaseUser.email
        };
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        // User is signed out
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      // Even if logout fails, clear local state
      setIsAuthenticated(false);
      setUser(null);
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
