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

// Rutas de autenticación
app.get('/auth/twitter', (req, res, next) => {
  console.log('🔐 Iniciando autenticación con Twitter...');
  next();
}, passport.authenticate('oauth2'));

app.get('/auth/twitter/callback',
  (req, res, next) => {
    console.log('📱 Callback de Twitter recibido');
    console.log('Query params:', req.query);
    console.log('🍪 Cookies en callback:', req.headers.cookie);
    next();
  },
  passport.authenticate('oauth2', { failureRedirect: '/', session: false }),
  (req, res) => {
    console.log('✅ Autenticación exitosa con Twitter');
    console.log('👤 Usuario autenticado:', req.user);
    console.log('🔑 Generando JWT...');
    
    // Generar JWT
    const token = jwt.sign(
      req.user, 
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
    console.log('🧹 Destruyendo sesión OAuth...');
    
    // Limpiar la sesión de OAuth
    req.session.destroy();
    
    console.log('🔄 Redirigiendo al frontend...');
    res.redirect('/?fromTwitter=success');
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
