import { initializeApp } from 'firebase/app';
import { getAuth, TwitterAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuración de Firebase hardcodeada para producción
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

// Configure Twitter provider with specific settings
export const twitterProvider = new TwitterAuthProvider();

// 🔒 CONFIGURACIÓN OPTIMIZADA PARA OAUTH 1.0A
// Usar sesión existente de Twitter y no forzar nuevo login
twitterProvider.setCustomParameters({
  'lang': 'en', // Solo idioma específico
  'force_login': 'false', // NO forzar login, usar sesión existente
  'screen_name': '', // Permitir que Twitter use la sesión actual
  'x_auth_access_type': 'read' // Solo permisos de lectura
});

export default app;
