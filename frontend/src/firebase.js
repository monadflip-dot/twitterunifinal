import { initializeApp } from 'firebase/app';
import { getAuth, TwitterAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuración real de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAtEw0zB7fRbQ_2DMwHLzvCbrXbC1y81ok",
  authDomain: "twitter-1d917.firebaseapp.com",
  projectId: "twitter-1d917",
  storageBucket: "twitter-1d917.firebasestorage.app",
  messagingSenderId: "566048144506",
  appId: "1:566048144506:web:c4086964d7bdf083984fc3",
  measurementId: "G-BK2KT7VS8M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const twitterProvider = new TwitterAuthProvider();

// 🔒 PERMISOS OPTIMIZADOS - Solo los mínimos necesarios
// tweet.read: Para leer tweets y verificar contenido
// users.read: Para obtener información básica del usuario
twitterProvider.addScope('tweet.read');
twitterProvider.addScope('users.read');

// ❌ PERMISOS ELIMINADOS por seguridad:
// like.write: NO necesario (solo verificación)
// like.read: NO necesario (solo verificación)

export default app;
