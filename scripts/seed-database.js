#!/usr/bin/env node

/**
 * Database Seeding Script
 * 
 * This script seeds the Firebase database with initial data including:
 * - Super admin account
 * - Default categories
 * - Sample products
 * 
 * Usage:
 *   npm run seed              # Seed only if data doesn't exist
 *   npm run seed:force        # Force reseed (overwrites existing data)
 */

const { initializeApp } = require('firebase/app');
const { getAuth, connectAuthEmulator } = require('firebase/auth');
const { getFirestore, connectFirestoreEmulator } = require('firebase/firestore');

// Firebase configuration (using environment variables)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Check if we should use emulators
const useEmulator = process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Connect to emulators if specified
if (useEmulator) {
  console.log('🔧 Using Firebase Emulators');
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (error) {
    console.log('Emulators already connected or not available');
  }
} else {
  console.log('🌐 Using Production Firebase');
}

// Import seeding functions (we'll need to adapt the TypeScript code)
const seedDatabase = async (force = false) => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Note: This is a simplified version. In a real implementation,
    // you would either:
    // 1. Compile the TypeScript seeding code to JavaScript
    // 2. Use ts-node to run TypeScript directly
    // 3. Rewrite the seeding logic in JavaScript
    
    console.log('⚠️  This is a placeholder script.');
    console.log('To use the seeding functionality:');
    console.log('1. Run the React app in development mode');
    console.log('2. Open the browser console');
    console.log('3. Import and run the seeder:');
    console.log('   import { dataSeeder } from "./src/utils/seedData";');
    console.log('   dataSeeder.seedAll();');
    console.log('');
    console.log('Or add a seeding button to your admin interface.');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const force = args.includes('--force') || args.includes('-f');

// Run seeding
seedDatabase(force);