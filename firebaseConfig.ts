import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your web app's Firebase configuration
// Using environment variables for production deployment
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBeEKms--stcyW5VmR4pQNJ4rEeyONU0Cc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "travle-planer.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "travle-planer",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "travle-planer.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "272409549250",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:272409549250:web:0acf5524884a6d5c84de5b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics conditionally
let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch((err) => {
  console.log("Analytics not supported in this environment", err);
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export { app, analytics };