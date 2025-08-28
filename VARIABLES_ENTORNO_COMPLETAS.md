# 🔑 Variables de Entorno COMPLETAS - Análisis del Código

## 🚨 **PROBLEMA ACTUAL:**
La aplicación está fallando porque faltan variables de entorno críticas en Vercel. He analizado todo el código y aquí están **TODAS** las variables que necesita.

## 📋 **Variables de Entorno NECESARIAS (por prioridad):**

### **🔥 CRÍTICAS (la app no funciona sin estas):**

#### **1. Firebase Configuration (MÁS IMPORTANTE)**
```bash
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"twitter-1d917","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-...@twitter-1d917.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-...%40twitter-1d917.iam.gserviceaccount.com"}
```

**⚠️ IMPORTANTE:** Esta variable debe contener el JSON COMPLETO de la cuenta de servicio de Firebase.

#### **2. JWT/Session Secret (CRÍTICA)**
```bash
SESSION_SECRET=tu_clave_secreta_muy_larga_y_compleja_aqui
```

**⚠️ IMPORTANTE:** Esta variable se usa para firmar y verificar JWT tokens.

#### **3. Twitter API Keys (CRÍTICAS)**
```bash
TWITTER_CLIENT_ID=tu_twitter_client_id
TWITTER_CLIENT_SECRET=tu_twitter_client_secret
TWITTER_CALLBACK_URL=https://www.pfcwhitelist.xyz/api/auth/twitter/callback
```

### **⚡ IMPORTANTES (funcionalidad limitada sin estas):**

#### **4. Frontend URL**
```bash
FRONTEND_URL=https://www.pfcwhitelist.xyz
```

#### **5. Firebase Individual Keys (alternativa a FIREBASE_SERVICE_ACCOUNT)**
```bash
FIREBASE_PROJECT_ID=twitter-1d917
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@twitter-1d917.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

### **🔧 OPCIONALES (tienen valores por defecto):**
```bash
NODE_ENV=production
PORT=3001
```

## 🔍 **Dónde se Usan en el Código:**

### **Backend (index.js):**
- `SESSION_SECRET` → JWT signing/verification
- `TWITTER_CLIENT_ID` → Twitter OAuth
- `TWITTER_CLIENT_SECRET` → Twitter OAuth  
- `TWITTER_CALLBACK_URL` → Twitter OAuth callback
- `FRONTEND_URL` → Redirects after OAuth

### **Backend (firebase-admin.js):**
- `FIREBASE_SERVICE_ACCOUNT` → Firebase initialization

### **Frontend API Routes:**
- `FIREBASE_PROJECT_ID` → Firebase Admin initialization
- `FIREBASE_CLIENT_EMAIL` → Firebase Admin credentials
- `FIREBASE_PRIVATE_KEY` → Firebase Admin credentials
- `SESSION_SECRET` → JWT verification

## 📁 **Dónde Obtener las Variables:**

### **Firebase Service Account (RECOMENDADO):**
1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto `twitter-1d917`
3. **Settings** → **Service accounts**
4. **Generate new private key**
5. Descarga el archivo JSON
6. Copia TODO el contenido en `FIREBASE_SERVICE_ACCOUNT`

### **Firebase Individual Keys (ALTERNATIVA):**
Si prefieres usar las variables individuales:
1. Del mismo archivo JSON de Firebase
2. `project_id` → `FIREBASE_PROJECT_ID`
3. `client_email` → `FIREBASE_CLIENT_EMAIL`
4. `private_key` → `FIREBASE_PRIVATE_KEY`

### **JWT Secret:**
Genera una clave aleatoria larga:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### **Twitter API Keys:**
1. Ve a [Twitter Developer Portal](https://developer.twitter.com)
2. Crea una nueva app
3. Obtén las claves de la API
4. **Callback URL:** `https://www.pfcwhitelist.xyz/api/auth/twitter/callback`

## 🔧 **Cómo Configurar en Vercel:**

### **Opción 1: Dashboard de Vercel (Recomendado)**
1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto `twitterunifinal`
3. Ve a **Settings** → **Environment Variables**
4. Agrega cada variable una por una

### **Opción 2: Vercel CLI**
```bash
vercel env add FIREBASE_SERVICE_ACCOUNT
vercel env add SESSION_SECRET
vercel env add TWITTER_CLIENT_ID
vercel env add TWITTER_CLIENT_SECRET
vercel env add TWITTER_CALLBACK_URL
vercel env add FRONTEND_URL
```

## 🚀 **Después de Configurar:**

1. **Redeploy** tu aplicación en Vercel
2. Las variables se aplicarán automáticamente
3. El backend debería funcionar correctamente
4. Las misiones se cargarán desde Firebase
5. Twitter OAuth funcionará

## ❌ **Errores que se Solucionarán:**

- ✅ `FirebaseAppError: Service account object must contain a string "project_id" property`
- ✅ `JWT verification error: JsonWebTokenError: invalid signature`
- ✅ `Failed to load resource: the server responded with a status of 500`
- ✅ `Failed to load resource: the server responded with a status of 401`
- ✅ `Twitter OAuth errors`

## 🔍 **Verificación:**

Después de configurar, deberías ver en los logs:
- ✅ `✅ Firebase initialized successfully`
- ✅ `✅ JWT token generated successfully`
- ✅ `✅ Missions loaded from Firebase: 7`
- ✅ `🔑 Client ID: Set`
- ✅ `🔑 Client Secret: Set`

## 🎯 **Configuración Mínima Recomendada:**

```bash
# MÍNIMO para que funcione:
FIREBASE_SERVICE_ACCOUNT={...}  # JSON completo de Firebase
SESSION_SECRET=clave_secreta_larga
TWITTER_CLIENT_ID=tu_client_id
TWITTER_CLIENT_SECRET=tu_client_secret
TWITTER_CALLBACK_URL=https://www.pfcwhitelist.xyz/api/auth/twitter/callback
FRONTEND_URL=https://www.pfcwhitelist.xyz
```

---

**⚠️ NOTA:** Sin estas variables, la aplicación seguirá funcionando en modo offline con misiones estáticas, pero no tendrás acceso a la base de datos de Firebase ni funcionalidad completa del backend.
