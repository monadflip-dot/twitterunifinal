import React from 'react';

const LoginPage = ({ onLogin }) => (
  <div style={{ width: '100%' }}>
    <h1 style={{ textAlign: 'center', fontSize: 36, marginBottom: 16 }}>Bienvenido a Twitter Missions</h1>
    <p style={{ textAlign: 'center', fontSize: 20, marginBottom: 40 }}>
      Loguéate con Twitter para empezar a completar misiones como dar like, retuitear y comentar.
    </p>
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
      <button
        style={{
          background: '#1da1f2',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          padding: '16px 48px',
          fontSize: 22,
          cursor: 'pointer',
        }}
        onClick={onLogin}
      >
        Iniciar sesión con Twitter
      </button>
    </div>
  </div>
);

export default LoginPage;
