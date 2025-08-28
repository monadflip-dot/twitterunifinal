# 📚 DOCUMENTACIÓN COMPLETA DEL PROYECTO - PENGUIN FISHING CLUB

## 🎯 **DESCRIPCIÓN GENERAL:**
Aplicación web de misiones para whitelist del "Penguin Fishing Club" que permite a los usuarios:
- Hacer login con Twitter (Firebase Auth)
- Completar misiones sociales (follow, like, retweet, comment)
- Ganar puntos por cada misión completada
- Ver estadísticas de progreso
- Almacenar progreso en Firebase Firestore

## 🏗️ **ARQUITECTURA DEL PROYECTO:**

### **Frontend (React + Vite):**
- **Framework:** React 18 con Vite
- **Autenticación:** Firebase Auth (Twitter OAuth)
- **Estado:** React hooks (useState, useEffect)
- **Routing:** React Router (implícito con componentes)

### **Backend (Vercel Serverless Functions):**
- **API Routes:** `/api/*` en carpeta `frontend/api/`
- **Base de Datos:** Firebase Firestore
- **Autenticación:** JWT tokens + Firebase Admin SDK
- **Deployment:** Vercel (solo frontend, Root Directory: `frontend`)

## 📁 **ESTRUCTURA DE ARCHIVOS:**

```
frontend/
├── src/
│   ├── App.jsx              # Componente principal, maneja auth state
│   ├── LoginPage.jsx        # Página de login con Twitter
│   ├── Dashboard.jsx        # Dashboard principal con misiones
│   ├── MissionList.jsx      # Lista de misiones disponibles
│   ├── MissionItem.jsx      # Componente individual de misión
│   ├── WalletSection.jsx    # Sección de wallet del usuario
│   ├── firebase.js          # Configuración de Firebase client
│   └── main.jsx             # Punto de entrada de React
├── api/                     # Vercel API Routes (Serverless Functions)
│   ├── auth.js             # POST /api/auth - Login y generación de JWT
│   ├── user.js             # GET /api/user - Datos del usuario y estadísticas
│   ├── missions.js         # GET/POST /api/missions - CRUD de misiones
│   ├── logout.js           # POST /api/logout - Cerrar sesión
│   └── user/               # Subcarpeta con APIs adicionales
│       ├── stats.js        # GET /api/user/stats - Estadísticas del usuario
│       └── wallet.js       # GET/POST /api/user/wallet - Gestión de wallet
└── package.json            # Dependencias incluyendo firebase-admin y jsonwebtoken
```

## 🔐 **FLUJO DE AUTENTICACIÓN:**

### **1. Login Inicial:**
```
Usuario hace click en "Login with Twitter"
↓
Firebase Auth abre popup de Twitter
↓
Usuario autoriza en Twitter
↓
Firebase devuelve resultado con user data
↓
LoginPage.jsx llama a /api/auth con Firebase ID token
↓
API auth.js verifica token con Firebase Admin
↓
Se crea/actualiza usuario en Firestore
↓
Se genera JWT token con SESSION_SECRET
↓
JWT se guarda en localStorage
↓
Se hace reload de la página
```

### **2. Verificación de Sesión:**
```
App.jsx se monta
↓
checkAuthStatus() se ejecuta
↓
Se obtiene JWT de localStorage
↓
Se llama a /api/user para verificar JWT
↓
API user.js verifica JWT y obtiene datos de Firestore
↓
Si válido: setUser(data.user) y setIsAuthenticated(true)
↓
Si inválido: limpia localStorage y redirige a LoginPage
```

### **3. Logout:**
```
Usuario hace click en "Logout"
↓
handleLogout() se ejecuta
↓
Se limpia JWT de localStorage
↓
Se llama a Firebase signOut()
↓
Se limpia estado local (setUser(null), setIsAuthenticated(false))
```

## 📋 **SISTEMA DE MISIONES:**

### **Misiones Disponibles (Hardcoded en missions.js):**
1. **Like ABSPFC tweet** - 50 puntos
2. **Retweet ABSPFC** - 75 puntos  
3. **Comment on ABSPFC** - 100 puntos
4. **Follow ABSPFC** - 150 puntos
5. **Like latest ABSPFC** - 50 puntos
6. **Retweet latest ABSPFC** - 75 puntos
7. **Comment on latest ABSPFC** - 100 puntos

### **Flujo de Completar Misión:**
```
Usuario hace click en "Complete Mission"
↓
handleMissionComplete(missionId) se ejecuta
↓
Se llama a POST /api/missions con missionId
↓
API missions.js verifica JWT y busca misión
↓
Se verifica que no esté ya completada
↓
Se actualiza userProgress en Firestore
↓
Se devuelve respuesta con puntos ganados
↓
Dashboard actualiza estado local
↓
Se muestra alert de éxito
```

## 🗄️ **ESTRUCTURA DE BASE DE DATOS (Firestore):**

### **Colección: users**
```javascript
{
  id: "firebase_uid",
  username: "twitter_username",
  displayName: "Twitter Display Name",
  photo: "profile_photo_url",
  email: "user_email",
  createdAt: "timestamp",
  lastLogin: "timestamp",
  totalPoints: 0,
  completedMissions: []
}
```

### **Colección: userProgress**
```javascript
{
  userId: "firebase_uid",
  completedMissions: [1, 2, 3],  // Array de IDs de misiones completadas
  totalPoints: 225,               // Suma de puntos de misiones completadas
  lastUpdated: "timestamp"
}
```

## 🔧 **VARIABLES DE ENTORNO NECESARIAS:**

### **En Vercel (Environment Variables):**
```bash
# Firebase Admin SDK:
FIREBASE_PROJECT_ID=twitter-1d917
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@twitter-1d917.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n

# JWT Secret:
SESSION_SECRET=clave_secreta_muy_larga_y_compleja
```

### **En firebase.js (Frontend):**
```javascript
// Configuración pública de Firebase (no necesita variables de entorno)
const firebaseConfig = {
  apiKey: "xxx",
  authDomain: "twitter-1d917.firebaseapp.com",
  projectId: "twitter-1d917",
  // ... resto de configuración
};
```

## 🚀 **DEPLOYMENT EN VERCEL:**

### **Configuración Actual:**
- **Root Directory:** `frontend`
- **Framework Preset:** Vite (detectado automáticamente)
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Include files outside root directory:** Enabled

### **Por Qué Funciona:**
- Vercel detecta la carpeta `api/` dentro de `frontend/`
- Crea automáticamente serverless functions para cada archivo
- Las rutas `/api/*` se sirven desde estas funciones
- No se necesita backend separado

## 🔍 **DEBUGGING Y LOGS:**

### **Logs del Frontend (Console del navegador):**
- `🔍 Starting Twitter login...`
- `✅ Popup login successful, processing result...`
- `🔑 Exchanging Firebase token for JWT...`
- `✅ JWT token stored, authentication successful`

### **Logs de las APIs (Vercel Function Logs):**
- `✅ Firebase Admin initialized successfully`
- `✅ Auth successful for user: username`
- `✅ Missions loaded from Firebase: 7`
- `✅ Mission X completed for user: uid`

## ⚠️ **PROBLEMAS COMUNES Y SOLUCIONES:**

### **1. Error 500 en APIs:**
- **Causa:** Variables de entorno no configuradas
- **Solución:** Configurar FIREBASE_* y SESSION_SECRET en Vercel

### **2. Misiones no se cargan:**
- **Causa:** Firebase Admin no puede conectarse
- **Solución:** Verificar credenciales de Firebase

### **3. Login falla después de Twitter:**
- **Causa:** API /api/auth no responde
- **Solución:** Verificar logs de Vercel Function

### **4. JWT inválido:**
- **Causa:** SESSION_SECRET incorrecto o cambiado
- **Solución:** Regenerar SESSION_SECRET y redeploy

## 🎯 **FUNCIONALIDADES IMPLEMENTADAS:**

### **✅ Completadas:**
- Login con Twitter (Firebase Auth)
- Dashboard con misiones
- Sistema de puntos
- Almacenamiento en Firestore
- APIs serverless en Vercel
- Manejo de errores robusto
- Fallbacks para conexiones fallidas

### **🔄 Pendientes (Opcionales):**
- Verificación real de misiones de Twitter
- Sistema de recompensas
- Leaderboard de usuarios
- Notificaciones push
- Modo offline completo

## 📝 **NOTAS IMPORTANTES:**

1. **Firebase Admin se inicializa en cada API Route** para evitar problemas de módulos
2. **JWT tokens expiran en 24 horas** por seguridad
3. **Las misiones son estáticas** pero el progreso se guarda en Firebase
4. **El frontend funciona sin backend** pero con funcionalidad limitada
5. **Vercel redeploya automáticamente** cuando se hace push a GitHub

## 🔗 **ENLACES ÚTILES:**

- **Firebase Console:** https://console.firebase.google.com
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Twitter Developer Portal:** https://developer.twitter.com
- **Proyecto GitHub:** https://github.com/monadflip-dot/twitterunifinal

---

**📅 Última actualización:** Agosto 28, 2024
**👨‍💻 Desarrollado por:** Nicol + Claude (AI Assistant)
**🎯 Estado:** Funcionando en producción (Vercel)
