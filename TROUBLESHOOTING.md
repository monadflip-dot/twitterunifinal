# Solución de Problemas - Twitter Missions Backend

## Error 502 (Bad Gateway)

### ¿Qué significa?
El error 502 indica que el servidor backend no está respondiendo correctamente. Esto puede suceder por varias razones:

1. **El servidor backend se está reiniciando**
2. **Problemas de configuración de Firebase**
3. **Variables de entorno faltantes**
4. **Problemas de memoria o CPU**
5. **Errores en el código que causan crashes**

### Soluciones Inmediatas

#### 1. Verificar el estado del servidor
```bash
# En el directorio backend
npm run health
```

#### 2. Revisar logs del servidor
- Ve a Render Dashboard
- Selecciona tu servicio backend
- Revisa los logs en tiempo real
- Busca errores relacionados con Firebase o variables de entorno

#### 3. Verificar variables de entorno en Render
Asegúrate de que estas variables estén configuradas en Render:

- `FIREBASE_SERVICE_ACCOUNT` - JSON completo de la cuenta de servicio
- `SESSION_SECRET` - Clave secreta para JWT
- `TWITTER_CLIENT_ID` - ID del cliente de Twitter
- `TWITTER_CLIENT_SECRET` - Secreto del cliente de Twitter
- `FRONTEND_URL` - URL del frontend

### Soluciones a Largo Plazo

#### 1. Mejorar el manejo de errores
El código ya incluye mejor manejo de errores que previene crashes del servidor.

#### 2. Implementar health checks
El servidor ahora incluye endpoints de health check:
- `/health` - Estado general del servidor
- `/test` - Endpoint de prueba para debugging

#### 3. Logging mejorado
El servidor ahora registra todas las operaciones importantes para facilitar el debugging.

### Verificación de Firebase

#### 1. Verificar cuenta de servicio
```bash
# En el directorio backend
node -e "
const admin = require('firebase-admin');
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  console.log('✅ Firebase config válida');
  console.log('Project ID:', serviceAccount.project_id);
} catch (e) {
  console.log('❌ Error en Firebase config:', e.message);
}
"
```

#### 2. Verificar conexión a Firestore
```bash
npm run health
```

### Verificación de Twitter API

#### 1. Verificar credenciales
```bash
# En el directorio backend
node -e "
console.log('Twitter Client ID:', process.env.TWITTER_CLIENT_ID ? '✅ Configurado' : '❌ Faltante');
console.log('Twitter Client Secret:', process.env.TWITTER_CLIENT_SECRET ? '✅ Configurado' : '❌ Faltante');
"
```

### Debugging del Frontend

#### 1. Verificar cookies JWT
- Abre las herramientas de desarrollador
- Ve a la pestaña Application/Storage
- Verifica que la cookie `jwt` esté presente
- Verifica que no haya expirado

#### 2. Verificar requests
- Abre la pestaña Network
- Intenta completar una misión
- Revisa el request a `/api/missions/{id}/complete`
- Verifica que incluya las cookies correctas

### Comandos Útiles

#### Reiniciar el servidor
```bash
# En Render Dashboard
# 1. Ve a tu servicio
# 2. Haz clic en "Manual Deploy"
# 3. Selecciona "Clear build cache & deploy"
```

#### Verificar logs en tiempo real
```bash
# En Render Dashboard
# 1. Ve a tu servicio
# 2. Haz clic en "Logs"
# 3. Selecciona "Live logs"
```

### Prevención de Errores

#### 1. Monitoreo continuo
- Configura alertas en Render para errores 502
- Revisa logs regularmente
- Monitorea el uso de recursos

#### 2. Testing
- Ejecuta `npm run health` antes de cada deploy
- Prueba endpoints críticos después de cambios
- Verifica que las variables de entorno estén correctas

#### 3. Backup de configuración
- Guarda copias de las variables de entorno
- Documenta cambios en la configuración
- Mantén un registro de problemas y soluciones

### Contacto y Soporte

Si los problemas persisten:

1. **Revisa los logs del servidor** para errores específicos
2. **Ejecuta el health check** para identificar problemas
3. **Verifica la configuración** de Firebase y Twitter
4. **Revisa el uso de recursos** en Render
5. **Considera escalar** el servicio si es necesario

### Recursos Adicionales

- [Documentación de Firebase Admin](https://firebase.google.com/docs/admin/setup)
- [Documentación de Twitter API v2](https://developer.twitter.com/en/docs/twitter-api)
- [Documentación de Render](https://render.com/docs)
- [Guía de JWT](https://jwt.io/introduction)
