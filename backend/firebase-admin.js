const admin = require('firebase-admin');

// Inicializar Firebase Admin
// Necesitarás descargar el archivo de clave privada desde Firebase Console
// Ve a: Configuración del proyecto > Cuentas de servicio > Generar nueva clave privada

let serviceAccount;
try {
  // En producción, usa variables de entorno
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Para desarrollo local, puedes usar un archivo
    serviceAccount = require('./firebase-service-account.json');
  }
} catch (error) {
  console.error('❌ Error loading Firebase service account:', error.message);
  console.log('💡 Make sure you have FIREBASE_SERVICE_ACCOUNT environment variable set in Render');
  process.exit(1);
}

// Inicializar la app
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

// Exportar servicios
const auth = admin.auth();
const db = admin.firestore();

module.exports = { admin, auth, db };
