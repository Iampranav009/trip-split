import React, { useState, useEffect, useRef } from 'react';
import { User, Trip, ViewState, Member, SplitType } from './types';
import { StorageService } from './services/storageService'; // Keeping for reference or fallback if needed, but unused
import { AuthService } from './services/authService';
import { DbService } from './services/dbService';
import { SplitService } from './services/splitService';
import { InviteService } from './services/inviteService';
import { CalculatorInput } from './components/CalculatorInput';
import { InviteModal } from './components/InviteModal';
import { JoinRequestsModal } from './components/JoinRequestsModal';
import { AvatarSelector } from './components/AvatarSelector';
import { ConfirmModal } from './components/ConfirmModal';
import { QRScanner } from './components/QRScanner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    LogOut, Plus, Users, ChevronRight, IndianRupee,
    Calendar, Home, Briefcase, Calculator, ArrowLeft, Check, CreditCard, Trash2, Search, User as UserIcon, Settings, Edit3, CheckCircle2, Percent, Hash, Divide, X,
    Share2, Download, Copy, Save, FileText, CheckSquare, Square, UserPlus, Bell, Link2, FileDown, Camera,
    Mail, Lock, Eye, EyeOff, Sparkles, ShieldCheck, ArrowRight
} from 'lucide-react';

// Avatars
const AVATAR_BOY = "/images/avatar_boy.png";
const AVATAR_GIRL = "/images/avatar_girl.png";

// --- Main App ---
export default function App() {
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [view, setView] = useState<ViewState | 'PROFILE' | 'LOGIN' | 'SETTINGS' | 'IMPORT_TRIP' | 'JOIN_REQUESTS' | 'ONBOARDING'>('LOGIN');
    const [trips, setTrips] = useState<Trip[]>([]);
    const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
    const [editingExpense, setEditingExpense] = useState<import('./types').Expense | null>(null);

    // Pending invite code from URL (?invite=CODE)
    const [pendingInviteCode, setPendingInviteCode] = useState<string>(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('invite') || '';
        if (code) window.history.replaceState({}, '', window.location.pathname);
        return code;
    });
    const pendingInviteCodeRef = useRef(pendingInviteCode);

    // Modal states
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showJoinRequestsModal, setShowJoinRequestsModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [tripToDelete, setTripToDelete] = useState<{ id: string; name: string } | null>(null);

    // Initialize Auth (Firebase)
    useEffect(() => {
        const unsubscribe = AuthService.subscribeToAuth(async (currentUser) => {
            if (currentUser) {
                // Merge with Firestore profile data
                const firestoreProfile = await DbService.getUserProfile(currentUser.id);
                const mergedUser = {
                    ...currentUser,
                    ...firestoreProfile
                };
                setUser(mergedUser);
                setAuthLoading(false);
                if (pendingInviteCodeRef.current) {
                    setView('IMPORT_TRIP');
                } else {
                    setView(v => (v === 'LOGIN' ? 'HOME' : v));
                }
            } else {
                setUser(null);
                setAuthLoading(false);
                setView('LOGIN');
                setTrips([]);
                setActiveTrip(null);
            }
        });
        return () => unsubscribe();
    }, []);

    // Subscribe to Trips
    useEffect(() => {
        if (!user) {
            setTrips([]);
            return;
        }
        const unsubscribe = DbService.subscribeToTrips(user.id, (updatedTrips) => {
            setTrips(updatedTrips);
        });
        return () => unsubscribe();
    }, [user]);

    // Sync Active Trip with Real-time Data
    useEffect(() => {
        if (activeTrip && trips.length > 0) {
            const updated = trips.find(t => t.id === activeTrip.id);
            // Only update if content changed to avoid loop
            if (updated && JSON.stringify(updated) !== JSON.stringify(activeTrip)) {
                setActiveTrip(updated);
            }
        }
    }, [trips]); // activeTrip is dependency? No, validation.

    const handleGoogleLogin = async () => {
        try {
            await AuthService.signInWithGoogle();
            // Auth listener handles the rest
        } catch (error) {
            alert("Google Sign In failed");
        }
    };

    const handleEmailLogin = async (name: string, email: string) => {
        // Minimal impl for now, just name as it was before is not enough for real auth.
        // The UI passed 'name' and 'avatar'.
        // We'll stick to Google for robust auth, or use Anonymous?
        // The prompt asked for "Auth email and Goolge Outh".
        // The previous LoginView only asked for "Name".
        // We'll need to upgrade LoginView to ask for Email/Password?
        // For now let's implement the 'handleLogin' as a wrapper if we keep the old simple UI, but that won't work with Firebase Email Auth.
        // I'll update LoginView to be better.
    };

    // handleLogin is replaced by handleGoogleLogin / handleEmailLogin


    const handleUpdateProfile = (name: string, phone: string) => {
        if (!user) return;
        const updatedUser = { ...user, name, phone };
        // StorageService.saveUser(updatedUser); // Removed
        setUser(updatedUser);
        setView('PROFILE');
    };

    const handleLogout = async () => {
        await AuthService.logout();
    };

    const handleCreateTrip = async (name: string) => {
        if (!user) return;

        const tripId = Date.now().toString();
        const inviteCode = InviteService.generateInviteCode(tripId);

        const newTrip: Trip = {
            id: tripId,
            name,
            totalExpense: 0,
            members: [{
                id: user.id,
                name: user.name,
                avatarUrl: user.avatarUrl,
                totalPaid: 0,
                balance: 0,
                role: 'admin',
                joinedAt: Date.now()
            }],
            expenses: [],
            currency: 'INR',
            createdBy: user.id,
            createdAt: Date.now(),
            inviteCode: inviteCode,
            joinRequests: []
        };

        await DbService.createTrip(newTrip);
        // Viewer update handled by subscription

        // Optimistically set active? subscription is fast locally.
        // Let's wait for subscription to update trips, or just set it.
        // If we set it here, it might get overwritten by subscription.
        // We'll trust the subscription or valid local state.

        // To automatically switch view:
        setActiveTrip(newTrip);
        setView('TRIP_DASHBOARD');
    };

    const handleUpdateTrip = async (updatedTrip: Trip) => {
        // Recalculate balances whenever trip updates
        const balancedTrip = SplitService.calculateBalances(updatedTrip);
        await DbService.updateTrip(balancedTrip);
    };

    // Safe Base64 Encoding/Decoding for Unicode
    const safeBtoa = (str: string) => btoa(unescape(encodeURIComponent(str)));
    const safeAtob = (str: string) => decodeURIComponent(escape(atob(str)));

    const handleImportTrip = async (jsonString: string) => {
        try {
            // Attempt to parse as Trip object (legacy/backup)
            // Or if it's just an ID? The PDF export does base64 encoded JSON.
            // We can stick to that.

            const tripData: Trip = JSON.parse(safeAtob(jsonString));
            if (!tripData.id) {
                alert("Invalid Trip Code");
                return;
            }

            // Check if user is already in it
            const currentTrip = await DbService.getTrip(tripData.id);
            if (!currentTrip) {
                // If it doesn't exist in DB, create it? 
                // Creating from import means we are cloning or restoring?
                // If it's a shared code, it should exist in DB.
                // If it doesn't exist in DB (e.g. from another user's local export), we create it.
                await DbService.createTrip(tripData);
            } else {
                // Trip exists. Join it.
                // Add user to members if not there.
                if (user && !currentTrip.members.find(m => m.id === user.id)) {
                    const newMember: Member = {
                        id: user.id,
                        name: user.name,
                        avatarUrl: user.avatarUrl,
                        totalPaid: 0,
                        balance: 0
                    };
                    const updatedTrip = {
                        ...currentTrip,
                        members: [...currentTrip.members, newMember]
                    };
                    await DbService.updateTrip(updatedTrip);
                }
            }

            alert("Trip imported successfully!");
            setView('HOME');
        } catch (e) {
            alert("Failed to import. Please check the code.");
        }
    };

    const handleDeleteExpense = (expenseId: string) => {
        if (!activeTrip) return;
        if (!window.confirm("Are you sure you want to delete this expense?")) return;

        const updatedExpenses = activeTrip.expenses.filter(e => e.id !== expenseId);
        const updatedTrip = {
            ...activeTrip,
            expenses: updatedExpenses
        };
        handleUpdateTrip(updatedTrip);
    };

    const handleDeleteTrip = (tripId: string, tripName: string) => {
        setTripToDelete({ id: tripId, name: tripName });
        setShowDeleteConfirm(true);
    };

    const confirmDeleteTrip = async () => {
        if (!tripToDelete) return;

        try {
            await DbService.deleteTrip(tripToDelete.id);
            // If the deleted trip was active, clear it
            if (activeTrip?.id === tripToDelete.id) {
                setActiveTrip(null);
            }
            // The subscription will automatically update the trips list
        } catch (error) {
            alert("Failed to delete trip. Please try again.");
            console.error(error);
        } finally {
            setTripToDelete(null);
        }
    };

    const generatePDF = (trip: Trip, selectedExpenseIds?: string[]) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        const selectedExpenses = trip.expenses.filter(
            e => e.title !== 'Settlement' && (!selectedExpenseIds || selectedExpenseIds.includes(e.id))
        );
        const selectedTotal = selectedExpenses.reduce((s, e) => s + e.amount, 0);

        // Header
        doc.setFontSize(20);
        doc.setTextColor(31, 41, 55);
        doc.setFont(undefined, 'bold');
        doc.text("TRIP INVOICE", pageWidth / 2, 20, { align: 'center' });

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.text("RupayaSplit", pageWidth / 2, 27, { align: 'center' });

        // Trip Details Box
        doc.setDrawColor(229, 231, 235);
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(14, 33, pageWidth - 28, 28, 2, 2, 'FD');

        doc.setTextColor(31, 41, 55);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`${trip.name}`, 18, 41);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.text(`Created: ${new Date(trip.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, 18, 48);
        doc.text(`Members: ${trip.members.length}`, 18, 54);

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text(`Total: ₹${selectedTotal.toLocaleString('en-IN')}`, pageWidth - 18, 54, { align: 'right' });

        let yPos = 72;

        // Member Summary
        doc.setFont(undefined, 'bold');
        doc.setFontSize(11);
        doc.setTextColor(31, 41, 55);
        doc.text("Member Summary", 14, yPos);
        yPos += 7;

        const memberRows = trip.members.map(m => [
            m.name,
            `₹${m.totalPaid.toLocaleString('en-IN')}`,
            m.balance === 0 ? 'Settled' : m.balance > 0 ? `Gets ₹${Math.abs(m.balance).toLocaleString('en-IN')}` : `Owes ₹${Math.abs(m.balance).toLocaleString('en-IN')}`
        ]);

        // @ts-ignore
        autoTable(doc, {
            startY: yPos,
            head: [['Member', 'Total Paid', 'Balance']],
            body: memberRows,
            headStyles: { fillColor: [55, 65, 81], fontSize: 9, fontStyle: 'bold' },
            bodyStyles: { fontSize: 9 },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            margin: { left: 14, right: 14 }
        });

        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 12;

        // Settlements
        doc.setFont(undefined, 'bold');
        doc.setFontSize(11);
        doc.setTextColor(31, 41, 55);
        doc.text("How to Settle", 14, yPos);
        yPos += 7;

        const debts = SplitService.minimizeDebts(trip);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        if (debts.length === 0) {
            doc.setTextColor(107, 114, 128);
            doc.text("All settled up.", 14, yPos);
            yPos += 8;
        } else {
            debts.forEach((d, idx) => {
                doc.setTextColor(31, 41, 55);
                doc.text(`${idx + 1}.  ${d.from}  →  ${d.to}   ₹${d.amount.toLocaleString('en-IN')}`, 14, yPos);
                yPos += 6;
            });
            yPos += 4;
        }

        // Expense Details
        doc.setFont(undefined, 'bold');
        doc.setFontSize(11);
        doc.setTextColor(31, 41, 55);
        doc.text("Expense Details", 14, yPos);
        yPos += 7;

        const tableRows = selectedExpenses.map(e => [
            new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            e.title,
            trip.members.find(m => m.id === e.paidByMemberId)?.name || 'Unknown',
            `₹${e.amount.toLocaleString('en-IN')}`
        ]);

        // @ts-ignore
        autoTable(doc, {
            startY: yPos,
            head: [['Date', 'Description', 'Paid By', 'Amount']],
            body: tableRows,
            headStyles: { fillColor: [55, 65, 81], fontSize: 9, fontStyle: 'bold' },
            bodyStyles: { fontSize: 9 },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            margin: { left: 14, right: 14 },
            foot: [['', '', 'TOTAL', `₹${selectedTotal.toLocaleString('en-IN')}`]],
            footStyles: { fillColor: [243, 244, 246], textColor: [31, 41, 55], fontStyle: 'bold' }
        });

        // @ts-ignore
        const finalY = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, pageWidth / 2, finalY, { align: 'center' });

        doc.save(`${trip.name.replace(/\s+/g, '_')}_Invoice.pdf`);
    };

    // --- Views ---

    const LoginView = () => {
        const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [name, setName] = useState('');
        const [showPassword, setShowPassword] = useState(false);
        const [loading, setLoading] = useState(false);
        const [errorMessage, setErrorMessage] = useState('');

        const handleEmailAuth = async (e: React.FormEvent) => {
            e.preventDefault();
            setErrorMessage('');
            if (!email || !password) {
                setErrorMessage("Please fill in all required fields.");
                return;
            }
            if (mode === 'SIGNUP' && !name) {
                setErrorMessage("Please enter your full name.");
                return;
            }
            if (password.length < 6) {
                setErrorMessage("Password must be at least 6 characters long.");
                return;
            }

            setLoading(true);
            try {
                if (mode === 'LOGIN') {
                    await AuthService.signInWithEmail(email, password);
                } else {
                    await AuthService.signUpWithEmail(email, password, name);
                }
            } catch (error: any) {
                console.error(error);
                let msg = error.message || "Authentication failed";
                if (msg.includes("user-not-found") || msg.includes("wrong-password") || msg.includes("invalid-credential")) {
                    msg = "Invalid email or password. Please try again.";
                } else if (msg.includes("email-already-in-use")) {
                    msg = "An account with this email already exists. Please sign in.";
                }
                setErrorMessage(msg);
            } finally {
                setLoading(false);
            }
        };

        const handleGoogleClick = async () => {
            setErrorMessage('');
            try {
                await handleGoogleLogin();
            } catch (error: any) {
                setErrorMessage("Google authentication failed. Please try again.");
            }
        };

        return (
            <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 text-slate-800 animate-fade-in relative">
                <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 relative z-10 my-auto">
                    {/* Brand Header */}
                    <div className="flex flex-col items-center text-center mb-6 animate-slide-down">
                        <img src="/logo.svg" alt="Rupaya Split Logo" className="w-20 h-20 rounded-2xl shadow-md border border-slate-200 mb-3 object-contain" />
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                            Rupaya Split
                        </h1>
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mt-1">
                            by Pranav Shinde
                        </p>
                    </div>

                    {/* Mode Switcher Segment */}
                    <div className="w-full max-w-sm bg-slate-200/80 p-1 rounded-xl flex mb-6 animate-slide-up delay-100">
                        <button
                            type="button"
                            onClick={() => { setMode('LOGIN'); setErrorMessage(''); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                                mode === 'LOGIN'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('SIGNUP'); setErrorMessage(''); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                                mode === 'SIGNUP'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Create Account
                        </button>
                    </div>

                    {/* Main Form Box */}
                    <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm space-y-4 animate-slide-up delay-200">
                        
                        {/* Error Message Banner */}
                        {errorMessage && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs px-4 py-3 rounded-xl flex items-center justify-between animate-pop">
                                <span>{errorMessage}</span>
                                <button type="button" onClick={() => setErrorMessage('')} className="text-rose-500 hover:text-rose-700 font-bold ml-2">×</button>
                            </div>
                        )}

                        {/* Google Auth Button */}
                        <button
                            type="button"
                            onClick={handleGoogleClick}
                            className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-sm hover:shadow transition-all active:scale-[0.98]"
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                            <span className="text-sm font-semibold">Continue with Google</span>
                        </button>

                        <div className="flex items-center gap-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                            <div className="h-px bg-slate-200 flex-1"></div>
                            <span>or with email</span>
                            <div className="h-px bg-slate-200 flex-1"></div>
                        </div>

                        {/* Email Auth Form */}
                        <form onSubmit={handleEmailAuth} className="space-y-4">
                            {mode === 'SIGNUP' && (
                                <div className="relative">
                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white text-slate-900 placeholder-slate-400 text-sm transition-all"
                                    />
                                </div>
                            )}

                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white text-slate-900 placeholder-slate-400 text-sm transition-all"
                                />
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white text-slate-900 placeholder-slate-400 text-sm transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !email || !password || (mode === 'SIGNUP' && !name)}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span>{mode === 'LOGIN' ? 'Sign In' : 'Create Account'}</span>
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    };

    const SettingsView = () => {
        const [name, setName] = useState(user?.name || '');
        const [phone, setPhone] = useState(user?.phone || '');
        const initialAvatar = user?.customAvatarUrl || user?.avatarUrl || AVATAR_BOY;
        const [selectedAvatar, setSelectedAvatar] = useState(initialAvatar);
        const [isCustomAvatar, setIsCustomAvatar] = useState(!!user?.customAvatarUrl || initialAvatar.startsWith('data:'));

        const handleAvatarSelect = (avatarUrl: string, isCustom?: boolean) => {
            setSelectedAvatar(avatarUrl);
            setIsCustomAvatar(isCustom || avatarUrl.startsWith('data:'));
        };

        const handleSaveSettings = async () => {
            if (!name.trim() || !user) return;

            try {
                const cleanName = name.trim();
                const cleanPhone = phone.trim();

                const profileUpdates: Partial<User> = {
                    name: cleanName,
                    phone: cleanPhone,
                    avatarUrl: selectedAvatar,
                };

                if (isCustomAvatar) {
                    profileUpdates.customAvatarUrl = selectedAvatar;
                }

                // Update Firebase Auth profile (displayName and photoURL)
                // Note: Only pass photoURL if it's an HTTP/HTTPS URL, not base64 data URIs
                const authPhotoUrl = selectedAvatar.startsWith('http') ? selectedAvatar : undefined;
                await AuthService.updateUserProfile({
                    displayName: cleanName,
                    ...(authPhotoUrl ? { photoURL: authPhotoUrl } : {})
                });

                // Save additional profile data to Firestore
                await DbService.saveUserProfile(user.id, profileUpdates);

                // Update local user state
                const updatedUser: User = {
                    ...user,
                    ...profileUpdates,
                };
                setUser(updatedUser);
                setView('PROFILE');
            } catch (error) {
                console.error("Error saving profile", error);
                alert("Failed to save profile. Please try again.");
            }
        };

        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white animate-slide-in-right">
                <div className="shrink-0 p-4 sm:p-6 border-b border-gray-100 bg-white flex items-center gap-4 z-10">
                    <button onClick={() => setView('PROFILE')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"><ArrowLeft /></button>
                    <h2 className="text-2xl font-bold">Settings</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28 space-y-8">
                    {/* Avatar Selection */}
                    <div className="animate-slide-up delay-100" style={{ animationFillMode: 'backwards' }}>
                        <label className="block text-sm font-bold text-gray-700 mb-4">Profile Picture</label>
                        <AvatarSelector
                            currentAvatar={selectedAvatar}
                            onSelect={handleAvatarSelect}
                            showUpload={true}
                        />
                    </div>

                    {/* Name */}
                    <div className="animate-slide-up delay-200" style={{ animationFillMode: 'backwards' }}>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Display Name</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all focus:bg-white"
                        />
                    </div>

                    {/* Phone */}
                    <div className="animate-slide-up delay-300" style={{ animationFillMode: 'backwards' }}>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                        <input
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all focus:bg-white"
                        />
                    </div>

                    <button
                        onClick={handleSaveSettings}
                        disabled={!name.trim()}
                        className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-95 animate-slide-up delay-400 disabled:opacity-50"
                        style={{ animationFillMode: 'backwards' }}
                    >
                        <Save size={20} /> Save Changes
                    </button>
                </div>
            </div>
        );
    };

    const CARD_ACCENTS = [
        'from-indigo-500 to-purple-500',
        'from-emerald-500 to-teal-500',
        'from-rose-500 to-pink-500',
        'from-amber-500 to-orange-500',
        'from-blue-500 to-cyan-500',
        'from-violet-500 to-fuchsia-500',
    ];

    const UserAvatar = ({ size = 40, className = '' }: { size?: number; className?: string }) => {
        const src = user?.customAvatarUrl || user?.avatarUrl;
        if (src) {
            return <img src={src} alt={user?.name} style={{ width: size, height: size }} className={`rounded-full object-cover ${className}`} />;
        }
        return (
            <div
                style={{ width: size, height: size, fontSize: size * 0.38 }}
                className={`rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold ${className}`}
            >
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
        );
    };

    const HomeView = () => {
        const totalExpense = trips.reduce((sum, t) => sum + t.totalExpense, 0);
        const myNetBalance = trips.reduce((sum, t) => {
            const me = t.members.find(m => m.id === user?.id);
            return sum + (me?.balance || 0);
        }, 0);

        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50 animate-fade-in">
                {/* Header */}
                <header className="shrink-0 bg-white px-4 sm:px-6 pt-5 pb-4 border-b border-gray-100 shadow-sm z-10 animate-slide-down">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <img src="/logo-circle.svg" alt="Rupaya Split Logo" className="w-10 h-10 rounded-full object-contain shadow-sm border border-slate-100" />
                            <div>
                                <h1 className="text-lg font-extrabold text-gray-900 tracking-tight leading-snug">Rupaya Split</h1>
                                <p className="text-xs text-gray-400">Hey, <span className="font-semibold text-gray-600">{user?.name?.split(' ')[0]}</span> 👋</p>
                            </div>
                        </div>
                        <button onClick={() => setView('PROFILE')} className="active:scale-90 transition-transform">
                            <UserAvatar size={42} className="border-2 border-indigo-100 shadow-sm" />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto pb-28">
                    {/* Trip List */}
                    <div className="p-4 sm:p-6 grid gap-3">
                        {trips.length === 0 ? (
                            <div className="text-center py-16 animate-slide-up">
                                <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-5 rotate-6">
                                    <Briefcase size={36} className="text-indigo-400 -rotate-6" />
                                </div>
                                <p className="text-lg font-bold text-gray-700 mb-1">No trips yet</p>
                                <p className="text-sm text-gray-400 mb-6">Create a trip or join from a friend's link</p>
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={() => setView('CREATE_TRIP')}
                                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition-all shadow-md shadow-indigo-200 flex items-center gap-1.5"
                                    >
                                        <Plus size={16} /> New Trip
                                    </button>
                                    <button
                                        onClick={() => setView('IMPORT_TRIP')}
                                        className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition-all flex items-center gap-1.5"
                                    >
                                        <UserPlus size={16} /> Join Trip
                                    </button>
                                </div>
                            </div>
                        ) : (
                            trips.map((trip, index) => {
                                const myMember = trip.members.find(m => m.id === user?.id);
                                const myBalance = myMember?.balance || 0;
                                const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];

                                return (
                                    <div
                                        key={trip.id}
                                        className="bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden animate-slide-up"
                                        style={{ animationDelay: `${index * 0.07}s`, animationFillMode: 'backwards' }}
                                        onClick={() => { setActiveTrip(trip); setView('TRIP_DASHBOARD'); }}
                                    >
                                        {/* Left accent bar */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${accent} rounded-l-2xl`} />

                                        <div className="pl-4 pr-3 py-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <h3 className="text-base font-bold text-gray-900 truncate">{trip.name}</h3>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {new Date(trip.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteTrip(trip.id, trip.name); }}
                                                    className="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-rose-500 hover:bg-rose-50 active:scale-90 transition-all shrink-0"
                                                    title="Delete trip"
                                                >
                                                    <Trash2 size={14} strokeWidth={2} />
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between mt-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                                                        <Users size={11} /> {trip.members.length}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-xs font-semibold text-gray-700 bg-gray-50 px-2 py-1 rounded-lg">
                                                        <IndianRupee size={11} /> {trip.totalExpense.toLocaleString('en-IN')}
                                                    </span>
                                                </div>
                                                {myBalance !== 0 ? (
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${myBalance > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                        {myBalance > 0 ? `you get ₹${myBalance.toFixed(0)}` : `you owe ₹${Math.abs(myBalance).toFixed(0)}`}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400 px-2.5 py-1 rounded-full bg-gray-50">Settled ✓</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const ImportTripView = () => {
        const [code, setCode] = useState(pendingInviteCode);
        const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input');
        const [loading, setLoading] = useState(false);
        const [foundTrip, setFoundTrip] = useState<Trip | null>(null);
        const [alreadyMember, setAlreadyMember] = useState(false);
        const [error, setError] = useState('');
        const [showQRScanner, setShowQRScanner] = useState(false);

        // Auto-lookup when arriving from a share link
        useEffect(() => {
            if (pendingInviteCode) {
                handleLookup(pendingInviteCode);
            }
        }, []);

        const handleQRScan = (data: string) => {
            setShowQRScanner(false);
            let inviteCode = data.trim();
            try {
                const url = new URL(data);
                const extracted = url.searchParams.get('invite');
                if (extracted) inviteCode = extracted;
            } catch {
                // Not a URL — use raw data as invite code
            }
            const cleaned = inviteCode.toUpperCase();
            setCode(cleaned);
            setError('');
            handleLookup(cleaned);
        };

        const handleLookup = async (lookupCode = code) => {
            const trimmed = lookupCode.trim();
            if (!trimmed) return;
            setLoading(true);
            setError('');
            try {
                const trip = await InviteService.getTripByInviteCode(trimmed);
                if (!trip) {
                    setError('Invalid invite code. Please check and try again.');
                    setLoading(false);
                    return;
                }
                const isMember = !!(user && trip.members.find(m => m.id === user.id));
                setAlreadyMember(isMember);
                setFoundTrip(trip);
                setStep('confirm');
            } catch {
                setError('Something went wrong. Please try again.');
            }
            setLoading(false);
        };

        const handleSendRequest = async () => {
            if (!user || !foundTrip) return;
            if (alreadyMember) {
                setActiveTrip(foundTrip);
                setView('TRIP_DASHBOARD');
                setPendingInviteCode('');
                pendingInviteCodeRef.current = '';
                return;
            }
            setLoading(true);
            try {
                if (InviteService.hasPendingRequest(foundTrip, user.id)) {
                    setStep('success');
                    setPendingInviteCode('');
                    pendingInviteCodeRef.current = '';
                    setLoading(false);
                    return;
                }
                await InviteService.submitJoinRequest(
                    foundTrip.id,
                    user.id,
                    user.name,
                    user.email,
                    user.customAvatarUrl || user.avatarUrl
                );
                setStep('success');
                setPendingInviteCode('');
                pendingInviteCodeRef.current = '';
            } catch (e: any) {
                setError(e.message || 'Failed to send request. Please try again.');
            }
            setLoading(false);
        };

        if (step === 'success' && foundTrip) {
            return (
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-white animate-slide-in-right">
                    <div className="shrink-0 p-4 sm:p-6 border-b border-gray-100 bg-white flex items-center gap-4 z-10">
                        <button onClick={() => setView('HOME')} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center transition-colors"><ArrowLeft size={24} /></button>
                        <h2 className="text-2xl font-bold text-gray-900">Request Sent!</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 pb-28 flex flex-col items-center justify-center text-center">
                        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 animate-pop">
                            <CheckCircle2 size={44} className="text-emerald-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">You're almost in!</h3>
                        <p className="text-gray-500 mb-1">Your request to join</p>
                        <p className="text-xl font-bold text-indigo-600 mb-2">"{foundTrip.name}"</p>
                        <p className="text-gray-500 mb-10">has been sent. Once the trip admin approves you, the trip will appear on your home screen.</p>
                        <button
                            onClick={() => setView('HOME')}
                            className="w-full max-w-xs py-4 bg-indigo-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            <Home size={20} /> Go to Home
                        </button>
                    </div>
                </div>
            );
        }

        if (step === 'confirm' && foundTrip) {
            return (
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-white animate-slide-in-right">
                    <div className="shrink-0 p-4 sm:p-6 border-b border-gray-100 bg-white flex items-center gap-4 z-10">
                        <button onClick={() => { setStep('input'); setFoundTrip(null); setError(''); setAlreadyMember(false); }} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center transition-colors"><ArrowLeft size={24} /></button>
                        <h2 className="text-2xl font-bold text-gray-900">Join Trip</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28">
                        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-6 text-center animate-slide-up" style={{ animationFillMode: 'backwards' }}>
                            <div className="text-5xl mb-3">✈️</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">{foundTrip.name}</h3>
                            <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mt-2">
                                <span className="flex items-center gap-1">
                                    <Users size={14} /> {foundTrip.members.length} member{foundTrip.members.length !== 1 ? 's' : ''}
                                </span>
                                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                    <IndianRupee size={14} /> {foundTrip.totalExpense.toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>

                        {alreadyMember ? (
                            <p className="text-center text-emerald-600 font-semibold mb-6">
                                ✓ You're already a member of this trip!
                            </p>
                        ) : (
                            <p className="text-gray-500 text-center mb-6">
                                Send a join request to the trip admin. Once approved, you'll see this trip on your home screen.
                            </p>
                        )}

                        {error && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 mb-4 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleSendRequest}
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 disabled:bg-gray-300 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : alreadyMember ? (
                                <><Briefcase size={20} /> Open Trip</>
                            ) : (
                                <><UserPlus size={20} /> Send Join Request</>
                            )}
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white animate-slide-in-right">
                <div className="shrink-0 p-4 sm:p-6 border-b border-gray-100 bg-white flex items-center gap-4 z-10">
                    <button onClick={() => setView('HOME')} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center transition-colors"><ArrowLeft size={24} /></button>
                    <h2 className="text-2xl font-bold text-gray-900">Join a Trip</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28">

                    {/* QR Scanner */}
                    {showQRScanner ? (
                        <div className="animate-slide-up">
                            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <Camera size={16} className="text-indigo-500" /> Scanning...
                            </p>
                            <QRScanner
                                onScan={handleQRScan}
                                onClose={() => setShowQRScanner(false)}
                            />
                            <button
                                onClick={() => setShowQRScanner(false)}
                                className="w-full mt-4 py-3 text-gray-500 text-sm font-semibold border border-gray-200 rounded-xl active:scale-95 transition-all"
                            >
                                Cancel — Enter code manually
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Scan QR CTA */}
                            <button
                                onClick={() => setShowQRScanner(true)}
                                className="w-full mb-6 py-4 bg-indigo-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-indigo-200 animate-slide-up"
                                style={{ animationFillMode: 'backwards' }}
                            >
                                <Camera size={22} /> Scan QR Code
                            </button>

                            {/* Divider */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">or enter code</span>
                                <div className="flex-1 h-px bg-gray-200" />
                            </div>

                            <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Invite Code</label>
                                    <input
                                        value={code}
                                        onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
                                        placeholder="e.g. 169123-AB3CD4"
                                        autoFocus
                                        className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-mono tracking-wider transition-all text-center uppercase"
                                    />
                                </div>
                                {error && (
                                    <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-sm text-center">
                                        {error}
                                    </div>
                                )}
                                <button
                                    disabled={!code.trim() || loading}
                                    onClick={() => handleLookup()}
                                    className="w-full py-4 bg-gray-900 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95"
                                >
                                    {loading ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    ) : (
                                        <><Search size={20} /> Find Trip</>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const CreateTripView = () => {
        const [name, setName] = useState('');

        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white animate-slide-up">
                <div className="shrink-0 p-4 sm:p-6 border-b border-gray-100 bg-white flex items-center gap-4 z-10">
                    <button onClick={() => setView('HOME')} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center transition-colors"><ArrowLeft size={24} /></button>
                    <h2 className="text-2xl font-bold text-gray-900">New Trip</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28">
                    <p className="text-gray-500 mb-8 animate-slide-up delay-200" style={{ animationFillMode: 'backwards' }}>Give your adventure a name.</p>

                <div className="space-y-6 animate-slide-up delay-300" style={{ animationFillMode: 'backwards' }}>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Trip Name</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Goa 2024"
                            autoFocus
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 text-lg transition-all focus:scale-[1.01]"
                        />
                    </div>

                    <button
                        disabled={!name.trim()}
                        onClick={() => handleCreateTrip(name.trim())}
                        className="w-full py-4 bg-indigo-600 disabled:bg-gray-300 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Plus size={20} /> Create Trip
                    </button>
                </div>
            </div>
        </div>
    );
    };

    const ProfileView = () => {
        if (!user) return null;

        const displayAvatar = user.customAvatarUrl || user.avatarUrl || AVATAR_BOY;

        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white animate-fade-in">
                <div className="shrink-0 p-4 sm:p-6 border-b border-gray-100 bg-white z-10">
                    <h2 className="text-3xl font-bold text-gray-900 animate-slide-up">Profile</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28">

                <div className="flex flex-col items-center mb-8 animate-slide-up delay-100" style={{ animationFillMode: 'backwards' }}>
                    <img src={displayAvatar} alt={user.name} className="w-24 h-24 rounded-full border-4 border-indigo-50 mb-4 shadow-sm" />
                    <h3 className="text-xl font-bold text-gray-800">{user.name}</h3>
                    <p className="text-gray-500">{user.email}</p>
                    <p className="text-sm text-gray-400">{user.phone || 'No phone added'}</p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => setView('SETTINGS')}
                        className="w-full bg-gray-50 p-4 rounded-xl flex items-center gap-4 hover:bg-gray-100 transition-colors active:scale-98 animate-slide-up delay-200"
                        style={{ animationFillMode: 'backwards' }}
                    >
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-600 shadow-sm border border-gray-100">
                            <Settings size={20} />
                        </div>
                        <span className="font-medium text-gray-700 flex-1 text-left">Settings</span>
                        <ChevronRight size={20} className="text-gray-400" />
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full bg-rose-50 p-4 rounded-xl flex items-center gap-4 hover:bg-rose-100 transition-colors text-rose-600 active:scale-98 animate-slide-up delay-300"
                        style={{ animationFillMode: 'backwards' }}
                    >
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-rose-100">
                            <LogOut size={20} />
                        </div>
                        <span className="font-medium flex-1 text-left">Logout</span>
                    </button>
                </div>

                <div className="mt-12 text-center animate-fade-in delay-500 space-y-1.5 pb-6">
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-800">
                        <img src="/favicon.png" alt="Logo" className="w-5 h-5 rounded-md shadow-sm border border-slate-200" />
                        <span>Rupaya Split by Pranav Shinde</span>
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium">
                        Designed & Developed by Pranav Shinde • Rupaya Split & Migrator Projects
                    </p>
                </div>
            </div>
        </div>
    );
    };

    const TripDashboard = () => {
        if (!activeTrip) return null;
        const [searchQuery, setSearchQuery] = useState('');
        const [showTripSettings, setShowTripSettings] = useState(false);
        const [settingsName, setSettingsName] = useState(activeTrip.name);
        const [settingsDesc, setSettingsDesc] = useState(activeTrip.description || '');
        const [showDescInput, setShowDescInput] = useState(!!(activeTrip.description));
        const [savingSettings, setSavingSettings] = useState(false);
        const [showInvoiceModal, setShowInvoiceModal] = useState(false);
        const [invoiceSelectedIds, setInvoiceSelectedIds] = useState<string[]>([]);

        const isAdmin = InviteService.isAdmin(activeTrip, user?.id || '');
        const pendingRequestsCount = InviteService.getPendingRequestsCount(activeTrip);
        const currentMember = activeTrip.members.find(m => m.id === user?.id);
        const myBalance = currentMember?.balance || 0;
        const invoiceableExpenses = activeTrip.expenses.filter(e => e.title !== 'Settlement');

        const filteredExpenses = activeTrip.expenses.filter(expense => {
            const query = searchQuery.toLowerCase();
            const payerName = activeTrip.members.find(m => m.id === expense.paidByMemberId)?.name?.toLowerCase() || '';
            // EXCLUDE SETTLEMENTS FROM MAIN VIEW
            if (expense.title === 'Settlement') return false;
            return expense.title.toLowerCase().includes(query) || payerName.includes(query);
        }).reverse();

        const handleSaveTripSettings = async () => {
            if (!settingsName.trim()) return;
            setSavingSettings(true);
            const updated = { ...activeTrip, name: settingsName.trim(), description: settingsDesc.trim() };
            await handleUpdateTrip(updated);
            setActiveTrip(updated);
            setShowTripSettings(false);
            setSavingSettings(false);
        };

        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50 animate-fade-in">
                <div className="shrink-0 bg-white p-4 sm:p-6 pb-4 rounded-b-3xl shadow-sm border-b border-gray-100 z-10 animate-slide-down">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0 pr-2">
                            <h1 className="text-2xl font-extrabold text-gray-900 truncate">{activeTrip.name}</h1>
                            {activeTrip.description ? (
                                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{activeTrip.description}</p>
                            ) : (
                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                    <Calendar size={11} /> {new Date(activeTrip.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => { setSettingsName(activeTrip.name); setSettingsDesc(activeTrip.description || ''); setShowDescInput(!!(activeTrip.description)); setShowTripSettings(true); }}
                                className="relative w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 active:scale-90 transition-all"
                                title="Trip Settings"
                            >
                                <Settings size={16} />
                                {pendingRequestsCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                        {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4">
                        <div className="bg-gray-50 p-3 rounded-2xl text-center border border-gray-100">
                            <span className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Total Spent</span>
                            <span className="block text-base font-bold text-gray-900">₹{activeTrip.totalExpense.toLocaleString('en-IN')}</span>
                            {myBalance !== 0 && (
                                <span className={`block text-[11px] font-semibold mt-1 ${myBalance > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {myBalance > 0 ? `+₹${Math.abs(myBalance).toLocaleString('en-IN')}` : `−₹${Math.abs(myBalance).toLocaleString('en-IN')}`}
                                </span>
                            )}
                            {myBalance === 0 && currentMember && (
                                <span className="block text-[11px] font-semibold mt-1 text-gray-400">Settled</span>
                            )}
                        </div>
                        <button onClick={() => setView('ADD_MEMBER')} className="col-span-1 bg-white border border-gray-200 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 active:bg-gray-50 active:scale-95 transition-all relative overflow-hidden">
                            <div className="flex -space-x-2 mb-1">
                                {activeTrip.members.slice(0, 3).map(m => (
                                    <img key={m.id} src={m.avatarUrl || AVATAR_BOY} className="w-5 h-5 rounded-full border border-white" />
                                ))}
                                {activeTrip.members.length > 3 && (
                                    <div className="w-5 h-5 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[8px] font-bold text-gray-500">+{activeTrip.members.length - 3}</div>
                                )}
                            </div>
                            <span className="text-xs text-gray-600 font-medium">Members</span>
                        </button>
                        <button onClick={() => setView('TRIP_BALANCE')} className="col-span-1 bg-white border border-gray-200 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 active:bg-gray-50 active:scale-95 transition-all">
                            <CreditCard size={20} className="text-gray-600" />
                            <span className="text-xs text-gray-600 font-medium">Settlement</span>
                        </button>
                    </div>

                    <div className="mt-4 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search expenses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all focus:scale-[1.01]"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pb-28">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 text-lg">Expenses</h3>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-md">{filteredExpenses.length} items</span>
                    </div>

                    <div className="space-y-4">
                        {filteredExpenses.length === 0 ? (
                            <div className="text-center py-10 opacity-60 animate-slide-up">
                                <p className="text-gray-500">{searchQuery ? 'No matching expenses found.' : 'No expenses added yet.'}</p>
                            </div>
                        ) : (
                            filteredExpenses.map((expense, index) => {
                                const payerName = activeTrip.members.find(m => m.id === expense.paidByMemberId)?.name;
                                return (
                                    <div
                                        key={expense.id}
                                        onClick={() => { setEditingExpense(expense); setView('ADD_EXPENSE'); }}
                                        className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center group relative cursor-pointer hover:border-indigo-200 transition-all active:scale-98 animate-slide-up"
                                        style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'backwards' }}
                                    >
                                        <div className="flex-1 pr-8">
                                            <div className="font-bold text-gray-800 text-lg">{expense.title}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                Paid by <span className="font-medium text-gray-600">{payerName}</span> • {new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-gray-900 text-lg">₹{expense.amount.toLocaleString('en-IN')}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {new Date(expense.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <div className="absolute top-1/2 -translate-y-1/2 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setEditingExpense(expense); setView('ADD_EXPENSE'); }}
                                                className="text-indigo-500 p-2 rounded-lg hover:bg-indigo-50 border border-indigo-100 shadow-sm transition-transform hover:scale-110"
                                            >
                                                <Edit3 size={18} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteExpense(expense.id); }}
                                                className="text-red-500 p-2 rounded-lg hover:bg-red-50 border border-red-100 shadow-sm transition-transform hover:scale-110"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Trip Settings Bottom Sheet */}
                {showTripSettings && (
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-end"
                        onClick={() => setShowTripSettings(false)}
                    >
                        <div
                            className="bg-white w-full rounded-t-3xl shadow-2xl animate-slide-up overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Handle bar */}
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                            </div>

                            <div className="px-6 pt-4" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
                                <div className="flex justify-between items-center mb-5">
                                    <h2 className="text-xl font-bold text-gray-900">Trip Settings</h2>
                                    <button
                                        onClick={() => setShowTripSettings(false)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 active:scale-90 transition-all"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Quick Actions */}
                                <div className="grid grid-cols-3 gap-2 mb-5">
                                    <button
                                        onClick={() => {
                                            setShowTripSettings(false);
                                            setInvoiceSelectedIds(invoiceableExpenses.map(e => e.id));
                                            setShowInvoiceModal(true);
                                        }}
                                        className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-600 active:scale-95 transition-all"
                                    >
                                        <FileDown size={18} className="text-gray-500" />
                                        <span className="text-[11px] font-semibold">Invoice</span>
                                    </button>
                                    <button
                                        onClick={() => { setShowTripSettings(false); setShowInviteModal(true); }}
                                        className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-600 active:scale-95 transition-all"
                                    >
                                        <Link2 size={18} className="text-gray-500" />
                                        <span className="text-[11px] font-semibold">Share</span>
                                    </button>
                                    {isAdmin && (
                                        <button
                                            onClick={() => { setShowTripSettings(false); setShowJoinRequestsModal(true); }}
                                            className="relative flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-600 active:scale-95 transition-all"
                                        >
                                            <UserPlus size={18} className="text-gray-500" />
                                            <span className="text-[11px] font-semibold">Requests</span>
                                            {pendingRequestsCount > 0 && (
                                                <span className="absolute top-1.5 right-1.5 bg-rose-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                                    {pendingRequestsCount}
                                                </span>
                                            )}
                                        </button>
                                    )}
                                    {!isAdmin && <div />}
                                </div>

                                <div className="border-t border-gray-100 mb-5" />

                                {/* Trip Name */}
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Trip Name</label>
                                    <input
                                        value={settingsName}
                                        onChange={e => setSettingsName(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 text-base transition-all"
                                        placeholder="Enter trip name"
                                    />
                                </div>

                                {/* Description toggle */}
                                <div className="mb-5">
                                    <button
                                        onClick={() => setShowDescInput(v => !v)}
                                        className="flex items-center gap-2 text-sm font-semibold text-indigo-600 mb-2 active:opacity-70 transition-opacity"
                                    >
                                        <ChevronRight size={15} className={`transition-transform duration-200 ${showDescInput ? 'rotate-90' : ''}`} />
                                        {showDescInput ? 'Hide description' : (settingsDesc ? 'Edit description' : 'Add description')}
                                    </button>
                                    {showDescInput && (
                                        <textarea
                                            value={settingsDesc}
                                            onChange={e => setSettingsDesc(e.target.value)}
                                            placeholder="A short note about this trip (optional)"
                                            rows={3}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none transition-all"
                                        />
                                    )}
                                </div>

                                {/* Save */}
                                <button
                                    onClick={handleSaveTripSettings}
                                    disabled={!settingsName.trim() || savingSettings}
                                    className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl mb-3 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                                >
                                    {savingSettings ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                    ) : (
                                        <><Save size={18} /> Save Changes</>
                                    )}
                                </button>

                                {/* Delete — admin only */}
                                {isAdmin && (
                                    <button
                                        onClick={() => {
                                            setShowTripSettings(false);
                                            handleDeleteTrip(activeTrip.id, activeTrip.name);
                                        }}
                                        className="w-full py-3.5 bg-rose-50 text-rose-600 font-bold rounded-xl border border-rose-200 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-rose-100"
                                    >
                                        <Trash2 size={18} /> Delete Trip
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Invoice Expense Selection Modal */}
                {showInvoiceModal && (
                    <div
                        className="fixed inset-0 bg-black/50 z-[60] flex items-end"
                        onClick={() => setShowInvoiceModal(false)}
                    >
                        <div
                            className="bg-white w-full rounded-t-3xl animate-slide-up flex flex-col"
                            style={{ maxHeight: '82vh' }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Handle */}
                            <div className="flex justify-center pt-3 pb-1 shrink-0">
                                <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
                            </div>

                            <div className="px-5 pt-3 pb-2 shrink-0">
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">Generate Invoice</h2>
                                        <p className="text-xs text-gray-400 mt-0.5">Select which expenses to include</p>
                                    </div>
                                    <button onClick={() => setShowInvoiceModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:scale-90 transition-all">
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Select All row */}
                                <button
                                    onClick={() => {
                                        if (invoiceSelectedIds.length === invoiceableExpenses.length) {
                                            setInvoiceSelectedIds([]);
                                        } else {
                                            setInvoiceSelectedIds(invoiceableExpenses.map(e => e.id));
                                        }
                                    }}
                                    className="flex items-center gap-2 text-sm font-semibold text-indigo-600 py-2 active:opacity-70 transition-opacity"
                                >
                                    {invoiceSelectedIds.length === invoiceableExpenses.length
                                        ? <CheckSquare size={18} />
                                        : <Square size={18} />
                                    }
                                    {invoiceSelectedIds.length === invoiceableExpenses.length ? 'Deselect All' : 'Select All'}
                                    <span className="ml-auto text-xs text-gray-400 font-normal">
                                        {invoiceSelectedIds.length}/{invoiceableExpenses.length} selected
                                    </span>
                                </button>
                            </div>

                            {/* Expense list */}
                            <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-2">
                                {invoiceableExpenses.length === 0 ? (
                                    <p className="text-center text-gray-400 text-sm py-6">No expenses to include.</p>
                                ) : (
                                    invoiceableExpenses.map(expense => {
                                        const selected = invoiceSelectedIds.includes(expense.id);
                                        const payerName = activeTrip.members.find(m => m.id === expense.paidByMemberId)?.name;
                                        return (
                                            <button
                                                key={expense.id}
                                                onClick={() => setInvoiceSelectedIds(prev =>
                                                    selected ? prev.filter(id => id !== expense.id) : [...prev, expense.id]
                                                )}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all active:scale-98 ${selected ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-100 bg-gray-50'}`}
                                            >
                                                {selected
                                                    ? <CheckSquare size={18} className="text-indigo-600 shrink-0" />
                                                    : <Square size={18} className="text-gray-300 shrink-0" />
                                                }
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-800 text-sm truncate">{expense.title}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {payerName} · {new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                    </p>
                                                </div>
                                                <span className="font-bold text-gray-900 text-sm shrink-0">₹{expense.amount.toLocaleString('en-IN')}</span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            <div className="px-5 pt-3 pb-6 shrink-0 border-t border-gray-100">
                                <button
                                    onClick={() => {
                                        generatePDF(activeTrip, invoiceSelectedIds);
                                        setShowInvoiceModal(false);
                                    }}
                                    disabled={invoiceSelectedIds.length === 0}
                                    className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl disabled:opacity-30 flex items-center justify-center gap-2 active:scale-95 transition-all"
                                >
                                    <FileDown size={18} />
                                    Generate Invoice
                                    {invoiceSelectedIds.length > 0 && (
                                        <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                            {invoiceSelectedIds.length} expense{invoiceSelectedIds.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const AddExpenseView = () => {
        if (!activeTrip) return null;

        const [title, setTitle] = useState(editingExpense?.title || '');
        const [amount, setAmount] = useState<number>(editingExpense?.amount || 0);
        const [paidBy, setPaidBy] = useState(editingExpense?.paidByMemberId || activeTrip.members[0]?.id || '');
        const [date, setDate] = useState(
            editingExpense
                ? new Date(editingExpense.date).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0]
        );

        // New State for Split Logic
        const [splitType, setSplitType] = useState<SplitType>(editingExpense?.splitType || 'EQUAL');

        // Equal Split State
        const [splitWithEqual, setSplitWithEqual] = useState<string[]>(
            (editingExpense?.splitType === 'EQUAL' || !editingExpense?.splitType) && editingExpense?.splitAmongMemberIds
                ? editingExpense.splitAmongMemberIds
                : activeTrip.members.map(m => m.id)
        );

        // Custom Values State (for EXACT and PERCENT)
        const [splitValues, setSplitValues] = useState<{ [key: string]: number }>(
            editingExpense?.splitValues || {}
        );

        // Validation & Calculation
        const getTotalSplitValue = () => {
            return (Object.values(splitValues) as number[]).reduce((sum, val) => sum + (val || 0), 0);
        };

        const getRemainingAmount = () => {
            if (splitType === 'EXACT') {
                return amount - getTotalSplitValue();
            }
            if (splitType === 'PERCENT') {
                return 100 - getTotalSplitValue();
            }
            return 0;
        };

        const getAllocatedAmount = () => {
            if (splitType === 'EQUAL') {
                return amount; // In equal split, we assume fully allocated if > 0 members
            }
            if (splitType === 'EXACT') {
                return getTotalSplitValue();
            }
            if (splitType === 'PERCENT') {
                return (amount * getTotalSplitValue()) / 100;
            }
            return 0;
        }

        const isFormValid = () => {
            if (!amount || !title) return false;

            if (splitType === 'EQUAL') {
                return splitWithEqual.length > 0;
            }
            if (splitType === 'EXACT') {
                // Allow small floating point error margin
                return Math.abs(getRemainingAmount()) < 0.1;
            }
            if (splitType === 'PERCENT') {
                return Math.abs(getRemainingAmount()) < 0.1;
            }
            return true;
        };

        const handleSave = () => {
            if (!isFormValid()) return;

            const currentTime = new Date();
            const selectedDate = new Date(date);
            selectedDate.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds());

            // Determine who is involved based on split type
            let finalSplitIds: string[] = [];
            let finalSplitValues = {};

            if (splitType === 'EQUAL') {
                finalSplitIds = splitWithEqual;
                finalSplitValues = {};
            } else {
                // For Exact and Percent, only include members with > 0 value
                finalSplitIds = activeTrip.members
                    .filter(m => (splitValues[m.id] || 0) > 0)
                    .map(m => m.id);
                finalSplitValues = splitValues;
            }

            const commonData = {
                tripId: activeTrip.id,
                title,
                amount,
                paidByMemberId: paidBy,
                splitAmongMemberIds: finalSplitIds,
                splitType,
                splitValues: finalSplitValues,
                date: selectedDate.toISOString()
            };

            if (editingExpense) {
                const updatedExpense = { ...editingExpense, ...commonData };
                const updatedExpenses = activeTrip.expenses.map(e => e.id === editingExpense.id ? updatedExpense : e);
                const updatedTrip = { ...activeTrip, expenses: updatedExpenses };
                handleUpdateTrip(updatedTrip);
            } else {
                const newExpense: import('./types').Expense = {
                    id: Date.now().toString(),
                    ...commonData
                };
                const updatedTrip = {
                    ...activeTrip,
                    expenses: [...activeTrip.expenses, newExpense]
                };
                handleUpdateTrip(updatedTrip);
            }

            setEditingExpense(null);
            setView('TRIP_DASHBOARD');
        };

        const toggleSplitMemberEqual = (id: string) => {
            if (splitWithEqual.includes(id)) {
                // Don't allow deselecting if it's the last one? No, allow it but validate on save.
                setSplitWithEqual(splitWithEqual.filter(mid => mid !== id));
            } else {
                setSplitWithEqual([...splitWithEqual, id]);
            }
        };

        const toggleSelectAllEqual = () => {
            if (splitWithEqual.length === activeTrip.members.length) {
                setSplitWithEqual([]);
            } else {
                setSplitWithEqual(activeTrip.members.map(m => m.id));
            }
        };

        const handleCustomValueChange = (id: string, val: string) => {
            const numVal = parseFloat(val);
            setSplitValues(prev => ({
                ...prev,
                [id]: isNaN(numVal) ? 0 : numVal
            }));
        };

        // Helper for visual feedback
        const allocated = getAllocatedAmount();
        const remaining = amount - allocated;
        const progressPercent = splitType === 'PERCENT'
            ? getTotalSplitValue()
            : Math.min((allocated / (amount || 1)) * 100, 100);

        const progressColor = Math.abs(remaining) < 0.1 || (splitType === 'EQUAL' && splitWithEqual.length > 0)
            ? 'bg-emerald-500'
            : remaining < 0 ? 'bg-rose-500' : 'bg-amber-400';

        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white animate-slide-up">
                <div className="shrink-0 p-4 border-b border-gray-100 flex items-center justify-between bg-white z-10">
                    <button onClick={() => { setEditingExpense(null); setView('TRIP_DASHBOARD'); }} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"><ArrowLeft /></button>
                    <h2 className="font-bold text-lg">{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
                    <button
                        onClick={handleSave}
                        disabled={!isFormValid()}
                        className="p-2 -mr-2 text-indigo-600 font-bold disabled:opacity-30 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                        {editingExpense ? 'Update' : 'Save'}
                    </button>
                </div>

                <div className="flex-1 p-6 overflow-y-auto pb-28">
                    {/* Title */}
                    <div className="mb-6 animate-slide-up delay-100" style={{ animationFillMode: 'backwards' }}>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Title</label>
                        <input
                            className="w-full text-lg font-medium border-b border-gray-200 py-2 focus:border-indigo-600 outline-none placeholder:font-normal transition-colors"
                            placeholder="e.g. Dinner at Taj"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            autoFocus={!editingExpense}
                        />
                    </div>

                    {/* Amount */}
                    <div className="mb-8 animate-slide-up delay-200" style={{ animationFillMode: 'backwards' }}>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Amount</label>
                        <CalculatorInput value={amount} onChange={setAmount} />
                    </div>

                    {/* Date & Payer Row */}
                    <div className="grid grid-cols-1 gap-6 mb-8 animate-slide-up delay-300" style={{ animationFillMode: 'backwards' }}>
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Paid By</label>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                {activeTrip.members.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setPaidBy(m.id)}
                                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border flex items-center gap-2 active:scale-95 ${paidBy === m.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <img src={m.avatarUrl || AVATAR_BOY} className="w-5 h-5 rounded-full bg-white/20" />
                                        {m.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Split Section */}
                    <div className="mb-24 animate-slide-up delay-400" style={{ animationFillMode: 'backwards' }}>

                        {/* Visual Summary of Split */}
                        <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Allocation</span>
                                <span className={`text-sm font-bold ${Math.abs(remaining) < 0.1 ? 'text-emerald-600' : 'text-gray-900'}`}>
                                    {allocated.toFixed(0)} / {amount.toFixed(0)}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-300 ${progressColor}`} style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            {splitType !== 'EQUAL' && Math.abs(remaining) > 0.1 && (
                                <div className="text-right mt-1">
                                    <span className={`text-xs font-bold ${remaining > 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                                        {remaining > 0 ? `Left: ₹${remaining.toFixed(2)}` : `Over: ₹${Math.abs(remaining).toFixed(2)}`}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Split Tabs */}
                        <div className="bg-gray-100 p-1 rounded-xl flex gap-1 mb-6">
                            <button
                                onClick={() => setSplitType('EQUAL')}
                                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${splitType === 'EQUAL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Divide size={14} /> Equal
                            </button>
                            <button
                                onClick={() => setSplitType('EXACT')}
                                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${splitType === 'EXACT' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <IndianRupee size={14} /> Exact
                            </button>
                            <button
                                onClick={() => setSplitType('PERCENT')}
                                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${splitType === 'PERCENT' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Percent size={14} /> %
                            </button>
                        </div>

                        {/* EQUAL SPLIT UI */}
                        {splitType === 'EQUAL' && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-sm text-gray-500 font-medium">
                                        ₹{(amount / (splitWithEqual.length || 1)).toFixed(2)} / person
                                    </span>
                                    <button onClick={toggleSelectAllEqual} className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded">
                                        {splitWithEqual.length === activeTrip.members.length ? <CheckSquare size={14} /> : <Square size={14} />}
                                        {splitWithEqual.length === activeTrip.members.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {activeTrip.members.map(m => {
                                        const isSelected = splitWithEqual.includes(m.id);
                                        return (
                                            <button
                                                key={m.id}
                                                onClick={() => toggleSplitMemberEqual(m.id)}
                                                className={`p-4 rounded-xl border flex items-center gap-3 transition-all active:scale-95 ${isSelected ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm' : 'border-gray-200 text-gray-500 opacity-70'}`}
                                            >
                                                <div className="relative">
                                                    <img src={m.avatarUrl || AVATAR_BOY} className={`w-10 h-10 rounded-full border-2 ${isSelected ? 'border-indigo-200' : 'border-transparent grayscale'}`} />
                                                    {isSelected && <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white rounded-full p-0.5"><Check size={10} strokeWidth={4} /></div>}
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <span className="block font-bold text-sm leading-tight">{m.name}</span>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* EXACT & PERCENT SPLIT UI */}
                        {splitType !== 'EQUAL' && (
                            <div className="space-y-3">
                                {activeTrip.members.map(m => {
                                    const val = splitValues[m.id] || 0;
                                    const calculatedAmount = splitType === 'PERCENT' ? (amount * val) / 100 : val;

                                    return (
                                        <div key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${val > 0 ? 'border-indigo-200 bg-indigo-50/30' : 'border-transparent'}`}>
                                            <img src={m.avatarUrl || AVATAR_BOY} className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm" />
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-700">{m.name}</div>
                                                {splitType === 'PERCENT' && val > 0 && (
                                                    <div className="text-xs text-gray-500 font-medium">₹{calculatedAmount.toFixed(0)}</div>
                                                )}
                                            </div>
                                            <div className="relative w-32">
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    value={splitValues[m.id] || ''}
                                                    onChange={(e) => handleCustomValueChange(m.id, e.target.value)}
                                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-right font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm focus:shadow-md"
                                                />
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold pointer-events-none">
                                                    {splitType === 'EXACT' ? '₹' : '%'}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="shrink-0 p-4 border-t border-gray-100 bg-white z-10">
                    <button
                        disabled={!isFormValid()}
                        onClick={handleSave}
                        className="w-full py-4 bg-indigo-600 disabled:bg-gray-300 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-all"
                    >
                        {editingExpense ? 'Update Expense' : `Save Expense (₹${amount})`}
                    </button>
                </div>
            </div>
        );
    }

    const AddMemberView = () => {
        if (!activeTrip) return null;
        const [name, setName] = useState('');
        const [avatar, setAvatar] = useState(AVATAR_BOY);

        const handleAdd = () => {
            if (!name.trim()) return;
            const newMember: Member = {
                id: Date.now().toString(),
                name: name.trim(),
                avatarUrl: avatar,
                totalPaid: 0,
                balance: 0
            };
            const updatedTrip = {
                ...activeTrip,
                members: [...activeTrip.members, newMember]
            };
            handleUpdateTrip(updatedTrip);
            setName('');
        };

        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white animate-slide-in-right">
                <div className="shrink-0 p-6 border-b border-gray-100 bg-white flex items-center gap-4 z-10">
                    <button onClick={() => setView('TRIP_DASHBOARD')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"><ArrowLeft /></button>
                    <h2 className="text-2xl font-bold">Manage Members</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pb-28">

                <div className="mb-6 flex justify-center gap-4 animate-slide-up delay-100" style={{ animationFillMode: 'backwards' }}>
                    <button
                        onClick={() => setAvatar(AVATAR_BOY)}
                        className={`relative rounded-full p-1 transition-all ${avatar === AVATAR_BOY ? 'ring-2 ring-indigo-500 scale-110' : 'opacity-60 grayscale'}`}
                    >
                        <img src={AVATAR_BOY} className="w-12 h-12 rounded-full" />
                    </button>
                    <button
                        onClick={() => setAvatar(AVATAR_GIRL)}
                        className={`relative rounded-full p-1 transition-all ${avatar === AVATAR_GIRL ? 'ring-2 ring-indigo-500 scale-110' : 'opacity-60 grayscale'}`}
                    >
                        <img src={AVATAR_GIRL} className="w-12 h-12 rounded-full" />
                    </button>
                </div>

                <div className="flex gap-2 mb-8 animate-slide-up delay-200" style={{ animationFillMode: 'backwards' }}>
                    <input
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all focus:bg-white"
                        placeholder="Enter name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!name.trim()}
                        className="bg-indigo-600 text-white px-6 rounded-xl font-bold disabled:opacity-50 active:scale-95 transition-transform"
                    >
                        Add
                    </button>
                </div>

                <div className="space-y-3">
                    {activeTrip.members.map((m, index) => (
                        <div
                            key={m.id}
                            className="flex justify-between items-center p-4 bg-white border border-gray-100 shadow-sm rounded-xl animate-slide-up"
                            style={{ animationDelay: `${index * 0.05 + 0.2}s`, animationFillMode: 'backwards' }}
                        >
                            <div className="flex items-center gap-3">
                                <img src={m.avatarUrl || AVATAR_BOY} className="w-10 h-10 rounded-full border border-gray-100 shadow-sm" />
                                <div>
                                    <div className="font-bold text-gray-800">{m.name}</div>
                                    <div className="text-xs text-gray-500">
                                        {m.balance === 0 ? 'Settled' : m.balance > 0 ? `Receives ₹${m.balance.toFixed(0)}` : `Owes ₹${Math.abs(m.balance).toFixed(0)}`}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
    }

    const BalanceView = () => {
        if (!activeTrip) return null;
        const debts = SplitService.minimizeDebts(activeTrip);
        // State to track which items are currently being settled (for visual effect)
        const [settlingKeys, setSettlingKeys] = useState<string[]>([]);

        const handleSettle = (debt: import('./types').Debt) => {
            const key = `${debt.from}-${debt.to}-${debt.amount}`;
            setSettlingKeys(prev => [...prev, key]);

            // Add visual delay
            setTimeout(() => {
                // Find member objects by name (since Debt uses names)
                const payer = activeTrip.members.find(m => m.name === debt.from);
                const receiver = activeTrip.members.find(m => m.name === debt.to);

                if (payer && receiver) {
                    const newExpense: import('./types').Expense = {
                        id: Date.now().toString(),
                        tripId: activeTrip.id,
                        title: `Settlement`,
                        amount: debt.amount,
                        paidByMemberId: payer.id,
                        splitAmongMemberIds: [receiver.id],
                        date: new Date().toISOString()
                    };
                    const updatedTrip = {
                        ...activeTrip,
                        expenses: [...activeTrip.expenses, newExpense]
                    };
                    handleUpdateTrip(updatedTrip);
                }
                setSettlingKeys(prev => prev.filter(k => k !== key));
            }, 600);
        };

        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50 animate-fade-in">
                <div className="shrink-0 bg-white p-6 border-b border-gray-100 flex items-center gap-4 z-10 animate-slide-down">
                    <button onClick={() => setView('TRIP_DASHBOARD')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"><ArrowLeft /></button>
                    <h2 className="text-2xl font-bold text-gray-900">Settlements</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pb-28">
                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 animate-fade-in delay-100">Net Balances</h3>
                        <div className="space-y-3">
                            {activeTrip.members.map((m, index) => (
                                <div
                                    key={m.id}
                                    className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm animate-slide-up"
                                    style={{ animationDelay: `${index * 0.05 + 0.1}s`, animationFillMode: 'backwards' }}
                                >
                                    <div className="flex items-center gap-3">
                                        <img src={m.avatarUrl || AVATAR_BOY} className="w-8 h-8 rounded-full border border-gray-100" />
                                        <span className="font-medium text-gray-700">{m.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className={`font-bold text-sm ${m.balance > 0 ? 'text-emerald-600' : m.balance < 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                                            {m.balance > 0 ? `+₹${Math.round(m.balance).toLocaleString('en-IN')}` : m.balance < 0 ? `−₹${Math.abs(Math.round(m.balance)).toLocaleString('en-IN')}` : 'Settled'}
                                        </span>
                                        {m.balance !== 0 && (
                                            <p className={`text-[10px] mt-0.5 ${m.balance > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {m.balance > 0 ? 'gets back' : 'needs to pay'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 animate-fade-in delay-300">How to settle</h3>
                        {debts.length === 0 ? (
                            <div className="text-center py-8 bg-white rounded-2xl border border-gray-100 border-dashed animate-pop delay-500">
                                <Check size={48} className="mx-auto text-emerald-400 mb-2" />
                                <p className="text-gray-500 font-medium">Everyone is settled up!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {debts.map((debt, idx) => {
                                    const key = `${debt.from}-${debt.to}-${debt.amount}`;
                                    const isSettling = settlingKeys.includes(key);
                                    const fromMember = activeTrip.members.find(m => m.name === debt.from);
                                    const toMember = activeTrip.members.find(m => m.name === debt.to);

                                    return (
                                        <div
                                            key={idx}
                                            className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 transition-all duration-300 animate-slide-up ${isSettling ? 'opacity-50 grayscale scale-95' : ''}`}
                                            style={{ animationDelay: `${idx * 0.05 + 0.3}s`, animationFillMode: 'backwards' }}
                                        >
                                            {/* Who pays whom row */}
                                            <div className="flex items-center gap-2 mb-3">
                                                {/* FROM */}
                                                <div className="flex flex-col items-center gap-1 flex-1">
                                                    <img
                                                        src={fromMember?.avatarUrl || AVATAR_BOY}
                                                        className="w-10 h-10 rounded-full border-2 border-rose-100 object-cover"
                                                    />
                                                    <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{debt.from}</span>
                                                    <span className="text-[10px] text-rose-500 font-medium">pays</span>
                                                </div>

                                                {/* Arrow + Amount */}
                                                <div className="flex flex-col items-center gap-1 shrink-0 px-2">
                                                    <span className={`text-lg font-bold text-gray-900 ${isSettling ? 'line-through' : ''}`}>₹{debt.amount.toLocaleString('en-IN')}</span>
                                                    <ArrowRight size={18} className="text-gray-300" />
                                                </div>

                                                {/* TO */}
                                                <div className="flex flex-col items-center gap-1 flex-1">
                                                    <img
                                                        src={toMember?.avatarUrl || AVATAR_BOY}
                                                        className="w-10 h-10 rounded-full border-2 border-emerald-100 object-cover"
                                                    />
                                                    <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{debt.to}</span>
                                                    <span className="text-[10px] text-emerald-600 font-medium">receives</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleSettle(debt)}
                                                disabled={isSettling}
                                                className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-medium rounded-lg text-sm transition-colors border border-gray-200 flex items-center justify-center gap-2 active:scale-95"
                                            >
                                                <CheckCircle2 size={15} />
                                                {isSettling ? 'Settling...' : 'Mark as Paid'}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // --- Bottom Navigation ---
    const BottomNav = () => {
        if (view === 'CREATE_TRIP' || view === 'ADD_EXPENSE' || view === 'ADD_MEMBER' || view === 'LOGIN' || view === 'SETTINGS') return null;

        const isActiveTrip = view === 'TRIP_DASHBOARD' || view === 'TRIP_BALANCE';

        return (
            <div className="absolute bottom-0 left-0 right-0 z-50">
                <div className="bg-white border-t border-gray-100" style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center px-2">
                        {/* Home */}
                        <button
                            onClick={() => { setActiveTrip(null); setView('HOME'); }}
                            className={`flex-1 flex flex-col items-center gap-0.5 pt-3 pb-2 transition-all active:scale-90 ${view === 'HOME' ? 'text-indigo-600' : 'text-gray-400'}`}
                        >
                            <Home size={22} strokeWidth={view === 'HOME' ? 2.5 : 1.8} />
                            <span className="text-[10px] font-semibold">Home</span>
                            {view === 'HOME' && <div className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5" />}
                        </button>

                        {/* Trips */}
                        <button
                            onClick={() => { if (activeTrip) setView('TRIP_DASHBOARD'); else setView('HOME'); }}
                            className={`flex-1 flex flex-col items-center gap-0.5 pt-3 pb-2 transition-all active:scale-90 ${isActiveTrip ? 'text-indigo-600' : 'text-gray-400'}`}
                        >
                            <Briefcase size={22} strokeWidth={isActiveTrip ? 2.5 : 1.8} />
                            <span className="text-[10px] font-semibold">Trips</span>
                            {isActiveTrip && <div className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5" />}
                        </button>

                        {/* Center + */}
                        <div className="flex-1 flex justify-center items-center py-2">
                            <button
                                onClick={() => {
                                    if (activeTrip) { setEditingExpense(null); setView('ADD_EXPENSE'); }
                                    else setView('CREATE_TRIP');
                                }}
                                className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center active:scale-90 transition-all"
                                style={{ boxShadow: '0 4px 14px rgba(79,70,229,0.35)' }}
                            >
                                <Plus size={24} strokeWidth={2.5} className="text-white" />
                            </button>
                        </div>

                        {/* Join */}
                        <button
                            onClick={() => setView('IMPORT_TRIP')}
                            className={`flex-1 flex flex-col items-center gap-0.5 pt-3 pb-2 transition-all active:scale-90 ${view === 'IMPORT_TRIP' ? 'text-indigo-600' : 'text-gray-400'}`}
                        >
                            <UserPlus size={22} strokeWidth={view === 'IMPORT_TRIP' ? 2.5 : 1.8} />
                            <span className="text-[10px] font-semibold">Join</span>
                            {view === 'IMPORT_TRIP' && <div className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5" />}
                        </button>

                        {/* Profile */}
                        <button
                            onClick={() => setView('PROFILE')}
                            className={`flex-1 flex flex-col items-center gap-0.5 pt-3 pb-2 transition-all active:scale-90 ${view === 'PROFILE' ? 'text-indigo-600' : 'text-gray-400'}`}
                        >
                            {(user?.customAvatarUrl || user?.avatarUrl) ? (
                                <img
                                    src={user.customAvatarUrl || user.avatarUrl}
                                    alt="Profile"
                                    className={`w-6 h-6 rounded-full object-cover ${view === 'PROFILE' ? 'ring-2 ring-indigo-500 ring-offset-1' : 'opacity-60'}`}
                                />
                            ) : (
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${view === 'PROFILE' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                            )}
                            <span className="text-[10px] font-semibold">Profile</span>
                            {view === 'PROFILE' && <div className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5" />}
                        </button>
                    </div>
                    <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
                </div>
            </div>
        )
    }

    // Loading Screen
    if (authLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    return (
        <div className="w-full max-w-md mx-auto bg-white h-screen flex flex-col relative shadow-2xl overflow-hidden">
            {view === 'LOGIN' && <LoginView />}
            {view === 'HOME' && <HomeView />}
            {view === 'PROFILE' && <ProfileView />}
            {view === 'CREATE_TRIP' && <CreateTripView />}
            {view === 'TRIP_DASHBOARD' && <TripDashboard />}
            {view === 'TRIP_BALANCE' && <BalanceView />}
            {view === 'ADD_EXPENSE' && <AddExpenseView />}
            {view === 'ADD_MEMBER' && <AddMemberView />}
            {view === 'SETTINGS' && <SettingsView />}
            {view === 'IMPORT_TRIP' && <ImportTripView />}
            <BottomNav />

            {/* Modals */}
            {showInviteModal && activeTrip && (
                <InviteModal
                    trip={activeTrip}
                    onClose={() => setShowInviteModal(false)}
                    onUpdate={(updatedTrip) => {
                        setActiveTrip(updatedTrip);
                        setShowInviteModal(false);
                    }}
                />
            )}

            {showJoinRequestsModal && activeTrip && (
                <JoinRequestsModal
                    trip={activeTrip}
                    onClose={() => setShowJoinRequestsModal(false)}
                    onUpdate={(updatedTrip) => {
                        setActiveTrip(updatedTrip);
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteConfirm}
                title="Delete Trip?"
                message={`Are you sure you want to delete "${tripToDelete?.name}"? This action cannot be undone and all trip data will be permanently lost.`}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDeleteTrip}
                onCancel={() => {
                    setShowDeleteConfirm(false);
                    setTripToDelete(null);
                }}
                isDangerous={true}
            />
        </div>
    );
}