import { initializeApp } from 'firebase/app';
import { getAuth, TwitterAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
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

// Configure Firebase persistence for longer sessions
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('✅ Firebase persistence set to local (longer sessions)');
  })
  .catch((error) => {
    console.error('❌ Error setting Firebase persistence:', error);
  });

// Configure Twitter provider - CONFIGURACIÓN SIMPLE Y FUNCIONAL
export const twitterProvider = new TwitterAuthProvider();

// 🔒 CONFIGURACIÓN MÍNIMA PARA OAUTH 1.0A
// Solo parámetros esenciales que funcionan con Firebase
twitterProvider.setCustomParameters({
  'lang': 'en' // Solo idioma, sin parámetros complejos
});

export default app;
