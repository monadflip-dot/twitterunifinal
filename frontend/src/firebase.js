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
// Permitir que Twitter recuerde la sesión del usuario
twitterProvider.setCustomParameters({
  'lang': 'en' // Solo idioma específico, sin forzar login
});

export default app;
