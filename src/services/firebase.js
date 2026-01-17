import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Get Firebase config from environment variables
// In Vite, environment variables must be prefixed with VITE_ to be exposed to client code
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAmDK9PqSWGSHv5b5D9KPUfDby0omJ3u7Y",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "akwaflow-manager-v1.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "akwaflow-manager-v1",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "akwaflow-manager-v1.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1011919101048",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1011919101048:web:58b26850e6fe1c7774a18d"
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
