import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Get Firebase config from environment variables only (no secrets in repo)
// In Vite, environment variables must be prefixed with VITE_ to be exposed to client code
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validate that required config is present
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('[FIREBASE] ❌ Missing required Firebase configuration!');
    console.error('[FIREBASE] Please set VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID environment variables');
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

console.log('[FIREBASE] Initialized with project:', firebaseConfig.projectId);
console.log('[FIREBASE] Using environment variables:', !!import.meta.env.VITE_FIREBASE_API_KEY);
