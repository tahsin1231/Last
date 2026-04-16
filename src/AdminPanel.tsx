import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc, deleteDoc, query, orderBy, where, increment, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { AppSettings, Task, WithdrawalRequest, UserData, SupportLink } from './types';
import { ADMIN_EMAIL, ADMIN_TG_IDS, ADMIN_TG_ID } from './constants';
import { SplashScreen } from './components/SplashScreen';
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
  ShieldCheck,
  Headset,
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
  ListTodo,
  Edit2,
  Loader2,
  Facebook,
  Youtube,
  Instagram,
  Timer,
  MessageCircle
} from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AdminPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    appName: 'BD INCOME',
    appLogo: '',
    earningPerAd: 0.0004,
    userSharePercentage: 20,
    monetagZoneId: '',
    monetagSdkId: '',
    botUsername: '',
    botToken: '',
    newUserChannel: '',
    withdrawChannel: '',
    newUserMsgTemplate: 'Welcome to BD INCOME!',
    referReward: 5,
    commonAdReward: 0.1,
    uniqueAdReward: 1.0,
    commonAdsTarget: 10,
    popupNotice: '',
    homeNotice: '',
    uniqueAdNotice: 'Watch this unique ad to get a big reward!',
    currencySymbol: '৳',
    exchangeRate: 115,
    isWithdrawEnabled: true,
    minWithdrawAmount: 50,
    appShortName: 'BDI',
    referralCommissionPercentage: 10,
    methods: {
      bkash: true,
      nagad: true,
      rocket: true,
      upay: true,
      binance: true
    },
    tasks: [],
    supportLinks: [],
    dailyAdLimit: 0,
    adminIds: ['6465729271', '6045231271', '6990336990']
  });
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard' | 'settings' | 'withdrawals' | 'users' | 'admins'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isUserDataLoading, setIsUserDataLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState<string>('');
  const [newAdminId, setNewAdminId] = useState<string>('');
  const [newSupport, setNewSupport] = useState<Partial<SupportLink>>({ platform: 'telegram', name: '', link: '' });
  const [newTask, setNewTask] = useState<Partial<Task>>({ title: '', reward: 0, link: '', type: 'DEFAULT', isMustTask: false });

  const [error, setError] = useState<string | null>(null);
  const [loadTimeout, setLoadTimeout] = useState(false);

  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const tgUserId = tgUser?.id.toString();

  // Real-time listener for current user data
  useEffect(() => {
    if (user) {
      const userDocId = tgUserId || user.uid; // Fallback to Firebase UID if TG ID not available
      const unsubscribe = onSnapshot(doc(db, 'users', userDocId), (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data() as UserData);
        }
        setIsUserDataLoading(false);
      }, (err) => {
        console.error("Error fetching user data:", err);
        setIsUserDataLoading(false);
      });
      return () => unsubscribe();
    } else {
      setIsUserDataLoading(false);
    }
  }, [user, tgUserId]);

  // Authorization check
  const isAuthorized = 
    (user?.email === ADMIN_EMAIL) || 
    (tgUserId && (ADMIN_TG_IDS.includes(tgUserId) || (settings.adminIds && settings.adminIds.includes(tgUserId)))) ||
    (userData?.telegramId && (ADMIN_TG_IDS.includes(userData.telegramId) || (settings.adminIds && settings.adminIds.includes(userData.telegramId)))) ||
    (userData?.isAdmin === true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch settings regardless of authorization to allow dynamic admin check
  useEffect(() => {
    fetchSettings();
  }, []);

  // Fetch data when authorized
  useEffect(() => {
    if (isAuthorized) {
      fetchWithdrawals();
      
      // Real-time listener for all users
      const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        const data: UserData[] = [];
        snapshot.forEach((doc) => data.push({ ...doc.data() } as UserData));
        setAllUsers(data);
        setLoading(false);
      }, (err) => {
        console.error("Error fetching users:", err);
        setLoading(false);
      });
      
      return () => unsubscribe();
    } else if (!isUserDataLoading) {
      setLoading(false);
    }
  }, [isAuthorized, isUserDataLoading]);

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
      handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${id}`);
    }
  };

  const handleBanUser = async (telegramId: string, isBanned: boolean) => {
    try {
      await updateDoc(doc(db, 'users', telegramId), { isBanned });
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleUpdateBalance = async (telegramId: string) => {
    const amount = parseFloat(newBalance);
    if (isNaN(amount)) {
      alert('Please enter a valid number');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', telegramId), { earnings: amount });
      setEditingUser(null);
      setNewBalance('');
      alert('Balance updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Error updating balance');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setLoadTimeout(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading || isUserDataLoading) return <SplashScreen settings={settings} error={error} loadTimeout={loadTimeout} />;

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
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
            <button onClick={() => setActiveAdminTab('admins')} className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeAdminTab === 'admins' ? "bg-blue-600 shadow-lg" : "text-slate-500")}>Admins</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { fetchSettings(); fetchWithdrawals(); }} className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"><RefreshCw className="w-5 h-5" /></button>
            <button onClick={handleLogout} className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"><LogOut className="w-5 h-5 text-red-400" /></button>
          </div>
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
                  Save Changes
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">App Name</label>
                  <input type="text" value={settings.appName} onChange={e => setSettings({...settings, appName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">App Logo URL</label>
                  <input type="text" value={settings.appLogo} onChange={e => setSettings({...settings, appLogo: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Bot Username (without @)</label>
                  <input type="text" value={settings.botUsername} onChange={e => setSettings({...settings, botUsername: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Common Ad Reward ({settings.currencySymbol})</label>
                  <input type="number" step="0.0001" value={settings.commonAdReward} onChange={e => setSettings({...settings, commonAdReward: parseFloat(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Unique Ad Reward ({settings.currencySymbol})</label>
                  <input type="number" step="0.0001" value={settings.uniqueAdReward} onChange={e => setSettings({...settings, uniqueAdReward: parseFloat(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Ads Target for Unique Ad</label>
                  <input type="number" value={settings.commonAdsTarget} onChange={e => setSettings({...settings, commonAdsTarget: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Daily Ad Limit (0 = Unlimited)</label>
                  <input type="number" value={settings.dailyAdLimit} onChange={e => setSettings({...settings, dailyAdLimit: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Refer Reward ({settings.currencySymbol})</label>
                  <input type="number" step="0.01" value={settings.referReward} onChange={e => setSettings({...settings, referReward: parseFloat(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Headset className="w-5 h-5 text-blue-400" /> 
                    Support Channels
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-6 rounded-3xl border border-slate-800">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Platform</label>
                    <select 
                      value={newSupport.platform} 
                      onChange={e => setNewSupport({...newSupport, platform: e.target.value as SupportLink['platform']})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500"
                    >
                      <option value="telegram">Telegram</option>
                      <option value="facebook">Facebook</option>
                      <option value="youtube">YouTube</option>
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Label Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Official Channel" 
                      value={newSupport.name} 
                      onChange={e => setNewSupport({...newSupport, name: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Link URL</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="https://t.me/..." 
                        value={newSupport.link} 
                        onChange={e => setNewSupport({...newSupport, link: e.target.value})}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500"
                      />
                      <button 
                        onClick={() => {
                          if (newSupport.name && newSupport.link) {
                            const link: SupportLink = {
                              id: Date.now().toString(),
                              platform: newSupport.platform as SupportLink['platform'],
                              name: newSupport.name,
                              link: newSupport.link
                            };
                            setSettings({...settings, supportLinks: [...(settings.supportLinks || []), link]});
                            setNewSupport({ platform: 'telegram', name: '', link: '' });
                          }
                        }}
                        className="p-3 bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(settings.supportLinks || []).map(link => (
                    <div key={link.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-500/20 text-blue-400">
                          {link.platform === 'telegram' && <Send className="w-5 h-5" />}
                          {link.platform === 'facebook' && <Facebook className="w-5 h-5" />}
                          {link.platform === 'youtube' && <Youtube className="w-5 h-5" />}
                          {link.platform === 'instagram' && <Instagram className="w-5 h-5" />}
                          {link.platform === 'tiktok' && <MessageCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{link.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">{link.link}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSettings({...settings, supportLinks: settings.supportLinks.filter(l => l.id !== link.id)})}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-slate-800">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-purple-400" /> 
                  Task Management
                </h3>

                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Task Title</label>
                      <input 
                        type="text" 
                        value={newTask.title} 
                        onChange={e => setNewTask({...newTask, title: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500"
                        placeholder="e.g. Join Official Channel"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Reward ({settings.currencySymbol})</label>
                      <input 
                        type="number" 
                        value={newTask.reward} 
                        onChange={e => setNewTask({...newTask, reward: parseFloat(e.target.value)})}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Type</label>
                      <select 
                        value={newTask.type} 
                        onChange={e => setNewTask({...newTask, type: e.target.value as any})}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500"
                      >
                        <option value="DEFAULT">External Link</option>
                        <option value="TELEGRAM_CHANNEL">Telegram Member Check</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Task Link / Channel ID</label>
                      <input 
                        type="text" 
                        value={newTask.link} 
                        onChange={e => setNewTask({...newTask, link: e.target.value, channelId: newTask.type === 'TELEGRAM_CHANNEL' ? e.target.value : undefined})}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500"
                        placeholder={newTask.type === 'TELEGRAM_CHANNEL' ? "e.g. -10012345678" : "https://..."}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={newTask.isMustTask} 
                        onChange={e => setNewTask({...newTask, isMustTask: e.target.checked})}
                        className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-bold text-slate-400 group-hover:text-white transition-colors">Must-Do Task (Login Requirement)</span>
                    </label>
                    <button 
                      onClick={() => {
                        if (newTask.title && (newTask.link || newTask.channelId)) {
                          const task: Task = {
                            id: Date.now().toString(),
                            title: newTask.title || '',
                            reward: newTask.reward || 0,
                            link: newTask.link || '',
                            type: newTask.type as any,
                            channelId: newTask.channelId,
                            isMustTask: newTask.isMustTask
                          };
                          setSettings({...settings, tasks: [...(settings.tasks || []), task]});
                          setNewTask({ title: '', reward: 0, link: '', type: 'DEFAULT', isMustTask: false });
                        }
                      }}
                      className="ml-auto px-6 py-3 bg-purple-600 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add Task
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {(settings.tasks || []).map(task => (
                    <div key={task.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border font-bold text-xs", task.isMustTask ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-blue-500/10 border-blue-500/20 text-blue-500")}>
                          {task.type === 'TELEGRAM_CHANNEL' ? 'TG' : 'LNK'}
                        </div>
                        <div>
                          <p className="font-bold text-sm flex items-center gap-2">
                            {task.title}
                            {task.isMustTask && <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">REQUIRED</span>}
                          </p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Reward: {settings.currencySymbol}{task.reward}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSettings({...settings, tasks: settings.tasks.filter(t => t.id !== task.id)})}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-800">
                <h3 className="font-bold text-slate-400">Notice Settings</h3>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Home Notice (Scrolling)</label>
                  <input type="text" value={settings.homeNotice} onChange={e => setSettings({...settings, homeNotice: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Popup Notice</label>
                  <textarea value={settings.popupNotice} onChange={e => setSettings({...settings, popupNotice: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500 h-24" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeAdminTab === 'withdrawals' && (
          <div className="space-y-4">
            {withdrawals.length === 0 ? (
              <div className="bg-slate-900 p-10 rounded-3xl border border-slate-800 text-center text-slate-500">No withdrawal requests found.</div>
            ) : (
              withdrawals.map(w => (
                <div key={w.id} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase text-blue-400">{w.method}</span>
                      <span className="text-xs text-slate-500">• {new Date(w.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xl font-bold">{settings.currencySymbol}{w.amount.toFixed(2)}</p>
                    <p className="text-xs text-slate-400">Details: <span className="text-white font-mono">{w.details}</span></p>
                    <p className="text-[10px] text-slate-600 font-bold uppercase">User ID: {w.telegramId}</p>
                  </div>
                  <div className="flex items-center gap-2">
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

        {activeAdminTab === 'admins' && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Admin Management</h2>
                <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-600 rounded-xl font-bold flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter Telegram User ID..." 
                    value={newAdminId}
                    onChange={(e) => setNewAdminId(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500"
                  />
                  <button 
                    onClick={async () => {
                      if (newAdminId && settings.adminIds && !settings.adminIds.includes(newAdminId)) {
                        setSettings({ ...settings, adminIds: [...settings.adminIds, newAdminId] });
                        // Immediately grant admin status in user document
                        try {
                          await updateDoc(doc(db, 'users', newAdminId), { isAdmin: true });
                        } catch (err) {
                          console.error("Error granting admin status:", err);
                        }
                        setNewAdminId('');
                      } else if (newAdminId && !settings.adminIds) {
                        setSettings({ ...settings, adminIds: [newAdminId] });
                        try {
                          await updateDoc(doc(db, 'users', newAdminId), { isAdmin: true });
                        } catch (err) {
                          console.error("Error granting admin status:", err);
                        }
                        setNewAdminId('');
                      }
                    }}
                    className="px-6 bg-blue-600 rounded-xl font-bold"
                  >
                    Add Admin
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(settings.adminIds || []).map(id => (
                    <div key={id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                          <ShieldCheck className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className="font-mono font-bold">{id}</span>
                      </div>
                      {id !== ADMIN_TG_ID && (
                        <button 
                          onClick={async () => {
                            const newAdminIds = (settings.adminIds || []).filter(a => a !== id);
                            setSettings({ ...settings, adminIds: newAdminIds });
                            // Immediately revoke admin status in user document
                            try {
                              await updateDoc(doc(db, 'users', id), { isAdmin: false });
                            } catch (err) {
                              console.error("Error revoking admin status:", err);
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
                      <p className="font-bold">
                        {u.firstName} 
                        {(ADMIN_TG_IDS.includes(u.telegramId) || u.isAdmin) && (
                          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full ml-2">ADMIN</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">@{u.username} • Balance: {settings.currencySymbol}{u.earnings.toFixed(4)}</p>
                      <p className="text-[10px] text-slate-600 font-bold uppercase">ID: {u.telegramId} • Ref By: {u.referredBy || 'None'} • Total Ref: {u.referralCount || 0}</p>
                      
                      {editingUser === u.telegramId ? (
                        <div className="mt-2 flex items-center gap-2">
                          <input 
                            type="number" 
                            step="0.0001"
                            value={newBalance}
                            onChange={(e) => setNewBalance(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs w-24"
                            placeholder="New Balance"
                          />
                          <button onClick={() => handleUpdateBalance(u.telegramId)} className="p-1 bg-emerald-600 text-white rounded-lg"><Check className="w-3 h-3" /></button>
                          <button onClick={() => setEditingUser(null)} className="p-1 bg-slate-800 text-slate-400 rounded-lg"><X className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setEditingUser(u.telegramId);
                            setNewBalance(u.earnings.toString());
                          }}
                          className="mt-2 flex items-center gap-1 text-[10px] font-bold text-blue-400 uppercase hover:text-blue-300"
                        >
                          <Edit2 className="w-3 h-3" /> Edit Balance
                        </button>
                      )}
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
