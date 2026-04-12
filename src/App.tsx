import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  increment, 
  onSnapshot,
  query,
  where,
  getDocs,
  collection,
  arrayUnion,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { TelegramUser, UserData, AppSettings, WithdrawalRequest } from './types';
import { ADMIN_TG_IDS, ADMIN_TG_ID } from './constants';
import { SplashScreen } from './components/SplashScreen';
import { 
  Coins, 
  TrendingUp, 
  User as UserIcon, 
  PlayCircle, 
  History,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Home,
  ListTodo,
  Wallet,
  Check,
  Timer,
  Users,
  Copy,
  Share2,
  Smartphone,
  Bitcoin,
  ArrowLeft,
  X,
  Clock,
  CheckCircle,
  XCircle,
  Megaphone,
  Bell,
  Zap,
  Headset,
  Facebook,
  Youtube,
  Instagram,
  Send,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tab = 'home' | 'tasks' | 'refer' | 'profile';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [tgUser, setTgUser] = useState<TelegramUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [isWatching, setIsWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [verifyingTask, setVerifyingTask] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [referrals, setReferrals] = useState<UserData[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [showUniqueNotice, setShowUniqueNotice] = useState(false);
  const [isUniqueAd, setIsUniqueAd] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<'category' | 'method' | 'details' | 'amount' | 'confirm'>('category');
  const [withdrawCategory, setWithdrawCategory] = useState<'mobile' | 'crypto' | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [withdrawDetails, setWithdrawDetails] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [withdrawRequests, setWithdrawRequests] = useState<WithdrawalRequest[]>([]);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [taskTimers, setTaskTimers] = useState<Record<string, number>>({});
  const [loadTimeout, setLoadTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setLoadTimeout(true);
    }, 15000); // 15 seconds timeout
    return () => clearTimeout(timer);
  }, [loading]);

  const defaultSettings: AppSettings = {
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
  };

  const currentSettings = settings || defaultSettings;

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        console.log('Telegram WebApp ready');
      } catch (e) {
        console.error('Error initializing Telegram WebApp:', e);
      }
      
      const user = tg.initDataUnsafe?.user;
      if (user) {
        setTgUser(user);
      } else {
        // Fallback for development
        setTgUser({ id: 6465729271, first_name: 'Admin', username: 'admin' } as any);
      }
    } else {
      // Fallback for development outside Telegram
      setTgUser({ id: 6465729271, first_name: 'Admin', username: 'admin' } as any);
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error('Auth error:', err);
          setError("Authentication failed. Please check your internet.");
          setLoading(false);
        }
      }
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'config'), (docSnap) => {
      try {
        if (docSnap.exists()) {
          const data = docSnap.data() as AppSettings;
          console.log('Settings loaded from DB:', data);
          setSettings(data);
        } else {
          console.warn('Settings not found in DB, using defaults');
          setSettings(defaultSettings);
        }
      } catch (err) {
        console.error('Error processing settings:', err);
        setSettings(defaultSettings);
      } finally {
        setSettingsLoading(false);
      }
    }, (err) => {
      console.error('Settings snapshot error:', err);
      setSettings(defaultSettings);
      setSettingsLoading(false);
      setError("Failed to load app settings. Please check your connection.");
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSettings();
    };
  }, []);

  useEffect(() => {
    if (!user || settingsLoading || !tgUser) return;

    const userDocId = tgUser.id.toString();
    const unsubscribeUser = onSnapshot(doc(db, 'users', userDocId), async (docSnap) => {
      try {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserData;
          
          // Claim document for current Firebase UID if not claimed
          if (!data.firebaseUid && user?.uid) {
            await updateDoc(doc(db, 'users', userDocId), { firebaseUid: user.uid });
            data.firebaseUid = user.uid;
          }

          // Ensure isAdmin is updated if ID matches
          const isDynamicAdmin = settings?.adminIds?.includes(userDocId);
          const shouldBeAdmin = ADMIN_TG_IDS.includes(userDocId) || isDynamicAdmin;
          
          if (shouldBeAdmin && !data.isAdmin) {
            await updateDoc(doc(db, 'users', userDocId), { isAdmin: true });
            if (user?.uid) {
              await setDoc(doc(db, 'admins', user.uid), { 
                telegramId: userDocId,
                addedAt: new Date().toISOString(),
                role: ADMIN_TG_IDS.indexOf(userDocId) === 0 ? 'owner' : 'admin'
              });
            }
            data.isAdmin = true;
          } else if (!shouldBeAdmin && data.isAdmin) {
            await updateDoc(doc(db, 'users', userDocId), { isAdmin: false });
            if (user?.uid) {
              await deleteDoc(doc(db, 'admins', user.uid));
            }
            data.isAdmin = false;
          }
          
          // Reset daily counts if date changed
          const today = new Date().toISOString().split('T')[0];
          if (data.lastAdDate !== today) {
            await updateDoc(doc(db, 'users', userDocId), {
              dailyAdCount: 0,
              dailyEarnings: 0,
              lastAdDate: today
            });
          }

          // Handle referral reward if not already counted
          if (data.referredBy && !data.referralCounted && settings) {
            try {
              console.log('Processing referral for:', data.referredBy);
              // Direct lookup by Telegram ID (since it's now the doc ID)
              const referrerDocRef = doc(db, 'users', data.referredBy);
              const referrerSnap = await getDoc(referrerDocRef);
              
              if (referrerSnap.exists()) {
                const refReward = Number(settings.referReward) || 0.05;
                console.log(`Rewarding referrer ${data.referredBy} with ${refReward}`);
                
                await updateDoc(referrerDocRef, {
                  earnings: increment(refReward),
                  referralCount: increment(1)
                });
                await updateDoc(doc(db, 'users', userDocId), {
                  referralCounted: true
                });
                console.log('Referral successfully counted');
              } else {
                console.warn('Referrer not found in database:', data.referredBy);
              }
            } catch (err) {
              console.error('Referral processing error:', err);
            }
          }
          
          setUserData(data);
          setLoading(false);
        } else {
          const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
          const newUser: UserData = {
            firebaseUid: user.uid,
            telegramId: userDocId,
            username: tgUser.username || 'user',
            firstName: tgUser.first_name || 'User',
            photoUrl: tgUser.photo_url || '',
            earnings: 0,
            dailyEarnings: 0,
            adsWatched: 0,
            dailyAdCount: 0,
            currentAdCount: 0,
            referralCount: 0,
            referredBy: startParam || null,
            tasksCompleted: [],
            isBanned: false,
            isAdmin: userDocId === ADMIN_TG_ID,
            lastAdDate: new Date().toISOString().split('T')[0],
            lastAdWatchedAt: new Date().toISOString(),
            joinedAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', userDocId), newUser);
          // Snapshot will trigger again after setDoc
        }
      } catch (err) {
        console.error('User data processing error:', err);
        setError("Failed to process user data.");
        setLoading(false);
      }
    }, (err) => {
      console.error('User snapshot error:', err);
      handleFirestoreError(err, OperationType.GET, `users/${userDocId}`);
      setError("Database connection error. Please check your Firebase rules.");
      setLoading(false);
    });

    return () => unsubscribeUser();
  }, [user, tgUser, settingsLoading, settings]);

  // Removed automatic In-App Interstitial initialization to ensure ads only show on button click
  useEffect(() => {
    // Ad initialization logic moved or removed as per user request
  }, [settings]);

  const handleWatchAd = async () => {
    if (isWatching) return;
    
    if (!user) {
      setError("Authentication is still initializing. Please wait.");
      return;
    }

    if (settingsLoading || !settings) {
      setError("Settings are still loading. Please wait a few seconds.");
      return;
    }

    if (!userData) {
      setError("Fetching your account data... If this takes too long, click here to retry.");
      // Attempt to re-trigger auth if stuck
      if (!user) {
        signInAnonymously(auth).catch(e => console.error("Retry auth failed", e));
      }
      return;
    }

    if (settings.dailyAdLimit > 0 && userData.dailyAdCount >= settings.dailyAdLimit) {
      setError(`Daily ad limit reached (${settings.dailyAdLimit}). Please come back tomorrow!`);
      return;
    }
    
    const isNextUnique = userData.currentAdCount >= settings.commonAdsTarget;
    if (isNextUnique && !showUniqueNotice) {
      setShowUniqueNotice(true);
      return;
    }
    
    const reward = Number(isNextUnique ? settings.uniqueAdReward : settings.commonAdReward) || 0;
    console.log(`Ad reward calculated: ${reward} (Unique: ${isNextUnique})`);
    
    setIsWatching(true);
    setIsUniqueAd(isNextUnique);
    setShowUniqueNotice(false);

    const sdkId = settings.monetagSdkId || `show_${settings.monetagZoneId}`;
    let showAd = (window as any)[sdkId];
    
    if (typeof showAd !== 'function') {
      showAd = (window as any).show_rewarded || (window as any).show_ad;
    }

    // Safety timeout to reset state if ad fails to trigger callback within 15 seconds
    const timeoutId = setTimeout(() => {
      setIsWatching(false);
      setIsUniqueAd(false);
    }, 15000);
    
    if (typeof showAd === 'function') {
      try {
        console.log('Attempting to show ad with ID:', sdkId);
        
        const adPromise = showAd();
        
        if (adPromise && typeof adPromise.then === 'function') {
          adPromise.then(async () => {
            clearTimeout(timeoutId);
            
            const userRef = doc(db, 'users', tgUser!.id.toString());
            await updateDoc(userRef, {
              earnings: increment(reward),
              dailyEarnings: increment(reward),
              adsWatched: increment(1),
              dailyAdCount: increment(1),
              currentAdCount: isNextUnique ? 0 : increment(1),
              lastAdWatchedAt: new Date().toISOString()
            });
            setIsWatching(false);
            setIsUniqueAd(false);
          }).catch((err: any) => {
            console.error('Ad playback error, trying pop fallback:', err);
            const popPromise = showAd('pop');
            if (popPromise && typeof popPromise.then === 'function') {
              popPromise.then(async () => {
                clearTimeout(timeoutId);
                const userRef = doc(db, 'users', tgUser!.id.toString());
                await updateDoc(userRef, {
                  earnings: increment(reward),
                  dailyEarnings: increment(reward),
                  adsWatched: increment(1),
                  dailyAdCount: increment(1),
                  currentAdCount: isNextUnique ? 0 : increment(1),
                  lastAdWatchedAt: new Date().toISOString()
                });
                setIsWatching(false);
                setIsUniqueAd(false);
              }).catch((err2: any) => {
                clearTimeout(timeoutId);
                console.error('Ad fallback error:', err2);
                setError("Ad failed to play. Monetag might not have ads available for you right now.");
                setIsWatching(false);
                setIsUniqueAd(false);
              });
            } else {
              // Fallback for non-promise return
              clearTimeout(timeoutId);
              setIsWatching(false);
              setIsUniqueAd(false);
            }
          });
        } else {
          // If it doesn't return a promise, we assume it showed the ad or failed silently
          // We'll give the reward anyway or just reset state
          console.log('Ad function called but did not return a promise');
          clearTimeout(timeoutId);
          // For safety, we'll just reset state after a short delay
          setTimeout(() => {
            setIsWatching(false);
            setIsUniqueAd(false);
          }, 2000);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('Ad invocation error:', err);
        setError("Could not start ad. Please check your internet or AdBlocker.");
        setIsWatching(false);
        setIsUniqueAd(false);
      }
    } else {
      clearTimeout(timeoutId);
      setError("Ad system (Monetag) is not responding. Please refresh the app or check your Monetag ID.");
      setIsWatching(false);
      setIsUniqueAd(false);
    }
  };

  const handleTaskClick = (task: any) => {
    if (userData?.tasksCompleted?.includes(task.id)) return;
    window.open(task.link, '_blank');
    setTaskTimers(prev => ({ ...prev, [task.id]: 10 }));
    const interval = setInterval(() => {
      setTaskTimers(prev => {
        if (prev[task.id] <= 1) {
          clearInterval(interval);
          return { ...prev, [task.id]: 0 };
        }
        return { ...prev, [task.id] : (prev[task.id] || 0) - 1 };
      });
    }, 1000);
  };

  const handleTaskVerify = async (task: any) => {
    if (!user) return;
    setVerifyingTask(task.id);
    try {
      await updateDoc(doc(db, 'users', tgUser!.id.toString()), {
        earnings: increment(task.reward),
        tasksCompleted: arrayUnion(task.id)
      });
      alert('Task verified successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setVerifyingTask(null);
    }
  };

  const handleWithdraw = () => {
    if (!currentSettings.isWithdrawEnabled) {
      alert('Withdrawal is currently disabled by admin.');
      return;
    }
    if (userData && userData.earnings < currentSettings.minWithdrawAmount) {
      setError(`Minimum withdrawal amount is ${currentSettings.currencySymbol}${currentSettings.minWithdrawAmount}`);
      return;
    }
    setWithdrawStep('category');
    setWithdrawCategory(null);
    setSelectedMethod(null);
    setWithdrawDetails('');
    setWithdrawAmount(userData?.earnings.toString() || '0');
    setIsWithdrawModalOpen(true);
  };

  const submitWithdraw = async () => {
    if (!user || !tgUser || !selectedMethod || !withdrawDetails || !withdrawAmount) return;
    const amount = parseFloat(withdrawAmount);
    if (amount > (userData?.earnings || 0)) {
      alert('Insufficient balance');
      return;
    }
    setIsSubmittingWithdraw(true);
    try {
      const withdrawRef = doc(collection(db, 'withdrawals'));
      const userDocId = tgUser.id.toString();
      
      await setDoc(withdrawRef, {
        userId: user.uid,
        telegramId: userDocId,
        username: userData?.username,
        amount,
        method: selectedMethod,
        details: withdrawDetails,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'users', userDocId), {
        earnings: increment(-amount)
      });

      setIsWithdrawModalOpen(false);
      alert('Withdrawal request submitted successfully!');
    } catch (err) {
      console.error('Withdrawal error:', err);
      alert('Failed to submit withdrawal. Please try again.');
      handleFirestoreError(err, OperationType.CREATE, 'withdrawals');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'profile' && user) {
      const q = query(collection(db, 'withdrawals'), where('userId', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data: WithdrawalRequest[] = [];
        snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as WithdrawalRequest));
        setWithdrawRequests(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      });
      return () => unsubscribe();
    }
  }, [activeTab, user]);

  if (loading || settingsLoading) {
    return <SplashScreen settings={currentSettings} error={error} loadTimeout={loadTimeout} />;
  }

  if (userData?.isBanned) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Account Banned</h1>
          <p className="text-slate-400">Your account has been suspended for violating terms.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-blue-500/30 pb-24">
      <header className="px-6 py-6 flex flex-col gap-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="font-black text-lg leading-tight bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
            {currentSettings.appName}
          </h1>
          <div className="flex items-center gap-3 bg-slate-800/50 p-1.5 pr-4 rounded-2xl border border-slate-700">
            {tgUser?.photo_url ? <img src={tgUser.photo_url} className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" /> : <UserIcon className="w-4 h-4 text-blue-400" />}
            <span className="text-[10px] font-bold text-white">{tgUser?.first_name || 'Guest'}</span>
          </div>
        </div>
        {currentSettings.homeNotice && (
          <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-2 overflow-hidden">
            <motion.div initial={{ x: '100%' }} animate={{ x: '-100%' }} transition={{ duration: 15, repeat: Infinity, ease: 'linear' }} className="whitespace-nowrap text-[10px] font-bold text-blue-200 uppercase tracking-wider">
              {currentSettings.homeNotice}
            </motion.div>
          </div>
        )}
      </header>

      <main className="p-6 max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                <p className="text-blue-100/80 text-xs font-bold tracking-[0.2em] uppercase mb-2">Your Balance</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black tracking-tighter">{currentSettings.currencySymbol}{userData?.earnings.toFixed(4) || '0.0000'}</span>
                </div>
                <div className="mt-8 flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">{userData?.adsWatched || 0}</span>
                    <span className="text-[10px] font-bold text-blue-200/60 uppercase tracking-widest">Total Ads</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">{userData?.dailyAdCount || 0}/{currentSettings.dailyAdLimit || '∞'}</span>
                    <span className="text-[10px] font-bold text-blue-200/60 uppercase tracking-widest">Today</span>
                  </div>
                </div>
              </div>

              <section className="space-y-4">
                <button onClick={handleWatchAd} disabled={isWatching} className={cn("w-full py-6 rounded-[2rem] flex items-center justify-center gap-3 transition-all duration-300 font-bold text-lg shadow-xl", isWatching ? "bg-slate-800 text-slate-500" : "bg-white text-slate-900")}>
                  {isWatching ? <><Loader2 className="w-6 h-6 animate-spin" /> {isUniqueAd ? 'Registering...' : 'Watching Ad...'}</> : <><PlayCircle className="w-6 h-6" /> {userData && userData.currentAdCount >= currentSettings.commonAdsTarget ? 'Watch Unique Ad' : 'Watch Ad & Earn'}</>}
                </button>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(((userData?.currentAdCount || 0) / currentSettings.commonAdsTarget) * 100, 100)}%` }} className="h-full bg-blue-500" />
                </div>
              </section>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem]">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ad Reward</p>
                  <p className="text-xl font-bold">{currentSettings.currencySymbol}{currentSettings.commonAdReward.toFixed(2)}</p>
                  <p className="text-[8px] text-slate-600 font-bold uppercase mt-1">Unique: {currentSettings.currencySymbol}{currentSettings.uniqueAdReward.toFixed(2)}</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem]">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Today</p>
                  <p className="text-xl font-bold">{currentSettings.currencySymbol}{(userData?.dailyEarnings || 0).toFixed(4)}</p>
                </div>
              </div>

              {/* Animated Logo */}
              <div className="flex flex-col items-center justify-center py-10 relative">
                <div className="relative">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="absolute -inset-4 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full blur-xl opacity-20" />
                  <div className="relative w-40 h-40 rounded-[3rem] overflow-hidden border-4 border-slate-800 bg-slate-900 shadow-2xl z-10">
                    {currentSettings.appLogo ? <img src={currentSettings.appLogo} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <Send className="w-16 h-16 text-blue-500" />}
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-black tracking-tighter text-white uppercase italic">{currentSettings.appName}</h3>
              </div>
            </motion.div>
          )}

          {activeTab === 'tasks' && (
            <motion.div key="tasks" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
              <h2 className="text-2xl font-black tracking-tight">Available Tasks</h2>
              <div className="space-y-4">
                {currentSettings.tasks.filter(t => !userData?.tasksCompleted?.includes(t.id)).map(task => (
                  <div key={task.id} className="bg-slate-900/50 border border-slate-800 p-5 rounded-[2rem] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center">
                        {task.logoUrl ? <img src={task.logoUrl} className="w-8 h-8 object-contain" referrerPolicy="no-referrer" /> : <Send className="w-6 h-6 text-blue-500" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{task.title}</p>
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">+{currentSettings.currencySymbol}{task.reward.toFixed(2)}</p>
                      </div>
                    </div>
                    {taskTimers[task.id] !== undefined ? (
                      <button onClick={() => handleTaskVerify(task)} disabled={verifyingTask === task.id || taskTimers[task.id] > 0} className={cn("px-4 py-2 rounded-xl font-bold text-[10px] uppercase", taskTimers[task.id] > 0 ? "bg-slate-800 text-slate-500" : "bg-emerald-600 text-white")}>
                        {verifyingTask === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : taskTimers[task.id] > 0 ? `${taskTimers[task.id]}s` : 'Verify'}
                      </button>
                    ) : (
                      <button onClick={() => handleTaskClick(task)} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase">Go</button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'refer' && (
            <motion.div key="refer" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                <h2 className="text-3xl font-black tracking-tighter">Invite & Earn</h2>
                <p className="text-indigo-100/60 text-[10px] font-bold uppercase tracking-widest mt-1">Get {currentSettings.currencySymbol}{currentSettings.referReward.toFixed(4)} per referral</p>
                <div className="mt-6 flex flex-col">
                  <span className="text-2xl font-bold">{userData?.referralCount || 0}</span>
                  <span className="text-[10px] font-bold text-indigo-200/60 uppercase tracking-widest">Total Referrals</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-3xl flex items-center gap-3">
                  <input readOnly value={`https://t.me/${currentSettings.botUsername}?startapp=${userData?.telegramId}`} className="bg-transparent border-none text-xs font-medium text-slate-300 w-full focus:outline-none" />
                  <button onClick={() => {
                    const link = `https://t.me/${currentSettings.botUsername}?startapp=${userData?.telegramId}`;
                    navigator.clipboard.writeText(link).then(() => alert('Referral link copied!'));
                  }} className="p-2 bg-blue-600/10 text-blue-400 rounded-xl"><Copy className="w-4 h-4" /></button>
                </div>
                <button onClick={() => {
                  const link = `https://t.me/${currentSettings.botUsername}?startapp=${userData?.telegramId}`;
                  window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}`, '_blank');
                }} className="w-full py-4 bg-indigo-600 rounded-[2rem] font-bold shadow-xl flex items-center justify-center gap-2"><Share2 className="w-4 h-4" /> Share</button>
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
              <div className="text-center space-y-4">
                {tgUser?.photo_url ? <img src={tgUser.photo_url} className="w-24 h-24 rounded-[2.5rem] border-4 border-blue-500/20 mx-auto shadow-2xl" referrerPolicy="no-referrer" /> : <div className="w-24 h-24 rounded-[2.5rem] bg-blue-500/10 flex items-center justify-center border-4 border-blue-500/20 mx-auto"><UserIcon className="w-10 h-10 text-blue-400" /></div>}
                <h2 className="text-2xl font-black tracking-tight">{tgUser?.first_name || 'User'}</h2>
              </div>
              <div className="grid gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem] flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Available Balance</p>
                    <p className="text-xl font-bold">{currentSettings.currencySymbol}{userData?.earnings.toFixed(4) || '0.0000'}</p>
                  </div>
                </div>
                {(tgUser?.id.toString() === ADMIN_TG_ID || userData?.isAdmin) && (
                  <Link to="/admin" className="w-full py-5 bg-slate-800 rounded-[2rem] font-bold flex items-center justify-center gap-2 border border-slate-700">
                    <ShieldAlert className="w-5 h-5 text-blue-400" /> Admin Panel
                  </Link>
                )}
                <button onClick={() => setIsSupportOpen(true)} className="w-full py-5 bg-slate-800 rounded-[2rem] font-bold flex items-center justify-center gap-2 border border-slate-700"><Headset className="w-5 h-5 text-emerald-400" /> Support Center</button>
                <button onClick={handleWithdraw} className="w-full py-5 bg-blue-600 rounded-[2rem] font-bold shadow-xl">Withdraw Funds</button>
              </div>
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] px-1">History</h3>
                <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] overflow-hidden">
                  {withdrawRequests.length === 0 ? (
                    <div className="p-10 text-center text-slate-500 font-medium">No withdrawal history.</div>
                  ) : (
                    withdrawRequests.map(req => (
                      <div key={req.id} className="p-5 flex items-center justify-between border-b border-slate-800 last:border-0">
                        <div>
                          <p className="font-bold text-sm uppercase">{req.method}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">{new Date(req.createdAt).toLocaleDateString()} · {currentSettings.currencySymbol}{req.amount.toFixed(2)}</p>
                        </div>
                        <span className={cn("text-[8px] font-bold px-2 py-1 rounded-full uppercase tracking-widest", req.status === 'completed' ? "bg-emerald-500/10 text-emerald-400" : req.status === 'rejected' ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400")}>{req.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Support Modal */}
      <AnimatePresence>
        {isSupportOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold">Support Center</h3>
                <button onClick={() => setIsSupportOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-6 space-y-4">
                {currentSettings.supportLinks.length === 0 ? (
                  <div className="text-center py-10">
                    <MessageCircle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">No support links available</p>
                  </div>
                ) : (
                  currentSettings.supportLinks.map(link => (
                    <button key={link.id} onClick={() => window.open(link.link, '_blank')} className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-2xl flex items-center justify-between group hover:border-blue-500/50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-900 rounded-xl text-blue-400">
                          {link.platform === 'telegram' && <Send className="w-5 h-5" />}
                          {link.platform === 'facebook' && <Facebook className="w-5 h-5" />}
                          {link.platform === 'youtube' && <Youtube className="w-5 h-5" />}
                          {link.platform === 'instagram' && <Instagram className="w-5 h-5" />}
                          {link.platform === 'tiktok' && <MessageCircle className="w-5 h-5" />}
                        </div>
                        <span className="font-bold text-sm">{link.name}</span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-all" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Withdrawal Modal */}
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold">Withdraw Funds</h3>
                <button onClick={() => setIsWithdrawModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-6 space-y-6">
                {withdrawStep === 'category' && (
                  <div className="grid grid-cols-1 gap-4">
                    <button onClick={() => { setWithdrawCategory('mobile'); setWithdrawStep('method'); }} className="p-6 bg-slate-800/50 border border-slate-700 rounded-3xl flex items-center gap-4 hover:border-blue-500/50 transition-all text-left group">
                      <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all"><Smartphone className="w-6 h-6" /></div>
                      <div><p className="font-bold">Mobile Banking</p><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Bkash, Nagad, Rocket, Upay</p></div>
                    </button>
                    <button onClick={() => { setWithdrawCategory('crypto'); setWithdrawStep('method'); }} className="p-6 bg-slate-800/50 border border-slate-700 rounded-3xl flex items-center gap-4 hover:border-blue-500/50 transition-all text-left group">
                      <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-all"><Bitcoin className="w-6 h-6" /></div>
                      <div><p className="font-bold">Cryptocurrency</p><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Binance ID</p></div>
                    </button>
                  </div>
                )}
                {withdrawStep === 'method' && (
                  <div className="grid grid-cols-2 gap-4">
                    {withdrawCategory === 'mobile' ? (
                      ['bkash', 'nagad', 'rocket', 'upay'].map(m => currentSettings.methods[m as keyof typeof currentSettings.methods] && (
                        <button key={m} onClick={() => { setSelectedMethod(m); setWithdrawStep('details'); }} className="p-4 bg-slate-800/50 border border-slate-700 rounded-2xl hover:border-blue-500/50 transition-all font-bold text-sm uppercase">{m}</button>
                      ))
                    ) : (
                      <button onClick={() => { setSelectedMethod('binance'); setWithdrawStep('details'); }} className="p-4 bg-slate-800/50 border border-slate-700 rounded-2xl hover:border-amber-500/50 transition-all font-bold text-sm col-span-2 uppercase">Binance</button>
                    )}
                  </div>
                )}
                {withdrawStep === 'details' && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{selectedMethod === 'binance' ? 'Binance ID' : `${selectedMethod} Number`}</label>
                    <input type="text" value={withdrawDetails} onChange={e => setWithdrawDetails(e.target.value)} placeholder="Enter details" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 focus:outline-none focus:border-blue-500 transition-all" />
                    <button onClick={() => setWithdrawStep('amount')} disabled={!withdrawDetails} className="w-full py-4 bg-blue-600 disabled:bg-slate-800 rounded-2xl font-bold transition-all">Next</button>
                  </div>
                )}
                {withdrawStep === 'amount' && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Amount (Min: {currentSettings.currencySymbol}{currentSettings.minWithdrawAmount})</label>
                    <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 focus:outline-none focus:border-blue-500 transition-all font-bold" />
                    <button onClick={submitWithdraw} disabled={isSubmittingWithdraw} className="w-full py-4 bg-blue-600 disabled:bg-slate-800 rounded-2xl font-bold transition-all flex items-center justify-center gap-2">
                      {isSubmittingWithdraw ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Withdrawal'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-6 left-6 right-6 bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] p-2 flex items-center justify-around shadow-2xl z-40">
        <button onClick={() => setActiveTab('home')} className={cn("flex flex-col items-center gap-1 px-4 py-3 rounded-3xl transition-all", activeTab === 'home' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-slate-300")}>
          <Home className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-widest">Home</span>
        </button>
        <button onClick={() => setActiveTab('tasks')} className={cn("flex flex-col items-center gap-1 px-4 py-3 rounded-3xl transition-all", activeTab === 'tasks' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-slate-300")}>
          <ListTodo className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-widest">Tasks</span>
        </button>
        <button onClick={() => setActiveTab('refer')} className={cn("flex flex-col items-center gap-1 px-4 py-3 rounded-3xl transition-all", activeTab === 'refer' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-slate-300")}>
          <Users className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-widest">Refer</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={cn("flex flex-col items-center gap-1 px-4 py-3 rounded-3xl transition-all", activeTab === 'profile' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-slate-300")}>
          <UserIcon className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-widest">Profile</span>
        </button>
      </nav>

      <AnimatePresence>
        {showPopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 max-w-sm w-full space-y-6 shadow-2xl">
              <div className="flex items-center gap-3"><Bell className="w-6 h-6 text-blue-400" /><h2 className="text-xl font-bold tracking-tight">Notice</h2></div>
              <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{currentSettings.popupNotice}</p>
              <button onClick={() => setShowPopup(false)} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold transition-all shadow-xl shadow-blue-600/20">Got it!</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-6 left-6 right-6 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 backdrop-blur-xl z-50">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" /><p className="text-sm font-medium text-red-200">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-xs font-bold text-red-400 uppercase">Dismiss</button>
        </motion.div>
      )}
    </div>
  );
}
