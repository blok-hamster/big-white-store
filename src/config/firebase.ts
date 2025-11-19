import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Check if we're using emulator mode or mock mode for development
const useEmulator = process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true';
const useMockMode = process.env.NODE_ENV === 'development' && !process.env.REACT_APP_FIREBASE_API_KEY;

// Default emulator configuration for local development
const emulatorConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-project.firebaseapp.com',
  projectId: 'demo-project',
  storageBucket: 'demo-project.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef123456'
};

// Production configuration from environment variables
const productionConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Use emulator config if in emulator mode or mock mode, otherwise use production config
const firebaseConfig = (useEmulator || useMockMode) ? emulatorConfig : productionConfig;

// Validate required environment variables only for production
if (!useEmulator) {
  const requiredEnvVars = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_STORAGE_BUCKET',
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    'REACT_APP_FIREBASE_APP_ID'
  ];

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars);
    console.error('Please check your .env.local file and ensure all Firebase configuration variables are set.');
  }
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Connect to emulators in development mode if enabled
if (useEmulator) {
  try {
    // Connect to emulators - these will only connect once
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    connectAuthEmulator(auth, 'http://localhost:9099');
    console.log('🔥 Connected to Firebase emulators');
    console.log('📊 Firestore: localhost:8080');
    console.log('🔐 Auth: localhost:9099');
    console.log('📁 Storage: localhost:9199');
  } catch (error) {
    // Emulators might already be connected, which is fine
    console.warn('Firebase emulators connection warning (this is normal if already connected):', error);
  }
} else if (useMockMode) {
  console.log('🔥 Using Firebase with demo credentials (mock mode)');
  console.log('⚠️  This is for development only - no real Firebase services connected');
} else {
  console.log('🔥 Using Firebase production services');
}

export default app;