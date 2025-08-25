// 🔑 CONFIGURACIÓN CRÍTICA PARA LOGIN (HARDCODED)
module.exports = {
  // Twitter API - CRÍTICO para login
  TWITTER_CLIENT_ID: 'YOUR_ACTUAL_TWITTER_CLIENT_ID', // 🔴 REEMPLAZAR CON TU CLIENT ID REAL
  TWITTER_CLIENT_SECRET: 'YOUR_ACTUAL_TWITTER_CLIENT_SECRET', // 🔴 REEMPLAZAR CON TU CLIENT SECRET REAL
  TWITTER_CALLBACK_URL: 'https://www.pfcwhitelist.xyz/auth/twitter/callback',
  
  // JWT - CRÍTICO para autenticación
  SESSION_SECRET: 'your-super-secret-jwt-key-for-production-2024',
  
  // Server
  PORT: 3001,
  NODE_ENV: 'production'
};
