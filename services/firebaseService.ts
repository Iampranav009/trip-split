import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut, 
  User as FirebaseUser,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  arrayUnion, 
  setDoc,
  getDoc
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { Trip, User } from '../types';

export const FirebaseService = {
  // --- Auth ---
  signInWithGoogle: async (): Promise<User> => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const appUser: User = {
        id: user.uid,
        name: user.displayName || 'User',
        email: user.email || '',
        avatarUrl: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`,
        phone: user.phoneNumber || undefined
      };

      // Save user to Firestore 'users' collection for reference
      await setDoc(doc(db, 'users', user.uid), appUser, { merge: true });
      
      return appUser;
    } catch (error) {
      console.error("Error signing in", error);
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    await firebaseSignOut(auth);
  },

  observeAuth: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        callback({
          id: user.uid,
          name: user.displayName || 'User',
          email: user.email || '',
          avatarUrl: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`,
          phone: user.phoneNumber || undefined
        });
      } else {
        callback(null);
      }
    });
  },

  // --- Database ---
  
  // Real-time listener for trips where the user is a member
  subscribeToTrips: (userId: string, callback: (trips: Trip[]) => void) => {
    // We query trips where 'memberIds' array contains the userId
    // Note: We need to ensure when creating a trip, we maintain a 'memberIds' field on the root document for efficient querying
    const q = query(
      collection(db, 'trips'), 
      where('memberIds', 'array-contains', userId)
    );

    return onSnapshot(q, (snapshot) => {
      const trips: Trip[] = [];
      snapshot.forEach((doc) => {
        trips.push({ id: doc.id, ...doc.data() } as Trip);
      });
      // Sort by creation date desc
      trips.sort((a, b) => b.createdAt - a.createdAt);
      callback(trips);
    });
  },

  addTrip: async (trip: Trip) => {
    // Extract member IDs for the search index
    const memberIds = trip.members.map(m => m.id);
    
    // Remove the ID from the object before sending to Firestore (let Firestore generate ID, or use provided)
    // Actually, we generated an ID in App.tsx. Let's use that ID as the doc ID.
    const { id, ...tripData } = trip;
    const dataToSave = {
      ...tripData,
      memberIds // Add helper field for querying
    };
    
    await setDoc(doc(db, 'trips', id), dataToSave);
  },

  updateTrip: async (trip: Trip) => {
    const memberIds = trip.members.map(m => m.id);
    const { id, ...tripData } = trip;
    const dataToSave = {
      ...tripData,
      memberIds
    };
    await updateDoc(doc(db, 'trips', id), dataToSave);
  }
};