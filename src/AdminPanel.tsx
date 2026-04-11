import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc, deleteDoc, query, orderBy, where, increment } from 'firebase/firestore';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { AppSettings, Task, WithdrawalRequest, UserData } from './types';
import { ADMIN_EMAIL, ADMIN_TG_ID } from './constants';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  Settings as SettingsIcon, 
  Save, 
  Plus, 
  Trash2, 
  ExternalLink,
  Bot,
  Globe,
  DollarSign,
  TrendingUp,
  Tag,
  Image as ImageIcon,
  CheckCircle2,
  Lock,
  LogOut,
  ShieldAlert,
  Key,
  Zap,
  PlayCircle,
  Coins,
  Bell,
  MessageSquare,
  Megaphone,
  Users,
  Wallet,
  Ban,
  Check,
  X,
  ArrowLeft,
  Search,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  UserMinus,
  History,
  LayoutDashboard,
  Send,
  ListTodo
} from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AdminPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [isTgAdmin, setIsTgAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [isPasswordAuthenticated, setIsPasswordAuthenticated] = useState(() => {
    return sessionStorage.getItem('admin_auth') === 'true';
  });
  const [settings, setSettings] = useState<AppSettings>({
    appName: 'DT EARNING ZONE',
    appLogo: 'https://i.ibb.co/gLQsBHNp/logo.png',
    earningPerAd: 0.0004,
    userSharePercentage: 20,
    monetagZoneId: '10251457',
    monetagSdkId: 'show_10251457',
    botUsername: 'dt_eaening_zone_bot',
    botToken: '8124462129:AAF-aJ_fnvRD9y-QXQPXIY10z-xjtK-Mefs',
    newUserChannel: '-1003812909907',
    withdrawChannel: '-1003810127512',
    newUserMsgTemplate: `━━━━━━━━━━━━━━━━━━━━
🎉 NEW USER ALERT
━━━━━━━━━━━━━━━━━━━━━

👤 Name: {name}
🆔 ID: {userid} 
📱 Username: {username} 
⏰ Time: {join_time} 

━━━━━━━━━━━━━━━━━━━━━
🤖 IN THIS BOT : @dt_eaening_zone_bot
━━━━━━━━━━━━━━━━━━━━━`,
    referReward: 0.05,
    commonAdReward: 0.5,
    uniqueAdReward: 2.0,
    commonAdsTarget: 9,
    popupNotice: 'Welcome to our app! Start earning now.',
    homeNotice: 'Invite your friends and earn more!',
    uniqueAdNotice: 'This is a Unique Ad! You must click the ad, wait for it to load completely, and interact/register on the page to receive the high reward.',
    currencySymbol: '৳',
    exchangeRate: 120,
    isWithdrawEnabled: true,
    minWithdrawAmount: 1.0,
    appShortName: 'app',
    referralCommissionPercentage: 20,
    methods: {
      bkash: true,
      nagad: true,
      rocket: true,
      upay: true,
      binance: true
    },
    tasks: [],
    supportLinks: []
  });
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard' | 'settings' | 'withdrawals' | 'users' | 'admins'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser && tgUser.id.toString() === ADMIN_TG_ID) {
      setIsTgAdmin(true);
    }

    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      if (authUser?.email === ADMIN_EMAIL || isTgAdmin || isPasswordAuthenticated) {
        fetchSettings();
        fetchWithdrawals();
        fetchUsers();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [isTgAdmin, isPasswordAuthenticated]);

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'config');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as AppSettings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const q = query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const data: WithdrawalRequest[] = [];
      querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as WithdrawalRequest));
      setWithdrawals(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const data: UserData[] = [];
      querySnapshot.forEach((doc) => data.push({ ...doc.data() } as UserData));
      setAllUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'config'), settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/config');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateWithdrawalStatus = async (id: string, status: 'completed' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'withdrawals', id), { status });
      setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status } : w));
    } catch (err) {
      console.error(err);
    }
  };

  const handleBanUser = async (telegramId: string, isBanned: boolean) => {
    try {
      const q = query(collection(db, 'users'), where('telegramId', '==', telegramId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        await updateDoc(querySnapshot.docs[0].ref, { isBanned });
        setAllUsers(prev => prev.map(u => u.telegramId === telegramId ? { ...u, isBanned } : u));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1111') {
      setIsPasswordAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
    } else {
      alert('Incorrect password');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsPasswordAuthenticated(false);
    sessionStorage.removeItem('admin_auth');
  };

  const isAuthorized = (user?.email === ADMIN_EMAIL) || isTgAdmin || isPasswordAuthenticated;

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading Admin Panel...</div>;

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-slate-900 p-10 rounded-[2.5rem] border border-slate-800 space-y-6 w-full max-w-md shadow-2xl">
          <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/20">
            <Lock className="w-10 h-10 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-white text-center">Admin Login</h1>
          <input 
            type="password" 
            placeholder="Enter Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-all"
          />
          <button type="submit" className="w-full py-4 bg-blue-600 rounded-xl font-bold text-white hover:bg-blue-500 transition-all">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      <header className="sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
            <h1 className="text-lg font-bold">Admin Control</h1>
          </div>
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button onClick={() => setActiveAdminTab('dashboard')} className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeAdminTab === 'dashboard' ? "bg-blue-600 shadow-lg" : "text-slate-500")}>Dashboard</button>
            <button onClick={() => setActiveAdminTab('settings')} className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeAdminTab === 'settings' ? "bg-blue-600 shadow-lg" : "text-slate-500")}>Settings</button>
            <button onClick={() => setActiveAdminTab('withdrawals')} className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeAdminTab === 'withdrawals' ? "bg-blue-600 shadow-lg" : "text-slate-500")}>Withdrawals</button>
            <button onClick={() => setActiveAdminTab('users')} className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeAdminTab === 'users' ? "bg-blue-600 shadow-lg" : "text-slate-500")}>Users</button>
          </div>
          <button onClick={handleLogout} className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"><LogOut className="w-5 h-5 text-red-400" /></button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {activeAdminTab === 'dashboard' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
              <Users className="w-5 h-5 text-blue-400 mb-2" />
              <p className="text-xs text-slate-500 font-bold uppercase">Total Users</p>
              <p className="text-2xl font-bold">{allUsers.length}</p>
            </div>
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
              <Wallet className="w-5 h-5 text-emerald-400 mb-2" />
              <p className="text-xs text-slate-500 font-bold uppercase">Pending</p>
              <p className="text-2xl font-bold">{withdrawals.filter(w => w.status === 'pending').length}</p>
            </div>
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
              <DollarSign className="w-5 h-5 text-amber-400 mb-2" />
              <p className="text-xs text-slate-500 font-bold uppercase">Total Earnings</p>
              <p className="text-2xl font-bold">{allUsers.reduce((acc, curr) => acc + curr.earnings, 0).toFixed(2)}</p>
            </div>
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
              <Megaphone className="w-5 h-5 text-purple-400 mb-2" />
              <p className="text-xs text-slate-500 font-bold uppercase">Ads Watched</p>
              <p className="text-2xl font-bold">{allUsers.reduce((acc, curr) => acc + (curr.adsWatched || 0), 0)}</p>
            </div>
          </div>
        )}

        {activeAdminTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">App Settings</h2>
                <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-600 rounded-xl font-bold flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {success ? 'Saved!' : 'Save Changes'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">App Name</label>
                  <input value={settings.appName} onChange={e => setSettings({...settings, appName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Bot Token</label>
                  <input value={settings.botToken} onChange={e => setSettings({...settings, botToken: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Common Ad Reward</label>
                  <input type="number" value={settings.commonAdReward} onChange={e => setSettings({...settings, commonAdReward: parseFloat(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Unique Ad Reward</label>
                  <input type="number" value={settings.uniqueAdReward} onChange={e => setSettings({...settings, uniqueAdReward: parseFloat(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeAdminTab === 'withdrawals' && (
          <div className="space-y-4">
            {withdrawals.length === 0 ? (
              <div className="p-20 text-center text-slate-500 font-bold uppercase tracking-widest">No withdrawal requests</div>
            ) : (
              withdrawals.map(w => (
                <div key={w.id} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold">{w.username} ({w.method})</p>
                    <p className="text-sm text-slate-500">{w.details} • {settings.currencySymbol}{w.amount.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-600 uppercase font-bold mt-1">{new Date(w.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    {w.status === 'pending' ? (
                      <>
                        <button onClick={() => handleUpdateWithdrawalStatus(w.id, 'completed')} className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all"><Check className="w-5 h-5" /></button>
                        <button onClick={() => handleUpdateWithdrawalStatus(w.id, 'rejected')} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all"><X className="w-5 h-5" /></button>
                      </>
                    ) : (
                      <span className={cn("text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest", w.status === 'completed' ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>{w.status}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeAdminTab === 'users' && (
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search users by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div className="space-y-4">
              {allUsers
                .filter(u => u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || u.telegramId.includes(searchTerm))
                .slice(0, 50)
                .map(u => (
                <div key={u.telegramId} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={u.photoUrl} className="w-12 h-12 rounded-xl object-cover border border-slate-800" referrerPolicy="no-referrer" />
                    <div>
                      <p className="font-bold">{u.firstName}</p>
                      <p className="text-xs text-slate-500">@{u.username} • Balance: {settings.currencySymbol}{u.earnings.toFixed(4)}</p>
                      <p className="text-[10px] text-slate-600 font-bold uppercase">ID: {u.telegramId}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleBanUser(u.telegramId, !u.isBanned)}
                    className={cn("p-3 rounded-xl transition-all", u.isBanned ? "bg-red-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-red-500/10 hover:text-red-400")}
                  >
                    <Ban className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Loader2(props: any) {
  return <RefreshCw {...props} className={cn(props.className, "animate-spin")} />;
}
