require('dotenv').config();
const express = require('express');
const passport = require('passport');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const setupPassport = require('./auth');
const missionsRouter = require('./missions');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar CORS para el mismo dominio
app.use(cors({
  origin: true, // Permitir el mismo origen
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
}));

setupPassport();

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Configurar sesiones mínimas SOLO para OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecreto',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000 // Solo 10 minutos para OAuth
  },
  store: new (require('express-session').MemoryStore)()
}));

// Inicializar Passport con sesiones
app.use(passport.initialize());
app.use(passport.session());

// Serialización de usuario para sesiones
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Middleware para verificar JWT
const authenticateJWT = (req, res, next) => {
  console.log('🔐 Middleware JWT ejecutándose...');
  console.log('🍪 Cookies recibidas:', req.headers.cookie);
  
  const token = req.cookies.jwt || req.headers.authorization?.split(' ')[1];
  
  console.log('🎫 Token encontrado:', token ? 'SÍ' : 'NO');
  if (token) {
    console.log('🎫 Token (primeros 50 chars):', token.substring(0, 50) + '...');
  }
  
  if (!token) {
    console.log('❌ No hay token, devolviendo 401');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    console.log('🔍 Verificando JWT...');
    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'supersecreto');
    console.log('✅ JWT válido, usuario:', decoded.username);
    req.user = decoded;
    next();
  } catch (error) {
    console.log('❌ Error verificando JWT:', error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// API Routes
app.use('/api/missions', authenticateJWT, missionsRouter);

app.get('/api/user', authenticateJWT, (req, res) => {
  console.log('👤 Usuario autenticado con JWT:', req.user.username);
  res.json({ user: req.user });
});

// Almacenamiento temporal para OAuth (en lugar de sesiones)
const oauthStates = new Map();

// Rutas de autenticación
app.get('/auth/twitter', (req, res) => {
  console.log('🔐 Iniciando autenticación con Twitter...');
  
  // Generar state aleatorio para seguridad
  const state = Math.random().toString(36).substring(2, 15);
  
  // Generar code verifier
  const codeVerifier = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // Guardar state en memoria temporal
  oauthStates.set(state, {
    timestamp: Date.now(),
    codeVerifier: codeVerifier
  });
  
  // Limpiar states antiguos (más de 10 minutos)
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [key, value] of oauthStates.entries()) {
    if (value.timestamp < tenMinutesAgo) {
      oauthStates.delete(key);
    }
  }
  
  // Generar code challenge
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  console.log('🔑 Code verifier generado:', codeVerifier);
  console.log('🔑 Code challenge generado:', codeChallenge);
  
  // Construir URL de autorización (formato correcto para Twitter OAuth 2.0)
  const authUrl = `https://twitter.com/i/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${process.env.TWITTER_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.TWITTER_CALLBACK_URL)}&` +
    `scope=tweet.read%20users.read%20like.write%20like.read&` +
    `state=${state}&` +
    `code_challenge_method=S256&` +
    `code_challenge=${codeChallenge}`;
  
  console.log('🔗 Redirigiendo a:', authUrl);
  console.log('🔑 State guardado:', state);
  res.redirect(authUrl);
});

// Función para generar PKCE code challenge
function generateCodeChallenge(codeVerifier) {
  // Generar hash SHA256 del code verifier
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  // Convertir a base64url (sin padding y reemplazando caracteres)
  return hash.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

app.get('/auth/twitter/callback',
  async (req, res) => {
    console.log('📱 Callback de Twitter recibido');
    console.log('Query params:', req.query);
    console.log('🍪 Cookies en callback:', req.headers.cookie);
    
    const { code, state, error } = req.query;
    
    // Verificar si hay error
    if (error) {
      console.log('❌ Error de Twitter:', error);
      return res.redirect('/?error=' + error);
    }
    
    // Verificar state
    if (!oauthStates.has(state)) {
      console.log('❌ State inválido o expirado');
      return res.redirect('/?error=invalid_state');
    }

    const stateData = oauthStates.get(state);
    const codeVerifier = stateData.codeVerifier;

    console.log('🔑 Code verifier recuperado:', codeVerifier);
    console.log('🔑 Code verifier que se enviará a Twitter:', codeVerifier);

    try {
      console.log('🔄 Intercambiando código por token...');
      
      // Intercambiar código por token de acceso
      const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: process.env.TWITTER_CALLBACK_URL,
          code_verifier: codeVerifier
        })
      });
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.log('❌ Error obteniendo token:', tokenResponse.status, errorText);
        return res.redirect('/?error=token_error');
      }
      
      const tokenData = await tokenResponse.json();
      console.log('✅ Token obtenido:', tokenData.access_token ? 'SÍ' : 'NO');
      
      let user; // Declarar user fuera del try-catch
      
      try {
        console.log('👤 Obteniendo información del usuario de Twitter...');
        
        // Obtener información del usuario usando la API de Twitter
        const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=id,username,name,profile_image_url', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`
          }
        });
        
        if (!userResponse.ok) {
          console.log('⚠️ No se pudo obtener información del usuario, usando datos básicos');
          throw new Error('User info not available');
        }
        
        const userData = await userResponse.json();
        console.log('👤 Datos del usuario obtenidos:', userData);
        
        // Crear usuario con información real de Twitter
        user = {
          id: userData.data.id,
          username: userData.data.username,
          displayName: userData.data.name,
          photo: userData.data.profile_image_url,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token
        };
        
        console.log('👤 Usuario creado con datos reales:', user.username, user.displayName);
        
      } catch (error) {
        console.log('⚠️ Error obteniendo información del usuario, usando datos básicos:', error.message);
        
        // Fallback: crear usuario básico
        user = {
          id: 'twitter_user_' + Date.now(),
          username: 'twitter_user',
          displayName: 'Twitter User',
          photo: null,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token
        };
        
        console.log('👤 Usuario básico creado:', user.username);
      }
      
      console.log('🔑 Generando JWT...');
      
      // Generar JWT
      const token = jwt.sign(
        user, 
        process.env.SESSION_SECRET || 'supersecreto',
        { expiresIn: '24h' }
      );
      
      console.log('🎫 JWT generado:', token.substring(0, 50) + '...');
      console.log('🍪 Configurando cookie JWT...');
      
      // Redirigir al frontend con el token en cookie
      res.cookie('jwt', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
      });
      
      console.log('🍪 Cookie JWT configurada');
      console.log('🧹 Limpiando sesión OAuth...');
      
      // Limpiar la sesión de OAuth
      oauthStates.delete(state);
      
      console.log('🔄 Redirigiendo al frontend...');
      res.redirect('/?fromTwitter=success');
      
    } catch (error) {
      console.log('💥 Error en callback:', error.message);
      res.redirect('/?error=callback_error');
    }
  }
);

app.get('/auth/logout', (req, res) => {
  console.log('🚪 Usuario cerrando sesión');
  res.clearCookie('jwt');
  res.redirect('/');
});

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Ruta para la API
app.get('/api', (req, res) => {
  res.json({ message: 'API de Twitter Missions funcionando' });
});

// Ruta catch-all para servir el frontend (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
