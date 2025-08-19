import React from 'react';
import favicon from '../images/favicon.png';

const API_URL = process.env.REACT_APP_API_URL || 'https://twitterunifinal.onrender.com';

function LoginPage() {
  const handleTwitterLogin = () => {
    window.location.href = `${API_URL}/auth/twitter`;
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-panel">
          <div className="login-header">
            <h1>TWITTER MISSIONS</h1>
            <div className="header-separator"></div>
          </div>
          
          <div className="login-content">
            <div className="icon-circle">
              <img src={favicon} alt="Logo" style={{ width: '50px', height: '50px' }} />
            </div>
            <h1>Twitter Missions</h1>
            <p className="login-subtitle">Complete missions and earn points on Twitter</p>
            <button className="twitter-login-btn" onClick={handleTwitterLogin}>
              <i className="fab fa-twitter"></i>
              Login with Twitter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
