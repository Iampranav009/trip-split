import React, { useState } from 'react';
import { Trip, JoinRequest } from '../types';
import { InviteService } from '../services/inviteService';
import { X, UserPlus, Clock, Check, XCircle } from 'lucide-react';

interface JoinRequestsModalProps {
    trip: Trip;
    onClose: () => void;
    onUpdate: (trip: Trip) => void;
}

export const JoinRequestsModal: React.FC<JoinRequestsModalProps> = ({ trip, onClose, onUpdate }) => {
    const [processing, setProcessing] = useState<string | null>(null);

    const pendingRequests = trip.joinRequests?.filter(r => r.status === 'pending') || [];

    const handleApprove = async (requestId: string) => {
        setProcessing(requestId);
        try {
            const updatedTrip = await InviteService.approveJoinRequest(trip, requestId);
            onUpdate(updatedTrip);
        } catch (error: any) {
            alert(error.message || 'Failed to approve request');
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (requestId: string) => {
        setProcessing(requestId);
        try {
            const updatedTrip = await InviteService.rejectJoinRequest(trip, requestId);
            onUpdate(updatedTrip);
        } catch (error: any) {
            alert(error.message || 'Failed to reject request');
        } finally {
            setProcessing(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-slide-up max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Join Requests</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {pendingRequests.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <UserPlus size={32} className="text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-medium">No pending requests</p>
                            <p className="text-sm text-gray-400 mt-1">
                                Share your trip invite link to get join requests
                            </p>
                        </div>
                    ) : (
                        pendingRequests.map((request, index) => (
                            <div
                                key={request.id}
                                className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm animate-slide-up"
                                style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'backwards' }}
                            >
                                <div className="flex items-start gap-3 mb-4">
                                    {request.userAvatarUrl ? (
                                        <img
                                            src={request.userAvatarUrl}
                                            alt={request.userName}
                                            className="w-12 h-12 rounded-full border-2 border-gray-100"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border-2 border-gray-100">
                                            {request.userName.substring(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900">{request.userName}</h3>
                                        <p className="text-sm text-gray-500">{request.userEmail}</p>
                                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                            <Clock size={12} />
                                            {new Date(request.requestedAt).toLocaleDateString('en-IN', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleApprove(request.id)}
                                        disabled={processing === request.id}
                                        className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                    >
                                        <Check size={18} />
                                        {processing === request.id ? 'Approving...' : 'Approve'}
                                    </button>
                                    <button
                                        onClick={() => handleReject(request.id)}
                                        disabled={processing === request.id}
                                        className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                    >
                                        <XCircle size={18} />
                                        {processing === request.id ? 'Rejecting...' : 'Reject'}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
