require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
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

// Configurar sesiones para el mismo dominio
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecreto',
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: true, // Para HTTPS
    httpOnly: true,
    sameSite: 'lax', // Para el mismo dominio
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  },
  store: new (require('express-session').MemoryStore)() // Usar MemoryStore temporalmente
}));

app.use(passport.initialize());
app.use(passport.session());

// API Routes
app.use('/api/missions', missionsRouter);

app.get('/api/user', (req, res) => {
  console.log('👤 Consultando usuario, autenticado:', req.isAuthenticated());
  if (req.isAuthenticated()) {
    console.log('✅ Usuario autenticado:', req.user.username);
    res.json({ user: req.user });
  } else {
    console.log('❌ Usuario NO autenticado');
    res.status(401).json({ user: null });
  }
});

// Rutas de autenticación
app.get('/auth/twitter', (req, res, next) => {
  console.log('🔐 Iniciando autenticación con Twitter...');
  next();
}, passport.authenticate('twitter'));

app.get('/auth/twitter/callback',
  (req, res, next) => {
    console.log('📱 Callback de Twitter recibido');
    console.log('Query params:', req.query);
    next();
  },
  passport.authenticate('twitter', { failureRedirect: '/' }),
  (req, res) => {
    console.log('✅ Autenticación exitosa con Twitter');
    console.log('Usuario autenticado:', req.user);
    
    // Redirigir a la página principal (mismo dominio)
    res.redirect('/?fromTwitter=success');
  }
);

app.get('/auth/logout', (req, res) => {
  console.log('🚪 Usuario cerrando sesión');
  req.logout(() => {
    console.log('✅ Sesión cerrada, redirigiendo...');
    res.redirect('/');
  });
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
