import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    onSnapshot,
    getDoc,
    setDoc,
    deleteDoc,
    arrayUnion,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Trip, User } from '../types';

// Helper to recursively strip undefined values before writing to Firestore
const sanitizeFirestoreData = (data: Record<string, any>): Record<string, any> => {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
            if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                clean[key] = sanitizeFirestoreData(value);
            } else if (Array.isArray(value)) {
                clean[key] = value.map(item =>
                    (item !== null && typeof item === 'object') ? sanitizeFirestoreData(item) : item
                );
            } else {
                clean[key] = value;
            }
        }
    }
    return clean;
};

export const DbService = {
    // Create a new trip
    createTrip: async (trip: Trip) => {
        try {
            const tripRef = doc(db, 'trips', trip.id);
            const memberIds = trip.members.map(m => m.id);
            const cleanTripData = sanitizeFirestoreData({ ...trip, memberIds });
            await setDoc(tripRef, cleanTripData);
        } catch (error) {
            console.error("Error creating trip", error);
            throw error;
        }
    },

    // Update an existing trip
    updateTrip: async (trip: Trip) => {
        try {
            const tripRef = doc(db, 'trips', trip.id);
            const memberIds = trip.members.map(m => m.id);
            const cleanTripData = sanitizeFirestoreData({ ...trip, memberIds });
            await setDoc(tripRef, cleanTripData, { merge: true });
        } catch (error) {
            console.error("Error updating trip", error);
            throw error;
        }
    },

    // Subscribe to trips where the user is a member
    subscribeToTrips: (userId: string, callback: (trips: Trip[]) => void) => {
        const q = query(
            collection(db, 'trips'),
            where('memberIds', 'array-contains', userId)
        );

        return onSnapshot(q, (snapshot) => {
            const trips: Trip[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                trips.push(data as Trip);
            });
            callback(trips);
        });
    },

    // Get a single trip (for import)
    getTrip: async (tripId: string): Promise<Trip | null> => {
        try {
            const docRef = doc(db, 'trips', tripId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data() as Trip;
            }
            return null;
        } catch (error) {
            console.error("Error getting trip", error);
            return null;
        }
    },

    // Delete a trip
    deleteTrip: async (tripId: string) => {
        try {
            const tripRef = doc(db, 'trips', tripId);
            await deleteDoc(tripRef);
        } catch (error) {
            console.error("Error deleting trip", error);
            throw error;
        }
    },

    // Save user profile to Firestore
    saveUserProfile: async (userId: string, userData: Partial<User>) => {
        try {
            const userRef = doc(db, 'users', userId);
            const cleanData = sanitizeFirestoreData(userData);
            await setDoc(userRef, cleanData, { merge: true });
        } catch (error) {
            console.error("Error saving user profile", error);
            throw error;
        }
    },

    // Get user profile from Firestore
    getUserProfile: async (userId: string): Promise<Partial<User> | null> => {
        try {
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            return userSnap.exists() ? userSnap.data() as Partial<User> : null;
        } catch (error) {
            console.error("Error getting user profile", error);
            return null;
        }
    }
};
