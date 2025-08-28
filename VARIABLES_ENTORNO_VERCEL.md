# 🔑 Variables de Entorno para Vercel - API Routes

## 🚨 **IMPORTANTE:**
Para que las API Routes funcionen en Vercel, necesitas configurar estas variables de entorno.

## 📋 **Variables CRÍTICAS (sin estas NO funciona):**

### **1. Firebase Admin SDK:**
```bash
FIREBASE_PROJECT_ID=twitter-1d917
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@twitter-1d917.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

### **2. JWT Secret:**
```bash
SESSION_SECRET=clave_secreta_muy_larga_y_compleja_aqui
```

## 📁 **Dónde Obtener las Variables:**

### **Firebase Service Account:**
1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto `twitter-1d917`
3. **Settings** → **Service accounts**
4. **Generate new private key**
5. Descarga el archivo JSON
6. Copia estos valores:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

### **JWT Secret:**
Genera una clave aleatoria larga:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 🔧 **Cómo Configurar en Vercel:**

### **Opción 1: Dashboard de Vercel (Recomendado)**
1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto `twitterunifinal`
3. Ve a **Settings** → **Environment Variables**
4. Agrega cada variable una por una

### **Opción 2: Vercel CLI**
```bash
vercel env add FIREBASE_PROJECT_ID
vercel env add FIREBASE_CLIENT_EMAIL
vercel env add FIREBASE_PRIVATE_KEY
vercel env add SESSION_SECRET
```

## 🚀 **Después de Configurar:**

1. **Redeploy** tu aplicación en Vercel
2. Las variables se aplicarán automáticamente
3. Las API Routes funcionarán correctamente
4. Podrás acceder a Firebase desde las APIs
5. Las misiones se cargarán desde la base de datos

## ❌ **Errores que se Solucionarán:**

- ✅ `FirebaseAppError: Service account object must contain a string "project_id" property`
- ✅ `JWT verification error: JsonWebTokenError: invalid signature`
- ✅ `Failed to load resource: the server responded with a status of 500`
- ✅ `Failed to load resource: the server responded with a status of 401`
- ✅ `No missions available` en el dashboard

## 🔍 **Verificación:**

Después de configurar, deberías ver en los logs de Vercel:
- ✅ `✅ Firebase Admin initialized successfully`
- ✅ `✅ Missions loaded from Firebase: 7`
- ✅ `✅ User data loaded from Firebase: username`

## 🎯 **Configuración Mínima:**

```bash
# MÍNIMO para que funcione:
FIREBASE_PROJECT_ID=twitter-1d917
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@twitter-1d917.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
SESSION_SECRET=clave_secreta_larga
```

---

**⚠️ NOTA:** Sin estas variables, las API Routes fallarán y el dashboard no mostrará misiones ni estadísticas de Firebase.
