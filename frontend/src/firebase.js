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

// Configurar scopes de Twitter
twitterProvider.addScope('tweet.read');
twitterProvider.addScope('users.read');
twitterProvider.addScope('like.write');
twitterProvider.addScope('like.read');

export default app;
