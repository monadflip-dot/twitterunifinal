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
            <div className="login-icon">
              <div className="icon-circle">
                <img src={favicon} alt="Logo" style={{ width: '50px', height: '50px' }} />
              </div>
            </div>
            
            <div className="login-text">
              <h2>Completa Misiones</h2>
              <p>Conecta tu cuenta de Twitter y completa misiones para ganar puntos. ¡Demuestra tu actividad en la red social!</p>
            </div>
            
            <button className="login-button" onClick={handleTwitterLogin}>
              <i className="fab fa-twitter"></i>
              Conectar con Twitter
            </button>
            
            <div className="login-features">
              <div className="feature-item">
                <i className="fas fa-heart"></i>
                <span>Dar Likes</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-retweet"></i>
                <span>Hacer Retweets</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-comment"></i>
                <span>Comentar</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
