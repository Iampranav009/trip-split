
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

export const DbService = {
    // Create a new trip
    createTrip: async (trip: Trip) => {
        try {
            // We use setDoc with the ID generated on the client or let Firestore generate one?
            // The current app generates an ID (timestamp string). 
            // Better to let Firestore generate one for better uniqueness or use the timestamp one if we want to keep logic.
            // Let's use the provided ID for now to minimize refactor friction, or use setDoc if we want to control ID.

            // Using setDoc to keep the ID consistent with client-side generation if strict.
            // However, Firestore auto-ID is better. Let's stick to the generated ID from the app logic for now (Date.now())
            // but beware of collisions.

            // Actually, in the App.tsx, `handleCreateTrip` generates an ID.
            // Let's use `setDoc` to respect that ID.

            const tripRef = doc(db, 'trips', trip.id);
            const memberIds = trip.members.map(m => m.id);
            await setDoc(tripRef, { ...trip, memberIds });
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
            await setDoc(tripRef, { ...trip, memberIds }, { merge: true });
        } catch (error) {
            console.error("Error updating trip", error);
            throw error;
        }
    },

    // Join a trip (check if exists, then add to user's list implies user-trip mapping)
    // For now, the app stores *trips* in local storage. 
    // We should probably query trips where 'members' contains the user.

    // Subscribe to trips where the user is a member
    subscribeToTrips: (userId: string, callback: (trips: Trip[]) => void) => {
        // Query trips where members array contains an object with id == userId.
        // Firestore array-contains-any works on simple values. 
        // Our members are objects. We can't easily query "members contains object with id X".
        // Alternative: Store a separate array of `memberIds` on the trip document for querying.

        // **IMPORTANT**: We need to modify the Trip structure or how we save it to include `memberIds` for efficient querying.
        // Or we can just filter client side if dataset is small, but that's bad practice.
        // Let's assume we will add a `memberIds` field to the Trip object in Firestore for querying.

        // Wait, I can't easily change the Trip type everywhere without breaking things.
        // But for Firestore, I can save `memberIds` as a derived field.

        // Let's query: collection('trips'), where('memberIds', 'array-contains', userId)
        // I need to make sure `createTrip` and `updateTrip` save this `memberIds`.

        const q = query(
            collection(db, 'trips'),
            where('memberIds', 'array-contains', userId)
        );

        return onSnapshot(q, (snapshot) => {
            const trips: Trip[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                // We need to ensure we don't pass internal fields if not needed, but `...data` is fine.
                // We might need to sanitize/map if dates are Timestamps.
                // The current app uses number (Date.now()) or ISO string.
                // Firestore saves as numbers/strings fine.
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
    }
};
