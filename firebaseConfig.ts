import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAoVAOMzsI9RMHmXNg55afvpwCey7Sk8RE",
  authDomain: "parnav-a3e78.firebaseapp.com",
  projectId: "parnav-a3e78",
  storageBucket: "parnav-a3e78.firebasestorage.app",
  messagingSenderId: "352103450526",
  appId: "1:352103450526:web:75fa9079ff0e0e6e2af88f",
  measurementId: "G-FGNP9QRPCZ"
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