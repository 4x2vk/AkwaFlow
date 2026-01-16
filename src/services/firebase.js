import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAmDK9PqSWGSHv5b5D9KPUfDby0omJ3u7Y",
    authDomain: "akwaflow-manager-v1.firebaseapp.com",
    projectId: "akwaflow-manager-v1",
    storageBucket: "akwaflow-manager-v1.firebasestorage.app",
    messagingSenderId: "1011919101048",
    appId: "1:1011919101048:web:58b26850e6fe1c7774a18d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

console.log('[FIREBASE] Initialized with project:', firebaseConfig.projectId);
