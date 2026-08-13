import React, { useState, useEffect } from 'react';
import { Trip } from '../types';
import { InviteService } from '../services/inviteService';
import { Copy, Check, X, Share2, Mail, MessageCircle, Link2, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface InviteModalProps {
    trip: Trip;
    onClose: () => void;
    onUpdate: (trip: Trip) => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ trip, onClose, onUpdate }) => {
    const [inviteCode, setInviteCode] = useState<string>(trip.inviteCode || '');
    const [shareLink, setShareLink] = useState<string>('');
    const [copied, setCopied] = useState<'link' | 'code' | null>(null);
    const [loading, setLoading] = useState(false);
    const [showQR, setShowQR] = useState(false);

    useEffect(() => {
        const init = async () => {
            if (!trip.inviteCode) {
                setLoading(true);
                try {
                    const code = await InviteService.createInviteCode(trip.id);
                    setInviteCode(code);
                    setShareLink(InviteService.generateShareLink(code));
                } catch (err) {
                    console.error('Error creating invite code:', err);
                } finally {
                    setLoading(false);
                }
            } else {
                setInviteCode(trip.inviteCode);
                setShareLink(InviteService.generateShareLink(trip.inviteCode));
            }
        };
        init();
    }, [trip]);

    const shareMessage = shareLink
        ? `Hey! I'm using RupayaSplit to track our group expenses for *"${trip.name}"*.\n\nJoin me so we can split bills and settle up easily.\n\n👉 Join here: ${shareLink}\n\n🔑 Invite Code: *${inviteCode}*`
        : '';

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareLink);
            setCopied('link');
            setTimeout(() => setCopied(null), 2000);
        } catch { }
    };

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(inviteCode);
            setCopied('code');
            setTimeout(() => setCopied(null), 2000);
        } catch { }
    };

    const handleWhatsApp = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Join "${trip.name}" on RupayaSplit`,
                    text: `I'm tracking group expenses for "${trip.name}" on RupayaSplit. Join me!`,
                    url: shareLink,
                });
            } catch { }
        }
    };

    const handleEmail = () => {
        const subject = encodeURIComponent(`Join my trip "${trip.name}" on RupayaSplit`);
        const body = encodeURIComponent(
            `Hi,\n\nI'm using RupayaSplit to track group expenses for "${trip.name}".\n\nJoin here: ${shareLink}\n\nOr use invite code: ${inviteCode}\n\n— Sent via RupayaSplit`
        );
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] animate-fade-in" onClick={onClose}>
            <div
                className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-2xl animate-slide-up overflow-hidden flex flex-col"
                style={{ maxHeight: '92vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Handle (mobile) */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Invite to Trip</h2>
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">{trip.name}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:scale-90 transition-all">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                        </div>
                    ) : (
                        <>
                            {/* Invite Code — primary action */}
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                                <p className="text-[11px] text-indigo-400 font-semibold uppercase tracking-wider mb-2">Invite Code</p>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-2xl font-bold text-indigo-700 font-mono tracking-widest">{inviteCode}</span>
                                    <button
                                        onClick={handleCopyCode}
                                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${copied === 'code' ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                    >
                                        {copied === 'code' ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                                    </button>
                                </div>
                                <p className="text-xs text-indigo-400 mt-2">Your friend enters this code in the "Join Trip" screen</p>
                            </div>

                            {/* Share Link */}
                            <div>
                                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Share Link</p>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-500 font-mono truncate flex items-center">
                                        {shareLink || '—'}
                                    </div>
                                    <button
                                        onClick={handleCopyLink}
                                        className={`shrink-0 px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${copied === 'link' ? 'bg-emerald-500 text-white' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
                                    >
                                        {copied === 'link' ? <Check size={13} /> : <Copy size={13} />}
                                    </button>
                                </div>
                            </div>

                            {/* Share via */}
                            <div>
                                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Share Via</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={handleWhatsApp}
                                        className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-emerald-50 border border-emerald-100 active:scale-95 transition-all"
                                    >
                                        <MessageCircle size={20} className="text-emerald-600" />
                                        <span className="text-[11px] font-semibold text-emerald-700">WhatsApp</span>
                                    </button>
                                    {typeof navigator !== 'undefined' && 'share' in navigator ? (
                                        <button
                                            onClick={handleNativeShare}
                                            className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-indigo-50 border border-indigo-100 active:scale-95 transition-all"
                                        >
                                            <Share2 size={20} className="text-indigo-600" />
                                            <span className="text-[11px] font-semibold text-indigo-700">More</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleEmail}
                                            className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-blue-50 border border-blue-100 active:scale-95 transition-all"
                                        >
                                            <Mail size={20} className="text-blue-600" />
                                            <span className="text-[11px] font-semibold text-blue-700">Email</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowQR(v => !v)}
                                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border active:scale-95 transition-all ${showQR ? 'bg-gray-900 border-gray-900' : 'bg-gray-50 border-gray-100'}`}
                                    >
                                        <QrCode size={20} className={showQR ? 'text-white' : 'text-gray-600'} />
                                        <span className={`text-[11px] font-semibold ${showQR ? 'text-white' : 'text-gray-600'}`}>QR Code</span>
                                    </button>
                                </div>
                            </div>

                            {/* QR Code — toggled */}
                            {showQR && shareLink && (
                                <div className="flex flex-col items-center py-4 bg-gray-50 rounded-2xl border border-gray-100 animate-slide-up">
                                    <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
                                        <QRCodeSVG value={shareLink} size={160} level="M" />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-3 font-medium">Scan to join {trip.name}</p>
                                </div>
                            )}

                            {/* Message preview */}
                            <div>
                                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Message Preview</p>
                                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                                    <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{shareMessage || '—'}</p>
                                </div>
                            </div>

                            {/* Footer */}
                            <p className="text-center text-[11px] text-gray-400 pb-2">
                                Built by <span className="font-semibold text-gray-600">Pranav Shinde</span> · RupayaSplit
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
