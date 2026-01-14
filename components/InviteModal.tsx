import React, { useState, useEffect } from 'react';
import { Trip } from '../types';
import { InviteService } from '../services/inviteService';
import { Copy, Check, X, Share2, Mail } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface InviteModalProps {
    trip: Trip;
    onClose: () => void;
    onUpdate: (trip: Trip) => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ trip, onClose, onUpdate }) => {
    const [inviteCode, setInviteCode] = useState<string>(trip.inviteCode || '');
    const [shareLink, setShareLink] = useState<string>('');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const initInviteCode = async () => {
            if (!trip.inviteCode) {
                setLoading(true);
                try {
                    const code = await InviteService.createInviteCode(trip.id);
                    setInviteCode(code);
                    setShareLink(InviteService.generateShareLink(code));
                } catch (error) {
                    console.error('Error creating invite code:', error);
                } finally {
                    setLoading(false);
                }
            } else {
                setInviteCode(trip.inviteCode);
                setShareLink(InviteService.generateShareLink(trip.inviteCode));
            }
        };

        initInviteCode();
    }, [trip]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    const handleShareWhatsApp = () => {
        const message = `Join my trip "${trip.name}" on Trip Splitter!\n\n${shareLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleShareEmail = () => {
        const subject = `Join Trip: ${trip.name}`;
        const body = `You're invited to join my trip "${trip.name}" on Trip Splitter!\n\nClick the link below to join:\n${shareLink}`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-slide-up">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Invite Friends</h2>
                        <p className="text-sm text-gray-500 mt-1">Share this trip with others</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        <>
                            {/* QR Code */}
                            <div className="flex justify-center">
                                <div className="bg-white p-4 rounded-2xl border-2 border-gray-200 shadow-sm">
                                    <QRCodeSVG value={shareLink} size={180} level="M" />
                                </div>
                            </div>

                            {/* Invite Code */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Invite Code
                                </label>
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 font-mono text-center text-lg font-bold text-indigo-600">
                                    {inviteCode}
                                </div>
                            </div>

                            {/* Share Link */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Share Link
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={shareLink}
                                        readOnly
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none"
                                    />
                                    <button
                                        onClick={handleCopy}
                                        className={`px-4 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${copied
                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                                            }`}
                                    >
                                        {copied ? (
                                            <>
                                                <Check size={18} />
                                                Copied
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={18} />
                                                Copy
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Share Options */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleShareWhatsApp}
                                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 p-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Share2 size={18} />
                                    WhatsApp
                                </button>
                                <button
                                    onClick={handleShareEmail}
                                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 p-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Mail size={18} />
                                    Email
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
