
import Cookies from 'js-cookie';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User as FirebaseUser,
    updateProfile
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { User } from '../types';

export const AuthService = {
    // Sign in with Google
    signInWithGoogle: async (): Promise<User> => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            return {
                id: user.uid,
                name: user.displayName || 'User',
                email: user.email || '',
                avatarUrl: user.photoURL || undefined,
                phone: user.phoneNumber || undefined
            };
        } catch (error) {
            console.error("Error signing in with Google", error);
            throw error;
        }
    },

    // Sign Up with Email/Password
    signUpWithEmail: async (email: string, password: string, name: string): Promise<User> => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            const user = result.user;
            // Update display name
            await updateProfile(user, { displayName: name });

            return {
                id: user.uid,
                name: name,
                email: user.email || '',
                avatarUrl: undefined,
                phone: undefined
            };
        } catch (error) {
            console.error("Error signing up with email", error);
            throw error;
        }
    },

    // Sign In with Email/Password
    signInWithEmail: async (email: string, password: string): Promise<User> => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            const user = result.user;
            return {
                id: user.uid,
                name: user.displayName || 'User',
                email: user.email || '',
                avatarUrl: user.photoURL || undefined,
                phone: user.phoneNumber || undefined
            };
        } catch (error) {
            console.error("Error signing in with email", error);
            throw error;
        }
    },

    // Logout
    logout: async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out", error);
            throw error;
        }
    },

    // Auth State Listener
    subscribeToAuth: (callback: (user: User | null) => void) => {
        return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser) {
                const user: User = {
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName || 'User',
                    email: firebaseUser.email || '',
                    avatarUrl: firebaseUser.photoURL || undefined,
                    phone: firebaseUser.phoneNumber || undefined
                };
                // Set cookie to remember user
                Cookies.set('trip_split_uid', firebaseUser.uid, { expires: 7, secure: window.location.protocol === 'https:', sameSite: 'Strict' });
                callback(user);
            } else {
                // Remove cookie on logout
                Cookies.remove('trip_split_uid');
                callback(null);
            }
        });
    }
};
