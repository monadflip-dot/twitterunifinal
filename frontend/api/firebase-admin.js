import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    // Check if we have the required environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.error('❌ Missing Firebase Admin environment variables:');
      console.error('FIREBASE_PROJECT_ID:', projectId ? '✅ Set' : '❌ Missing');
      console.error('FIREBASE_CLIENT_EMAIL:', clientEmail ? '✅ Set' : '❌ Missing');
      console.error('FIREBASE_PRIVATE_KEY:', privateKey ? '✅ Set' : '❌ Missing');
      throw new Error('Firebase Admin environment variables not configured');
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n')
      })
    });

    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    throw error;
  }
}

export const db = getFirestore();
export default getApps()[0];
