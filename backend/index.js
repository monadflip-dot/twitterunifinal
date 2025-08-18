require('dotenv').config();
const express = require('express');
const passport = require('passport');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
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

// Inicializar Passport sin sesiones
app.use(passport.initialize());

// Middleware para verificar JWT
const authenticateJWT = (req, res, next) => {
  const token = req.cookies.jwt || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'supersecreto');
    req.user = decoded;
    next();
  } catch (error) {
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
    next();
  },
  passport.authenticate('oauth2', { failureRedirect: '/', session: false }),
  (req, res) => {
    console.log('✅ Autenticación exitosa con Twitter');
    console.log('Usuario autenticado:', req.user);
    
    // Generar JWT
    const token = jwt.sign(
      req.user, 
      process.env.SESSION_SECRET || 'supersecreto',
      { expiresIn: '24h' }
    );
    
    // Redirigir al frontend con el token en cookie
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    });
    
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
