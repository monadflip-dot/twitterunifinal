# Twitter Missions - Proyecto Unificado

Aplicación web para completar misiones en Twitter (like, retweet, comentar) con sistema de puntos.

## 🚀 Características

- **Login con Twitter** usando OAuth 1.0a
- **Misiones específicas** para el tweet de ABSPFC
- **Sistema de puntos** por completar misiones
- **Verificación real** de acciones en Twitter usando la API oficial
- **Dashboard moderno** con perfil de usuario y estadísticas

## 📁 Estructura del Proyecto

```
twitterbackendfinal/
├── backend/          # Servidor Node.js + Express
├── frontend/         # Aplicación React
├── package.json      # Scripts principales
└── README.md         # Este archivo
```

## 🛠️ Configuración para Render

### 1. Variables de Entorno en Render

Configura estas variables en tu servicio de Render:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `TWITTER_CONSUMER_KEY` | `tu_consumer_key` | Consumer Key de tu app de Twitter |
| `TWITTER_CONSUMER_SECRET` | `tu_consumer_secret` | Consumer Secret de tu app de Twitter |
| `TWITTER_CALLBACK_URL` | `https://tuapp.onrender.com/auth/twitter/callback` | URL de callback de Twitter |
| `SESSION_SECRET` | `supersecreto-twitter-missions` | Clave secreta para las sesiones |

### 2. Configuración de Render

**Build Command:**
```bash
npm run build:frontend
```

**Start Command:**
```bash
npm start
```

### 3. Configuración de Twitter

1. Ve a [developer.twitter.com](https://developer.twitter.com/)
2. Crea una nueva app o usa una existente
3. En **App settings** → **Authentication settings**:
   - **App permissions**: Read and Write
   - **Callback URLs**: `https://tuapp.onrender.com/auth/twitter/callback`

## 🔧 Desarrollo Local

### Instalar dependencias:
```bash
npm run install:all
```

### Ejecutar frontend:
```bash
npm run dev:frontend
```

### Ejecutar backend:
```bash
npm run dev:backend
```

## 📱 Misiones Disponibles

- **Like**: 50 puntos - Dar like al tweet de ABSPFC
- **Retweet**: 75 puntos - Hacer retweet al tweet de ABSPFC
- **Comentar**: 100 puntos - Comentar en el tweet de ABSPFC

## 🔐 Flujo de Autenticación

1. Usuario hace click en "Iniciar sesión con Twitter"
2. Backend redirige a Twitter para autorización
3. Usuario autoriza la app
4. Twitter redirige de vuelta al backend
5. Backend crea sesión y redirige al dashboard
6. Usuario puede ver y completar misiones

## 🎯 Tecnologías Utilizadas

- **Backend**: Node.js, Express, Passport.js, Twitter API v2
- **Frontend**: React, CSS-in-JS
- **Autenticación**: OAuth 1.0a con Twitter
- **Despliegue**: Render

## 📝 Notas Importantes

- **Cookies compartidas**: Frontend y backend están en el mismo dominio para compartir sesiones
- **Verificación real**: Las misiones se verifican usando la API oficial de Twitter
- **HTTPS**: Render proporciona HTTPS automáticamente

## 🚨 Solución de Problemas

### Error de sesión:
- Verifica que las variables de entorno estén configuradas correctamente
- Asegúrate de que el callback URL en Twitter coincida exactamente

### Error de CORS:
- El proyecto está configurado para funcionar en el mismo dominio
- No se requieren configuraciones adicionales de CORS

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Render
2. Verifica las variables de entorno
3. Confirma la configuración de Twitter

---

**¡Disfruta completando misiones en Twitter! 🎉**
