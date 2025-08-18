import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC6kvxlY8DOykRWoQUWyI_z0fdFjh2PDik",
  authDomain: "chat-waiyip.firebaseapp.com",
  projectId: "chat-waiyip",
  storageBucket: "chat-waiyip.firebasestorage.app",
  messagingSenderId: "1001264300241",
  appId: "1:1001264300241:web:d0e5499564b0442e9c05f0",
  measurementId: "G-DDY23PESKW"
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// This prevents re-initializing the app on hot reloads
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

auth = getAuth(app);
db = getFirestore(app);

export { app, auth, db };