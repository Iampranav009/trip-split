import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Trip, JoinRequest, Member } from '../types';

/**
 * Service for managing trip invitations and join requests
 */
export const InviteService = {
    /**
     * Generate a unique invite code for a trip
     */
    generateInviteCode: (tripId: string): string => {
        // Create a simple but unique code: first 6 chars of tripId + random suffix
        const prefix = tripId.substring(0, 6);
        const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `${prefix}-${suffix}`;
    },

    /**
     * Create and assign an invite code to a trip
     */
    createInviteCode: async (tripId: string): Promise<string> => {
        try {
            const inviteCode = InviteService.generateInviteCode(tripId);
            const tripRef = doc(db, 'trips', tripId);
            await updateDoc(tripRef, {
                inviteCode: inviteCode
            });
            return inviteCode;
        } catch (error) {
            console.error('Error creating invite code:', error);
            throw error;
        }
    },

    /**
     * Generate shareable link with invite code
     */
    generateShareLink: (inviteCode: string): string => {
        const baseUrl = window.location.origin;
        return `${baseUrl}?invite=${inviteCode}`;
    },

    /**
     * Submit a join request for a trip
     */
    submitJoinRequest: async (
        tripId: string,
        userId: string,
        userName: string,
        userEmail: string,
        userAvatarUrl?: string
    ): Promise<void> => {
        try {
            const joinRequest: JoinRequest = {
                id: Date.now().toString(),
                userId,
                userName,
                userEmail,
                userAvatarUrl,
                requestedAt: Date.now(),
                status: 'pending'
            };

            const tripRef = doc(db, 'trips', tripId);
            await updateDoc(tripRef, {
                joinRequests: arrayUnion(joinRequest)
            });
        } catch (error) {
            console.error('Error submitting join request:', error);
            throw error;
        }
    },

    /**
     * Approve a join request and add user as member
     */
    approveJoinRequest: async (trip: Trip, requestId: string): Promise<Trip> => {
        try {
            const request = trip.joinRequests?.find(r => r.id === requestId);
            if (!request) throw new Error('Join request not found');

            // Check if user is already a member
            const existingMember = trip.members.find(m => m.id === request.userId);
            if (existingMember) {
                throw new Error('User is already a member of this trip');
            }

            // Create new member
            const newMember: Member = {
                id: request.userId,
                name: request.userName,
                avatarUrl: request.userAvatarUrl,
                totalPaid: 0,
                balance: 0,
                role: 'member',
                joinedAt: Date.now()
            };

            // Update join request status
            const updatedRequests = trip.joinRequests?.map(r =>
                r.id === requestId ? { ...r, status: 'approved' as const } : r
            ) || [];

            // Update trip
            const updatedTrip: Trip = {
                ...trip,
                members: [...trip.members, newMember],
                joinRequests: updatedRequests
            };

            // Save to database
            const tripRef = doc(db, 'trips', trip.id);
            const memberIds = updatedTrip.members.map(m => m.id);
            await updateDoc(tripRef, {
                members: updatedTrip.members,
                joinRequests: updatedRequests,
                memberIds: memberIds
            });

            return updatedTrip;
        } catch (error) {
            console.error('Error approving join request:', error);
            throw error;
        }
    },

    /**
     * Reject a join request
     */
    rejectJoinRequest: async (trip: Trip, requestId: string): Promise<Trip> => {
        try {
            const updatedRequests = trip.joinRequests?.map(r =>
                r.id === requestId ? { ...r, status: 'rejected' as const } : r
            ) || [];

            const tripRef = doc(db, 'trips', trip.id);
            await updateDoc(tripRef, {
                joinRequests: updatedRequests
            });

            return {
                ...trip,
                joinRequests: updatedRequests
            };
        } catch (error) {
            console.error('Error rejecting join request:', error);
            throw error;
        }
    },

    /**
     * Get trip by invite code
     */
    getTripByInviteCode: async (inviteCode: string): Promise<Trip | null> => {
        try {
            // Note: This requires querying by inviteCode
            // For now, we'll need to pass the tripId along with inviteCode
            // or implement a Firestore query
            // For simplicity, we encode tripId in the invite code
            const tripId = inviteCode.split('-')[0];
            const tripRef = doc(db, 'trips', tripId);
            const tripSnap = await getDoc(tripRef);

            if (tripSnap.exists()) {
                const tripData = tripSnap.data() as Trip;
                // Verify invite code matches
                if (tripData.inviteCode === inviteCode) {
                    return tripData;
                }
            }
            return null;
        } catch (error) {
            console.error('Error getting trip by invite code:', error);
            return null;
        }
    },

    /**
     * Check if user has pending request for trip
     */
    hasPendingRequest: (trip: Trip, userId: string): boolean => {
        return trip.joinRequests?.some(
            r => r.userId === userId && r.status === 'pending'
        ) || false;
    },

    /**
     * Check if user is trip admin
     */
    isAdmin: (trip: Trip, userId: string): boolean => {
        const member = trip.members.find(m => m.id === userId);
        return member?.role === 'admin' || trip.createdBy === userId;
    },

    /**
     * Get pending join requests count
     */
    getPendingRequestsCount: (trip: Trip): number => {
        return trip.joinRequests?.filter(r => r.status === 'pending').length || 0;
    }
};
