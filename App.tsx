import React, { useState, useEffect } from 'react';
import { User, Trip, ViewState, Member, SplitType } from './types';
import { StorageService } from './services/storageService';
import { SplitService } from './services/splitService';
import { CalculatorInput } from './components/CalculatorInput';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  LogOut, Plus, Users, ChevronRight, IndianRupee, 
  Calendar, Home, Briefcase, Calculator, ArrowLeft, Check, CreditCard, Trash2, Search, User as UserIcon, Settings, Edit3, CheckCircle2, Percent, Hash, Divide, X,
  Share2, Download, Copy, Save, FileText, CheckSquare, Square
} from 'lucide-react';

// Avatars
const AVATAR_BOY = "https://avatar.iran.liara.run/public/boy";
const AVATAR_GIRL = "https://avatar.iran.liara.run/public/girl";

// --- Main App ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<ViewState | 'PROFILE' | 'LOGIN' | 'SETTINGS' | 'IMPORT_TRIP'>('LOGIN');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [editingExpense, setEditingExpense] = useState<import('./types').Expense | null>(null);
  
  // Initialize Auth (Local)
  useEffect(() => {
    const storedUser = StorageService.getUser();
    if (storedUser) {
      setUser(storedUser);
      setView('HOME');
      refreshTrips();
    }
    setAuthLoading(false);
  }, []);

  const refreshTrips = () => {
    const fetchedTrips = StorageService.getTrips();
    setTrips(fetchedTrips);
    return fetchedTrips;
  };

  const handleLogin = (name: string, avatarUrl: string) => {
    const newUser: User = {
        id: Date.now().toString(),
        name: name,
        email: '',
        avatarUrl: avatarUrl,
        phone: ''
    };
    StorageService.saveUser(newUser);
    setUser(newUser);
    refreshTrips();
    setView('HOME');
  };

  const handleUpdateProfile = (name: string, phone: string) => {
    if (!user) return;
    const updatedUser = { ...user, name, phone };
    StorageService.saveUser(updatedUser);
    setUser(updatedUser);
    setView('PROFILE');
  };

  const handleLogout = async () => {
    StorageService.logout();
    setUser(null);
    setTrips([]);
    setActiveTrip(null);
    setView('LOGIN');
  };

  const handleCreateTrip = async (name: string) => {
    if (!user) return;
    const newTrip: Trip = {
      id: Date.now().toString(),
      name,
      totalExpense: 0,
      members: [{ id: user.id, name: user.name, avatarUrl: user.avatarUrl, totalPaid: 0, balance: 0 }],
      expenses: [],
      currency: 'INR',
      createdBy: user.id,
      createdAt: Date.now()
    };
    
    StorageService.addTrip(newTrip);
    const updatedTrips = refreshTrips();
    
    // Set active trip
    const createdTrip = updatedTrips.find(t => t.id === newTrip.id);
    if (createdTrip) {
        setActiveTrip(createdTrip);
    }
    setView('TRIP_DASHBOARD');
  };

  const handleUpdateTrip = async (updatedTrip: Trip) => {
    // Recalculate balances whenever trip updates
    const balancedTrip = SplitService.calculateBalances(updatedTrip);
    
    StorageService.updateTrip(balancedTrip);
    const updatedTrips = refreshTrips();
    
    const reloadedTrip = updatedTrips.find(t => t.id === balancedTrip.id);
    if (reloadedTrip) {
        setActiveTrip(reloadedTrip);
    }
  };

  // Safe Base64 Encoding/Decoding for Unicode
  const safeBtoa = (str: string) => btoa(unescape(encodeURIComponent(str)));
  const safeAtob = (str: string) => decodeURIComponent(escape(atob(str)));

  const handleImportTrip = (jsonString: string) => {
    try {
        const tripData: Trip = JSON.parse(safeAtob(jsonString));
        if (!tripData.id || !tripData.name || !tripData.members) {
            alert("Invalid Trip Code");
            return;
        }
        
        // Check if exists
        const existing = trips.find(t => t.id === tripData.id);
        if (existing) {
            if (!window.confirm(`Trip "${tripData.name}" already exists. Overwrite it?`)) {
                return;
            }
            StorageService.updateTrip(tripData);
        } else {
            StorageService.addTrip(tripData);
        }
        
        refreshTrips();
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

  const generatePDF = (trip: Trip) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo 600
    doc.text("Trip Splitter by Pranav", pageWidth / 2, 20, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text(`Trip: ${trip.name}`, 14, 35);
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Created: ${new Date(trip.createdAt).toLocaleDateString()}`, 14, 42);
    
    doc.setTextColor(16, 185, 129); // Emerald 500
    doc.setFontSize(14);
    doc.text(`Total Expense: ${trip.totalExpense.toLocaleString('en-IN')}`, 14, 52);

    // Settlements
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("Settlements", 14, 65);
    
    const debts = SplitService.minimizeDebts(trip);
    let yPos = 75;
    
    doc.setFontSize(11);
    if (debts.length === 0) {
        doc.text("All settled up!", 14, yPos);
        yPos += 10;
    } else {
        debts.forEach(d => {
            doc.text(`${d.from} pays ${d.to} ${d.amount.toLocaleString('en-IN')}`, 14, yPos);
            yPos += 7;
        });
        yPos += 5;
    }

    // Expenses Table
    const tableRows = trip.expenses.filter(e => e.title !== 'Settlement').map(e => [
        new Date(e.date).toLocaleDateString(),
        e.title,
        trip.members.find(m => m.id === e.paidByMemberId)?.name || 'Unknown',
        e.amount.toLocaleString('en-IN')
    ]);

    // @ts-ignore
    autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Title', 'Paid By', 'Amount']],
        body: tableRows,
        headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
        alternateRowStyles: { fillColor: [249, 250, 251] } // Gray 50
    });

    // Import Code
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY + 15;
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Import Code", 14, finalY);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Copy the code below to import this trip data:", 14, finalY + 6);
    
    const tripCode = safeBtoa(JSON.stringify(trip));
    const splitCode = doc.splitTextToSize(tripCode, 180);
    doc.setFont("courier");
    doc.setFontSize(8);
    doc.text(splitCode, 14, finalY + 12);

    doc.save(`${trip.name.replace(/\s+/g, '_')}_Report.pdf`);
  };

  // --- Views ---

  const LoginView = () => {
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState(AVATAR_BOY);

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) handleLogin(name.trim(), avatar);
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-8 bg-white animate-fade-in text-center">
            <div className="w-24 h-24 bg-indigo-100 rounded-3xl flex items-center justify-center mb-6 text-indigo-600 rotate-12 animate-pop delay-100">
                <IndianRupee size={48} strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2 animate-slide-up delay-200" style={{ animationFillMode: 'backwards' }}>Trip Splitter</h1>
            <h2 className="text-lg font-medium text-indigo-600 mb-8 animate-slide-up delay-300" style={{ animationFillMode: 'backwards' }}>by Pranav</h2>
            
            <div className="mb-8 animate-slide-up delay-300" style={{ animationFillMode: 'backwards' }}>
                <p className="text-gray-500 mb-4 text-sm font-medium">Select your avatar</p>
                <div className="flex gap-6 justify-center">
                    <button 
                        type="button"
                        onClick={() => setAvatar(AVATAR_BOY)}
                        className={`relative rounded-full p-1 transition-all ${avatar === AVATAR_BOY ? 'ring-4 ring-indigo-500 scale-110' : 'ring-1 ring-gray-200 opacity-60 hover:opacity-100 hover:scale-105'}`}
                    >
                        <img src={AVATAR_BOY} alt="Boy" className="w-20 h-20 rounded-full bg-gray-50" />
                        {avatar === AVATAR_BOY && <div className="absolute bottom-0 right-0 bg-indigo-500 text-white rounded-full p-1"><Check size={12} strokeWidth={4} /></div>}
                    </button>
                    <button 
                        type="button"
                        onClick={() => setAvatar(AVATAR_GIRL)}
                        className={`relative rounded-full p-1 transition-all ${avatar === AVATAR_GIRL ? 'ring-4 ring-indigo-500 scale-110' : 'ring-1 ring-gray-200 opacity-60 hover:opacity-100 hover:scale-105'}`}
                    >
                        <img src={AVATAR_GIRL} alt="Girl" className="w-20 h-20 rounded-full bg-gray-50" />
                        {avatar === AVATAR_GIRL && <div className="absolute bottom-0 right-0 bg-indigo-500 text-white rounded-full p-1"><Check size={12} strokeWidth={4} /></div>}
                    </button>
                </div>
            </div>
            
            <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 animate-slide-up delay-500" style={{ animationFillMode: 'backwards' }}>
                <input 
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-center font-medium placeholder:text-gray-400 transition-all focus:scale-[1.02]"
                    autoFocus
                />
                <button 
                    type="submit"
                    disabled={!name.trim()}
                    className="w-full bg-gray-900 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50"
                >
                    Get Started
                </button>
            </form>
        </div>
    );
  };

  const SettingsView = () => {
      const [name, setName] = useState(user?.name || '');
      const [phone, setPhone] = useState(user?.phone || '');

      return (
        <div className="h-full overflow-y-auto bg-white p-6 animate-slide-in-right">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setView('PROFILE')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"><ArrowLeft /></button>
                <h2 className="text-2xl font-bold">Settings</h2>
            </div>
            
            <div className="space-y-6">
                <div className="animate-slide-up delay-100" style={{ animationFillMode: 'backwards' }}>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Display Name</label>
                    <input 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all focus:bg-white"
                    />
                </div>
                <div className="animate-slide-up delay-200" style={{ animationFillMode: 'backwards' }}>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                    <input 
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all focus:bg-white"
                    />
                </div>
                
                <button 
                    onClick={() => handleUpdateProfile(name, phone)}
                    disabled={!name.trim()}
                    className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-95 animate-slide-up delay-300"
                    style={{ animationFillMode: 'backwards' }}
                >
                    <Save size={20} /> Save Changes
                </button>
            </div>
        </div>
      );
  };

  const HomeView = () => (
    <div className="h-full overflow-y-auto pb-24 animate-fade-in">
      <header className="bg-white p-6 sticky top-0 z-10 border-b border-gray-100 flex justify-between items-center shadow-sm animate-slide-down">
        <div>
            <h1 className="text-xl font-bold text-gray-900">Trip Splitter by Pranav</h1>
            <p className="text-gray-500 text-sm">Welcome back, {user?.name.split(' ')[0]}</p>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={() => setView('IMPORT_TRIP')} className="p-2 text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors active:scale-90">
                <Download size={20} />
            </button>
            <button onClick={() => setView('PROFILE')} className="active:scale-90 transition-transform">
                <img src={user?.avatarUrl} alt="Profile" className="w-10 h-10 rounded-full border border-gray-200" />
            </button>
        </div>
      </header>

      <div className="p-6 grid gap-4">
        {trips.length === 0 ? (
            <div className="text-center py-20 opacity-50 animate-slide-up">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <Briefcase size={32} />
                </div>
                <p className="text-lg font-medium text-gray-600">No trips yet</p>
                <p className="text-sm text-gray-400">Start a new adventure!</p>
            </div>
        ) : (
            trips.map((trip, index) => (
            <div
                key={trip.id}
                onClick={() => { setActiveTrip(trip); setView('TRIP_DASHBOARD'); }}
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-100 active:scale-98 transition-all cursor-pointer relative overflow-hidden group animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'backwards' }}
            >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110 duration-500"></div>
                
                <div className="relative z-10">
                    <h3 className="text-xl font-bold text-gray-800 mb-1">{trip.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
                        <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                            <Users size={14} /> {trip.members.length}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                            <IndianRupee size={14} /> {trip.totalExpense.toLocaleString('en-IN')}
                        </span>
                    </div>
                </div>
                <ChevronRight className="absolute right-4 bottom-4 text-gray-300" size={20} />
            </div>
            ))
        )}
      </div>
    </div>
  );

  const ImportTripView = () => {
    const [code, setCode] = useState('');
    return (
        <div className="h-full overflow-y-auto bg-white p-6 animate-slide-in-right">
            <button onClick={() => setView('HOME')} className="mb-8 p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center transition-colors"><ArrowLeft size={24} /></button>
            <h2 className="text-3xl font-bold text-gray-900 mb-2 animate-slide-up delay-100" style={{ animationFillMode: 'backwards' }}>Join a Trip</h2>
            <p className="text-gray-500 mb-8 animate-slide-up delay-200" style={{ animationFillMode: 'backwards' }}>Paste the trip code (from PDF report) below.</p>
            
            <textarea 
                value={code} 
                onChange={e => setCode(e.target.value)}
                placeholder="Paste code here..."
                className="w-full h-40 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4 focus:border-indigo-500 focus:outline-none mb-8 font-mono text-xs animate-slide-up delay-300"
                style={{ animationFillMode: 'backwards' }}
            />
            <button 
                disabled={!code.trim()}
                onClick={() => handleImportTrip(code)}
                className="w-full py-4 bg-indigo-600 disabled:bg-gray-300 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 animate-slide-up delay-400"
                style={{ animationFillMode: 'backwards' }}
            >
                <Download size={20} /> Import Trip
            </button>
        </div>
    );
  };

  const CreateTripView = () => {
    const [name, setName] = useState('');
    
    return (
        <div className="h-full overflow-y-auto bg-white p-6 animate-slide-up">
            <button onClick={() => setView('HOME')} className="mb-8 p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center transition-colors"><ArrowLeft size={24} /></button>
            <h2 className="text-3xl font-bold text-gray-900 mb-2 animate-slide-up delay-100" style={{ animationFillMode: 'backwards' }}>New Trip</h2>
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
    );
  };

  const ProfileView = () => {
      if (!user) return null;
      return (
        <div className="h-full overflow-y-auto bg-white p-6 pb-24 animate-fade-in">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 animate-slide-up">Profile</h2>
            
            <div className="flex flex-col items-center mb-8 animate-slide-up delay-100" style={{ animationFillMode: 'backwards' }}>
                <img src={user.avatarUrl} alt={user.name} className="w-24 h-24 rounded-full border-4 border-indigo-50 mb-4 shadow-sm" />
                <h3 className="text-xl font-bold text-gray-800">{user.name}</h3>
                <p className="text-gray-500">{user.phone || 'No phone added'}</p>
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
            
            <div className="mt-12 text-center animate-fade-in delay-500">
                <p className="text-xs text-gray-400">Trip Splitter v1.0</p>
            </div>
        </div>
      );
  };

  const TripDashboard = () => {
    if (!activeTrip) return null;
    const [searchQuery, setSearchQuery] = useState('');

    const filteredExpenses = activeTrip.expenses.filter(expense => {
        const query = searchQuery.toLowerCase();
        const payerName = activeTrip.members.find(m => m.id === expense.paidByMemberId)?.name?.toLowerCase() || '';
        // EXCLUDE SETTLEMENTS FROM MAIN VIEW
        if (expense.title === 'Settlement') return false; 
        return expense.title.toLowerCase().includes(query) || payerName.includes(query);
    }).reverse();
    
    return (
      <div className="h-full overflow-y-auto pb-24 bg-gray-50 animate-fade-in">
        <div className="bg-white p-6 pb-4 rounded-b-3xl shadow-sm border-b border-gray-100 sticky top-0 z-10 animate-slide-down">
          <div className="flex justify-between items-start mb-4">
             <div>
                <h1 className="text-2xl font-extrabold text-gray-900">{activeTrip.name}</h1>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <Calendar size={12} /> {new Date(activeTrip.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </p>
             </div>
             <div className="flex gap-2">
                 <button 
                    onClick={() => generatePDF(activeTrip)}
                    className="text-xs font-semibold bg-indigo-600 text-white px-3 py-1.5 rounded-full hover:bg-indigo-700 flex items-center gap-1 shadow-sm active:scale-95 transition-transform"
                 >
                    <Share2 size={12} /> Share Trip
                 </button>
                 <button onClick={() => setView('HOME')} className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-200 active:scale-95 transition-transform">Switch Trip</button>
             </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mt-4">
             <div className="bg-indigo-50 p-3 rounded-2xl text-center border border-indigo-100">
                <span className="block text-xs text-indigo-500 font-semibold uppercase tracking-wider mb-1">Total</span>
                <span className="block text-lg font-bold text-indigo-700">₹{activeTrip.totalExpense.toLocaleString('en-IN')}</span>
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

        <div className="p-6">
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
        return Object.values(splitValues).reduce((sum, val) => sum + (val || 0), 0);
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
        <div className="h-full bg-white flex flex-col animate-slide-up">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
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
            
            <div className="flex-1 p-6 overflow-y-auto">
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
                            )})}
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-white sticky bottom-0">
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
        <div className="h-full overflow-y-auto bg-white p-6 animate-slide-in-right">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setView('TRIP_DASHBOARD')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"><ArrowLeft /></button>
                <h2 className="text-2xl font-bold">Manage Members</h2>
            </div>
            
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
        <div className="h-full overflow-y-auto bg-gray-50 pb-24 animate-fade-in">
             <div className="bg-white p-6 border-b border-gray-100 sticky top-0 z-10 animate-slide-down">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('TRIP_DASHBOARD')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"><ArrowLeft /></button>
                    <h2 className="text-2xl font-bold text-gray-900">Settlements</h2>
                </div>
            </div>

            <div className="p-6">
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
                                <span className={`font-bold ${m.balance > 0 ? 'text-emerald-500' : m.balance < 0 ? 'text-rose-500' : 'text-gray-400'}`}>
                                    {m.balance > 0 ? '+' : ''}{Math.round(m.balance).toLocaleString('en-IN')}
                                </span>
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
                        <div className="space-y-4">
                            {debts.map((debt, idx) => {
                                const key = `${debt.from}-${debt.to}-${debt.amount}`;
                                const isSettling = settlingKeys.includes(key);

                                return (
                                <div 
                                    key={idx} 
                                    className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4 transition-all duration-300 animate-slide-up ${isSettling ? 'opacity-50 grayscale scale-95' : ''}`}
                                    style={{ animationDelay: `${idx * 0.05 + 0.3}s`, animationFillMode: 'backwards' }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 font-bold text-xs border border-rose-100">
                                                {debt.from.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-sm text-gray-400 ${isSettling ? 'line-through' : ''}`}>pays</span>
                                                <span className={`font-bold text-gray-800 ${isSettling ? 'line-through' : ''}`}>{debt.to}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`block font-bold text-lg text-emerald-600 ${isSettling ? 'line-through' : ''}`}>₹{debt.amount.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => handleSettle(debt)}
                                        disabled={isSettling}
                                        className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium rounded-lg text-sm transition-colors border border-emerald-100 flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <CheckCircle2 size={16} />
                                        {isSettling ? 'Settling...' : 'Mark Paid'}
                                    </button>
                                </div>
                            )})}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
  }

  // --- Bottom Navigation ---
  const BottomNav = () => {
    if (view === 'CREATE_TRIP' || view === 'ADD_EXPENSE' || view === 'ADD_MEMBER' || view === 'LOGIN' || view === 'SETTINGS' || view === 'IMPORT_TRIP') return null;
    
    return (
        <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around items-center pb-safe pt-2 h-[72px] z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] animate-slide-up">
            <button 
                onClick={() => { setActiveTrip(null); setView('HOME'); }}
                className={`flex flex-col items-center gap-1 w-16 p-1 rounded-xl transition-all active:scale-90 ${view === 'HOME' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <Home size={24} strokeWidth={view === 'HOME' ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Home</span>
            </button>
            
            <button 
                disabled={!activeTrip}
                onClick={() => setView('TRIP_DASHBOARD')}
                className={`flex flex-col items-center gap-1 w-16 p-1 rounded-xl transition-all active:scale-90 ${view === 'TRIP_DASHBOARD' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600 disabled:opacity-30'}`}
            >
                <Briefcase size={24} strokeWidth={view === 'TRIP_DASHBOARD' ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Trip</span>
            </button>

            <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                <button 
                    onClick={() => {
                        if (activeTrip) {
                             setEditingExpense(null);
                             setView('ADD_EXPENSE');
                        } else {
                             setView('CREATE_TRIP');
                        }
                    }}
                    className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all animate-pop delay-200"
                    style={{ animationFillMode: 'backwards' }}
                >
                    <Plus size={28} />
                </button>
            </div>

            <button 
                disabled={!activeTrip}
                onClick={() => setView('TRIP_BALANCE')}
                className={`flex flex-col items-center gap-1 w-16 p-1 rounded-xl transition-all active:scale-90 ${view === 'TRIP_BALANCE' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600 disabled:opacity-30'}`}
            >
                <IndianRupee size={24} strokeWidth={view === 'TRIP_BALANCE' ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Balance</span>
            </button>

            <button 
                onClick={() => setView('PROFILE')}
                className={`flex flex-col items-center gap-1 w-16 p-1 rounded-xl transition-all active:scale-90 ${view === 'PROFILE' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <UserIcon size={24} strokeWidth={view === 'PROFILE' ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Profile</span>
            </button>
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
    <div className="max-w-md mx-auto bg-white h-screen relative shadow-2xl overflow-hidden">
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
    </div>
  );
}