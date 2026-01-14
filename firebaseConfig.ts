import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBeEKms--stcyW5VmR4pQNJ4rEeyONU0Cc",
  authDomain: "travle-planer.firebaseapp.com",
  projectId: "travle-planer",
  storageBucket: "travle-planer.firebasestorage.app",
  messagingSenderId: "272409549250",
  appId: "1:272409549250:web:0acf5524884a6d5c84de5b"
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