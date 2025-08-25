const admin = require('firebase-admin');

// Inicializar Firebase Admin
let serviceAccount;

try {
  // En producción (Vercel), usa variables de entorno
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log('✅ Loading Firebase service account from environment variable');
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    console.log('✅ Loading Firebase service account from individual environment variables');
    serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "default",
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID || "default",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };
  } else {
    console.log('⚠️ No Firebase configuration found, using default initialization');
    // Inicializar con configuración mínima para evitar crash
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'default-project'
    });
    
    const auth = admin.auth();
    const db = admin.firestore();
    
    module.exports = { admin, auth, db };
    return;
  }
} catch (error) {
  console.error('❌ Error loading Firebase service account:', error.message);
  console.log('💡 Make sure you have FIREBASE_SERVICE_ACCOUNT environment variable set in Vercel');
  console.log('💡 Or set individual variables: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
  
  // Inicializar con configuración mínima para evitar crash
  try {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'default-project'
    });
    console.log('✅ Firebase initialized with minimal configuration');
  } catch (initError) {
    console.error('❌ Failed to initialize Firebase even with minimal config:', initError.message);
    // No hacer process.exit(1) para evitar crash de la función serverless
  }
  
  const auth = admin.auth();
  const db = admin.firestore();
  
  module.exports = { admin, auth, db };
  return;
}

// Inicializar la app con configuración completa
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });
  console.log('✅ Firebase initialized successfully with service account');
} catch (error) {
  console.error('❌ Error initializing Firebase app:', error.message);
  // Fallback a configuración mínima
  admin.initializeApp({
    projectId: serviceAccount.project_id || 'default-project'
  });
  console.log('✅ Firebase initialized with fallback configuration');
}

// Exportar servicios
const auth = admin.auth();
const db = admin.firestore();

module.exports = { admin, auth, db };
