# 🚀 Configuración de Vercel para PENGUIN FISHING CLUB

## 📋 Variables de Entorno Requeridas

### **Firebase Admin SDK:**
- `FIREBASE_PROJECT_ID`: `twitter-1d917`
- `FIREBASE_CLIENT_EMAIL`: Tu email del service account
- `FIREBASE_PRIVATE_KEY`: Tu clave privada del service account

### **JWT Secret:**
- `SESSION_SECRET`: Una clave secreta para firmar JWT tokens

## 🔧 Pasos para Configurar:

### **1. Obtener Firebase Admin SDK:**
1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto `twitter-1d917`
3. Ve a **Project Settings** → **Service accounts**
4. Haz clic en **"Generate new private key"**
5. Descarga el archivo JSON

### **2. Configurar en Vercel:**
1. Ve a tu proyecto en Vercel
2. **Settings** → **Environment Variables**
3. Agrega cada variable:

| Variable | Valor |
|----------|-------|
| `FIREBASE_PROJECT_ID` | `twitter-1d917` |
| `FIREBASE_CLIENT_EMAIL` | Del JSON descargado |
| `FIREBASE_PRIVATE_KEY` | Del JSON descargado (con comillas) |
| `SESSION_SECRET` | Una clave secreta aleatoria |

### **3. Redeploy:**
- Después de agregar las variables, haz redeploy

## ✅ **Ventajas de esta configuración:**

- **Todo en Vercel**: Frontend + Backend en un solo lugar
- **Sin CORS**: Todas las llamadas son locales
- **Más rápido**: Sin latencia entre servicios
- **Más simple**: Una sola plataforma para mantener
- **Serverless**: Escala automáticamente

## 🎯 **Endpoints disponibles:**

- `POST /api/auth` - Autenticación Firebase
- `GET /api/user` - Información del usuario
- `GET /api/missions` - Lista de misiones
- `POST /api/missions` - Completar misión

## 🔄 **Después del setup:**

Tu app funcionará completamente en Vercel sin necesidad de Render o servicios externos.
