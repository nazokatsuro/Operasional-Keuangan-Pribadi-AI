/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Briefcase, TrendingUp, TrendingDown, ArrowUpRight, DollarSign, Wallet, 
  Target, Award, HeartPulse, Sparkles, ChevronRight, Utensils, Car, ShoppingBag, 
  Wifi, HelpCircle, ShieldCheck, Smartphone, Info, Calendar, Settings, BarChart2,
  FileSpreadsheet, Plus, AlertCircle, Edit2, Trash2, Copy, Download, Upload,
  RefreshCw, X, Menu, Bell, Search, LogOut, Sun, Moon, FileText, Instagram, Layers, GripVertical, ChevronUp, ChevronDown
} from 'lucide-react';

// Modular View Imports
import { DashboardView } from './components/DashboardView';
import { TransaksiView } from './components/TransaksiView';
import { SumberUangView } from './components/SumberUangView';
import { AsetView } from './components/AsetView';
import { HutangPiutangView } from './components/HutangPiutangView';
import { KalenderView } from './components/KalenderView';
import { StatistikView } from './components/StatistikView';
import { AiInputView } from './components/AiInputView';

// Emergency Fund Planner Import
import { EmergencyFundPlannerView, EmergencyFundConfig } from './components/EmergencyFundPlannerView';

// UPGRADE PREMIUM VIEWS
import { FinancialGoalsView } from './components/FinancialGoalsView';
import { BudgetPlannerView } from './components/BudgetPlannerView';
import { CashflowForecastView } from './components/CashflowForecastView';
import { RecurringTransactionView } from './components/RecurringTransactionView';
import { FinancialHealthView } from './components/FinancialHealthView';
import { NotificationCenterView } from './components/NotificationCenterView';
import { AdvancedStatisticsView } from './components/AdvancedStatisticsView';

import { Goal, RecurringTransaction, BillReminder, FinancialNotification } from './types';

// Helper Utilities Imports
import { 
  Transaction, Account, Asset, Debt,
  DEFAULT_TRANSACTIONS, DEFAULT_ACCOUNTS, DEFAULT_ASSETS, DEFAULT_DEBTS,
  formatCurrency, getFriendlyGreeting, EXPENSE_CATEGORIES
} from './utils/financeHelper';
import { ParsedTransaction, parseFinanceText } from './utils/aiParser';

import { 
  signInWithGoogleDrive, 
  logoutGDrive, 
  searchDraftFile, 
  downloadDraftFile, 
  saveDraftFile, 
  getGDriveAccessToken,
  DraftPayload,
  auth,
  db
} from './utils/googleDriveHelper';
import { doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // 1. STATE MANAGEMENT (LOADED FROM LOCALSTORAGE WITH DEFAULT POPULATION FALLBACK)
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('LKP_TRANSACTIONS');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading LKP_TRANSACTIONS', e);
    }
    return DEFAULT_TRANSACTIONS;
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const saved = localStorage.getItem('LKP_ACCOUNTS');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading LKP_ACCOUNTS', e);
    }
    return DEFAULT_ACCOUNTS;
  });

  const [assets, setAssets] = useState<Asset[]>(() => {
    try {
      const saved = localStorage.getItem('LKP_ASSETS');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading LKP_ASSETS', e);
    }
    return DEFAULT_ASSETS;
  });

  const [debts, setDebts] = useState<Debt[]>(() => {
    try {
      const saved = localStorage.getItem('LKP_DEBTS');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading LKP_DEBTS', e);
    }
    return DEFAULT_DEBTS;
  });

interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  dashboardName: string;
  currency: string;
  baseCurrency: string;
  accentColor: string;
  themeMode: string;
}

  // User Profile configuration settings
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const defaultProfile: UserProfile = {
      name: 'Rian Wijaya',
      email: 'IG : nomadenapp',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      dashboardName: 'My Premium Wealth Hub',
      currency: 'IDR',
      baseCurrency: 'IDR',
      accentColor: '#7c5cff', // Default Violet
      themeMode: 'dark',
    };
    try {
      const saved = localStorage.getItem('LKP_USER_PROFILE');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const merged = { ...defaultProfile, ...parsed };
          if (merged.email === 'rian@fintechpremium.ai' || merged.email === 'nomadenapp@gmail.com') {
            merged.email = 'IG : nomadenapp';
          }
          return merged;
        }
      }
    } catch (e) {
      console.error('Error loading LKP_USER_PROFILE', e);
    }
    return defaultProfile;
  });

  // Sidebar / Mobile Navigation tab state
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // AI Smart input interaction visual indicator badge state
  const [aiSmartTried, setAiSmartTried] = useState<boolean>(() => {
    return localStorage.getItem('LKP_AI_SMART_TRIED') === 'true';
  });

  const markAiSmartTried = () => {
    setAiSmartTried(true);
    localStorage.setItem('LKP_AI_SMART_TRIED', 'true');
  };

  // Category Bulanan Budget Threshold State
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('LKP_CATEGORY_BUDGETS');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.error('Error loading LKP_CATEGORY_BUDGETS', e);
    }
    // Default categories with budgets
    return {
      'Makan': 3000000,
      'Transport': 1500000,
      'Belanja': 2000000,
      'Internet': 500000,
      'Listrik': 1000000,
      'Langganan': 300000,
      'Hiburan': 1000000,
      'Kesehatan': 1000000,
      'Lainnya': 1000000,
      'Operasional Workshop': 5000000,
      'Vendor Tambahan': 3000000,
    };
  });

  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  // Toast premium alerts notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // Clear App data verification lock popups
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // --- PREMIUM ADVANCED FINANCIAL SUITE STATES ---
  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const saved = localStorage.getItem('LKP_GOALS');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [
      { id: 'g_1', name: 'Dana Darurat 6Bln', category: 'Dana Darurat', targetAmount: 24000000, currentAmount: 8500000, deadline: '2026-12-31', color: '#7c5cff' },
      { id: 'g_2', name: 'Beli Laptop Pro', category: 'Target Custom', targetAmount: 18000000, currentAmount: 12000000, deadline: '2026-08-31', color: '#10b981' }
    ];
  });

  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('LKP_RECURRING');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [
      { id: 'r_1', name: 'Spotify Premium Family', nominal: 89000, category: 'Langganan', source: 'GoPay', frequency: 'Bulanan', status: 'Aktif' },
      { id: 'r_2', name: 'Netflix Ultra HD', nominal: 186000, category: 'Langganan', source: 'Jago', frequency: 'Bulanan', status: 'Aktif' },
      { id: 'r_3', name: 'Gaji Bulanan Utama', nominal: 15000000, category: 'Gaji', source: 'BCA', frequency: 'Bulanan', status: 'Aktif' }
    ];
  });

  const [billReminders, setBillReminders] = useState<BillReminder[]>(() => {
    try {
      const saved = localStorage.getItem('LKP_REMINDERS');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [
      { id: 'rem_1', name: 'Internet Rumah Biznet', nominal: 375000, dueDate: '2026-06-05', category: 'Internet', reminderPeriod: 'H-3' },
      { id: 'rem_2', name: 'BPJS Kesehatan Mandiri', nominal: 150000, dueDate: '2026-06-10', category: 'Kesehatan', reminderPeriod: 'H-1' }
    ];
  });

  const [notifications, setNotifications] = useState<FinancialNotification[]>(() => {
    try {
      const saved = localStorage.getItem('LKP_NOTIFICATIONS');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [
      { id: 'n_1', title: 'Peringatan Anggaran Makan hampir Habis!', message: 'Kategori Makan telah menyerap 85% dari batas bulanan Anda.', category: 'Budget Warning', date: '2026-05-30', isRead: false },
      { id: 'n_2', title: 'Saran Pertumbuhan Dana Darurat', message: 'Anda dapat mencapai target celengan Dana Darurat dalam 5 bulan dengan menabung Rp1.000.000/bln.', category: 'AI Recommendation', date: '2026-05-29', isRead: false }
    ];
  });

  useEffect(() => {
    localStorage.setItem('LKP_GOALS', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('LKP_RECURRING', JSON.stringify(recurringTransactions));
  }, [recurringTransactions]);

  useEffect(() => {
    localStorage.setItem('LKP_REMINDERS', JSON.stringify(billReminders));
  }, [billReminders]);

  useEffect(() => {
    localStorage.setItem('LKP_NOTIFICATIONS', JSON.stringify(notifications));
  }, [notifications]);

  // Emergency Fund State and Persistence
  const [emergencyConfig, setEmergencyConfig] = useState<EmergencyFundConfig>(() => {
    const defaultVal: EmergencyFundConfig = {
      periodMonths: 3,
      statusKey: 'lajang',
      customMonths: 3,
      selectedSources: ['acc-1', 'acc-2', 'acc-6', 'acc-11'], // select BCA, Mandiri, Jago, Cash by default
      manualMonthlySavings: 1500000,
      contributions: [
        { id: 'contrib-1', date: '2026-05-15', amount: 2000000, note: 'Sisa uang jajan awal bulan', source: 'BCA' },
        { id: 'contrib-2', date: '2026-05-28', amount: 1000000, note: 'Rutin bulanan mandiri', source: 'Mandiri' }
      ]
    };
    try {
      const saved = localStorage.getItem('LKP_EMERGENCY_FUND_CONFIG');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading LKP_EMERGENCY_FUND_CONFIG', e);
    }
    return defaultVal;
  });

  useEffect(() => {
    localStorage.setItem('LKP_EMERGENCY_FUND_CONFIG', JSON.stringify(emergencyConfig));
  }, [emergencyConfig]);

  // --- CUSTOM SIDEBAR MENU ORDER STATE ---
  const DEFAULT_MENU_ORDER = [
    'dashboard',
    'transactions',
    'emergency_fund',
    'goals',
    'budget',
    'forecast',
    'autopay',
    'health',
    'notifications_tab',
    'accounts',
    'assets',
    'debts',
    'calendar',
    'statistics'
  ];

  const [sidebarOrder, setSidebarOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('LKP_SIDEBAR_ORDER');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validIds = parsed.filter(id => DEFAULT_MENU_ORDER.includes(id));
          const missing = DEFAULT_MENU_ORDER.filter(id => !validIds.includes(id));
          return [...validIds, ...missing];
        }
      }
    } catch (e) {
      console.error('Error loading LKP_SIDEBAR_ORDER', e);
    }
    return DEFAULT_MENU_ORDER;
  });

  const [isEditingSidebar, setIsEditingSidebar] = useState<boolean>(false);
  const [tempSidebarOrder, setTempSidebarOrder] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: any, index: number) => {
    if (e && e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
    setDraggedIndex(index);
  };

  const handleDragOver = (e: any, index: number) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (draggedIndex === null || draggedIndex === index) return;
    const newOrder = [...tempSidebarOrder];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);
    setTempSidebarOrder(newOrder);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const moveMenuUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...tempSidebarOrder];
    const item = newOrder[index];
    newOrder.splice(index, 1);
    newOrder.splice(index - 1, 0, item);
    setTempSidebarOrder(newOrder);
  };

  const moveMenuDown = (index: number) => {
    if (index >= tempSidebarOrder.length - 1) return;
    const newOrder = [...tempSidebarOrder];
    const item = newOrder[index];
    newOrder.splice(index, 1);
    newOrder.splice(index + 1, 0, item);
    setTempSidebarOrder(newOrder);
  };
  
  // Custom theme variables (light/dark style overrides)
  const isLight = userProfile.themeMode === 'light';

  // --- GOOGLE DRIVE & CLOUD STORAGE BACKUP INTEGRATION STATES ---
  const [gdriveUser, setGdriveUser] = useState<any | null>(null);
  const [gdriveToken, setGdriveToken] = useState<string | null>(null);
  const [showGdrivePopup, setShowGdrivePopup] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [showSyncIndicator, setShowSyncIndicator] = useState<boolean>(false);
  const [syncIndicatorType, setSyncIndicatorType] = useState<'info' | 'warning' | 'loading'>('info');
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');
  const [countdownMsg, setCountdownMsg] = useState<string>('');
  const [isSavingManualCloud, setIsSavingManualCloud] = useState<boolean>(false);

  // 1.5 FORCE AUTO-LOGOUT & TRIGGER RE-LOGIN POPUP ON EVERY PAGE REFRESH MOUNT
  useEffect(() => {
    const handleInitialRefreshAuth = async () => {
      try {
        await logoutGDrive();
        setGdriveUser(null);
        setGdriveToken(null);
        setShowGdrivePopup(true);
      } catch (err) {
        console.error('Error during cloud storage auto-logout:', err);
      }
    };
    handleInitialRefreshAuth();
  }, []);

  // Validate Connection to Firestore & Fetch Menu Order on Login
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  useEffect(() => {
    const loadSidebarFromFirestore = async () => {
      if (!gdriveUser) return;
      try {
        const userDocRef = doc(db, 'users', gdriveUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && Array.isArray(data.sidebarOrder)) {
            const validIds = data.sidebarOrder.filter((id: string) => DEFAULT_MENU_ORDER.includes(id));
            const missing = DEFAULT_MENU_ORDER.filter((id: string) => !validIds.includes(id));
            const finalOrder = [...validIds, ...missing];

            setSidebarOrder(finalOrder);
            localStorage.setItem('LKP_SIDEBAR_ORDER', JSON.stringify(finalOrder));
            showToast('Urutan menu berhasil disinkronkan dari Firestore!', 'success');
          }
        }
      } catch (err) {
        try {
          handleFirestoreError(err, 'get', `users/${gdriveUser.uid}`);
        } catch (e) {
          console.error(e);
        }
      }
    };
    loadSidebarFromFirestore();
  }, [gdriveUser]);

  // Automatic Draft Search and Countdown Restore sequence
  const handleCheckAndAutoLoadDraft = async (token: string) => {
    setSyncIndicatorType('info');
    setSyncStatusMsg('Memeriksa Penyimpanan Awan & Google Drive Anda...');
    setShowSyncIndicator(true);

    try {
      const email = auth.currentUser?.email || 'pribadi';
      const fileId = await searchDraftFile(token);
      if (fileId) {
        // Formulated exact message pattern specified in standard prompt instruction rules
        setSyncIndicatorType('warning');
        setSyncStatusMsg(
          `Ditemukan Backup Cloud!\nGoogle Drive draft sinkronisasi terdeteksi.\nAda berkas cadangan pembukuan_pribadi_${email}.json di Google Drive Anda\n\n⚠️ PERHATIAN: Memulihkan draft ini akan menumpuk (menghapus permanen) seluruh data lokal yang anda ada saat ini.`
        );

        // Visual Countdown satisfying countdown trigger requirement: "otomatis pilih muat daftar sambil menunggu muat daftar tambahkan fitur loading yang modern"
        for (let count = 3; count >= 1; count--) {
          setCountdownMsg(`Ya, Muat Draft terpicu otomatis. Mengunduh dalam ${count} detik...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        setCountdownMsg('Menghubungkan & Memulihkan draf...');
        setSyncIndicatorType('loading');

        const draft = await downloadDraftFile(token, fileId);
        if (draft) {
          if (draft.transactions) setTransactions(draft.transactions);
          if (draft.accounts) setAccounts(draft.accounts);
          if (draft.assets) setAssets(draft.assets);
          if (draft.debts) setDebts(draft.debts);
          if (draft.userProfile) setUserProfile(draft.userProfile);
          if (draft.categoryBudgets) setCategoryBudgets(draft.categoryBudgets);
          if (draft.emergencyConfig) setEmergencyConfig(draft.emergencyConfig);

          // Force instant save locally too to avoid stale states
          if (draft.transactions) localStorage.setItem('LKP_TRANSACTIONS', JSON.stringify(draft.transactions));
          if (draft.accounts) localStorage.setItem('LKP_ACCOUNTS', JSON.stringify(draft.accounts));
          if (draft.assets) localStorage.setItem('LKP_ASSETS', JSON.stringify(draft.assets));
          if (draft.debts) localStorage.setItem('LKP_DEBTS', JSON.stringify(draft.debts));
          if (draft.userProfile) localStorage.setItem('LKP_USER_PROFILE', JSON.stringify(draft.userProfile));
          if (draft.categoryBudgets) localStorage.setItem('LKP_CATEGORY_BUDGETS', JSON.stringify(draft.categoryBudgets));
          if (draft.emergencyConfig) localStorage.setItem('LKP_EMERGENCY_FUND_CONFIG', JSON.stringify(draft.emergencyConfig));

          showToast('Cadangan Cloud berhasil dipulihkan secara otomatis!', 'success');
        } else {
          showToast('Gagal memulihkan draf dari Google Drive.', 'error');
        }
      } else {
        showToast(`Tidak ada draft draf pembukuan_pribadi_${email}.json sebelumnya. Memulai lembar baru!`, 'info');
      }
    } catch (err) {
      console.error(err);
      showToast('Koneksi sinkronisasi Google Drive gagal.', 'error');
    } finally {
      setShowSyncIndicator(false);
      setCountdownMsg('');
    }
  };

  const handleGdriveLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await signInWithGoogleDrive();
      setGdriveUser(result.user);
      setGdriveToken(result.accessToken);
      setShowGdrivePopup(false);
      showToast(`Berhasil Masuk: ${result.user.email}`, 'success');
      // Trigger automatic cloud sync checking flow
      await handleCheckAndAutoLoadDraft(result.accessToken);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        showToast('Proses masuk Google dibatalkan.', 'info');
      } else {
        console.error(err);
        showToast('Gagal terhubung dengan Penyimpanan Awan & Google Drive.', 'error');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGdriveLogout = async () => {
    try {
      await logoutGDrive();
      setGdriveUser(null);
      setGdriveToken(null);
      showToast('Berhasil logout dari Penyimpanan Awan & Google Drive', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualGDriveBackup = async () => {
    if (!gdriveToken) return;
    setIsSavingManualCloud(true);
    try {
      const payload: DraftPayload = {
        transactions,
        accounts,
        assets,
        debts,
        userProfile,
        categoryBudgets,
        emergencyConfig
      };
      const ok = await saveDraftFile(gdriveToken, payload);
      if (ok) {
        showToast('Berhasil mengunggah draf backup ke Google Drive!', 'success');
      } else {
        showToast('Gagal mengunggah draf backup ke Google Drive.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal mengunggah draf backup.', 'error');
    } finally {
      setIsSavingManualCloud(false);
    }
  };

  // --- AUTOMATED CLOUD BACKUP AUTO-SAVE DEBOUNCE EFFECT ---
  useEffect(() => {
    if (!gdriveToken) return;

    const autoSaveTimer = setTimeout(async () => {
      const payload: DraftPayload = {
        transactions,
        accounts,
        assets,
        debts,
        userProfile,
        categoryBudgets,
        emergencyConfig
      };
      const ok = await saveDraftFile(gdriveToken, payload);
      if (ok) {
        console.log('[Cloud Auto-Save] Backup draf berhasil disinkronkan ke Google Drive.');
      }
    }, 5000); // Debounce to prevent hitting rapid rate limits during fast inputs

    return () => clearTimeout(autoSaveTimer);
  }, [transactions, accounts, assets, debts, userProfile, categoryBudgets, emergencyConfig, gdriveToken]);

  // 2. AUTO-SAVE DEBOUNCE SYSTEM TO LOCALSTORAGE ON MUTATION
  useEffect(() => {
    localStorage.setItem('LKP_TRANSACTIONS', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('LKP_ACCOUNTS', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('LKP_ASSETS', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('LKP_DEBTS', JSON.stringify(debts));
  }, [debts]);

  useEffect(() => {
    localStorage.setItem('LKP_USER_PROFILE', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('LKP_CATEGORY_BUDGETS', JSON.stringify(categoryBudgets));
  }, [categoryBudgets]);

  // 1.8 SELF-HEALING SYSTEM: Always keep account balances perfectly computed from transactions list in real-time
  useEffect(() => {
    setAccounts(prevAccounts => {
      let changed = false;
      const updated = prevAccounts.map(acc => {
        const txsForAcc = transactions.filter(t => t.source.toLowerCase() === acc.name.toLowerCase());
        const balanceDiff = txsForAcc.reduce((sum, t) => {
          return sum + (t.type === 'Pemasukan' ? t.nominal : -t.nominal);
        }, 0);

        const baseBal = acc.initialBalance !== undefined 
          ? acc.initialBalance 
          : (acc.balance - balanceDiff);
        
        const correctBalance = baseBal + balanceDiff;
        if (acc.balance !== correctBalance || acc.initialBalance !== baseBal) {
          changed = true;
          return { ...acc, balance: correctBalance, initialBalance: baseBal };
        }
        return acc;
      });
      return changed ? updated : prevAccounts;
    });
  }, [transactions]);

  // Toast scheduler logic
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);
    return () => clearTimeout(timer);
  };

  const normalizeAccountName = (name: string): string => {
    if (!name) return 'Cash';
    const lower = name.toLowerCase().trim();
    if (lower === 'tunai' || lower === 'cash' || lower === 'dompet') {
      return 'Cash';
    }
    return name.trim().charAt(0).toUpperCase() + name.trim().slice(1);
  };

  // 3. TRANSACTION MUTATION HANDLERS (AUTO BALANCES ALLOCATION ADJUSTER)
  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const normalizedSource = normalizeAccountName(newTx.source);

    const tx: Transaction = {
      ...newTx,
      source: normalizedSource,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    };

    // Check if the account exists
    const exists = accounts.some(acc => acc.name.toLowerCase() === normalizedSource.toLowerCase());

    if (!exists) {
      const gradients = [
        'from-purple-650 to-indigo-950',
        'from-emerald-500 to-teal-900',
        'from-orange-500 to-red-900',
        'from-blue-600 to-blue-950',
        'from-amber-600 to-amber-950',
        'from-sky-450 to-blue-900',
        'from-fuchsia-600 to-pink-900'
      ];
      const selectedGradient = gradients[Math.floor(Math.random() * gradients.length)];
      
      const newAccountObj: Account = {
        id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        name: normalizedSource,
        balance: 0,
        color: selectedGradient,
        textColor: '#ffffff',
        iconName: 'Wallet',
        accountNumber: 'Saku Virtual Baru',
        initialBalance: 0
      };

      setAccounts(prev => [...prev, newAccountObj]);
      showToast(`Sumber uang "${normalizedSource}" baru otomatis dibuat!`, 'info');
    }

    setTransactions(prev => [...prev, tx]);

    // Alter sisa saldo corresponding Account immediately
    setAccounts(prevAccounts => {
      const hasAcc = prevAccounts.some(acc => acc.name.toLowerCase() === normalizedSource.toLowerCase());
      let finalAccounts = prevAccounts;
      if (!hasAcc) {
        const gradients = [
          'from-purple-650 to-indigo-950',
          'from-emerald-500 to-teal-900',
          'from-orange-500 to-red-900',
          'from-blue-600 to-blue-950',
          'from-amber-600 to-amber-950',
          'from-sky-450 to-blue-900',
          'from-fuchsia-600 to-pink-900'
        ];
        const selectedGradient = gradients[Math.floor(Math.random() * gradients.length)];
        const newAccountObj: Account = {
          id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          name: normalizedSource,
          balance: 0,
          color: selectedGradient,
          textColor: '#ffffff',
          iconName: 'Wallet',
          accountNumber: 'Saku Virtual Baru',
          initialBalance: 0
        };
        finalAccounts = [...prevAccounts, newAccountObj];
      }

      return finalAccounts.map(acc => {
        if (acc.name.toLowerCase() === normalizedSource.toLowerCase()) {
          const balanceDiff = tx.type === 'Pemasukan' ? tx.nominal : -tx.nominal;
          return { ...acc, balance: acc.balance + balanceDiff };
        }
        return acc;
      });
    });

    showToast(`Transaksi "${tx.title}" berhasil dicatat`, 'success');
  };

  const handleEditTransaction = (id: string, updatedFields: Partial<Transaction>) => {
    // We must reverse balance effect of previous values and apply new values
    const oldTx = transactions.find(t => t.id === id);
    if (!oldTx) return;

    const cleanUpdatedFields = { ...updatedFields };
    if (cleanUpdatedFields.source) {
      cleanUpdatedFields.source = normalizeAccountName(cleanUpdatedFields.source);
    }

    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...cleanUpdatedFields } : t));

    // Re-adjust older values
    setAccounts(prevAccounts => {
      const targetSource = cleanUpdatedFields.source || oldTx.source;
      const normalizedTargetSource = normalizeAccountName(targetSource);

      const hasAcc = prevAccounts.some(acc => acc.name.toLowerCase() === normalizedTargetSource.toLowerCase());
      let finalAccounts = prevAccounts;
      if (!hasAcc) {
        const gradients = [
          'from-purple-650 to-indigo-950',
          'from-emerald-500 to-teal-900',
          'from-orange-500 to-red-900',
          'from-blue-600 to-blue-950',
          'from-amber-600 to-amber-950',
          'from-sky-400 to-blue-900',
        ];
        const selectedGradient = gradients[Math.floor(Math.random() * gradients.length)];
        const newAccountObj: Account = {
          id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          name: normalizedTargetSource,
          balance: 0,
          color: selectedGradient,
          textColor: '#ffffff',
          iconName: 'Wallet',
          accountNumber: 'Saku Virtual Baru'
        };
        finalAccounts = [...prevAccounts, newAccountObj];
      }

      return finalAccounts.map(acc => {
        let finalBal = acc.balance;
        
        // Reverse older tx
        if (acc.name.toLowerCase() === oldTx.source.toLowerCase()) {
          const oldBalanceDiff = oldTx.type === 'Pemasukan' ? -oldTx.nominal : oldTx.nominal;
          finalBal += oldBalanceDiff;
        }

        // Apply new fields
        if (acc.name.toLowerCase() === normalizedTargetSource.toLowerCase()) {
          const targetType = cleanUpdatedFields.type || oldTx.type;
          const targetNom = cleanUpdatedFields.nominal !== undefined ? cleanUpdatedFields.nominal : oldTx.nominal;
          const newBalanceDiff = targetType === 'Pemasukan' ? targetNom : -targetNom;
          finalBal += newBalanceDiff;
        }

        return { ...acc, balance: finalBal };
      });
    });

    showToast(`Transaksi "${cleanUpdatedFields.title || oldTx.title}" berhasil diupdate`, 'info');
  };

  const handleDeleteTransaction = (id: string) => {
    // Reverse balances on deleting
    const targetTx = transactions.find(t => t.id === id);
    if (!targetTx) return;

    setTransactions(prev => prev.filter(t => t.id !== id));

    setAccounts(prevAccounts => {
      return prevAccounts.map(acc => {
        if (acc.name.toLowerCase() === targetTx.source.toLowerCase()) {
          const reverseDiff = targetTx.type === 'Pemasukan' ? -targetTx.nominal : targetTx.nominal;
          return { ...acc, balance: acc.balance + reverseDiff };
        }
        return acc;
      });
    });

    showToast('Transaksi berhasil dihapus dari pembukuan', 'error');
  };

  const handleDuplicateTransaction = (tx: Transaction) => {
    handleAddTransaction({
      title: `${tx.title} (Duplikasi)`,
      nominal: tx.nominal,
      type: tx.type,
      category: tx.category,
      source: tx.source,
      date: new Date().toISOString().split('T')[0],
      note: tx.note,
      isRecurring: tx.isRecurring,
      recurringPeriod: tx.recurringPeriod
    });
  };

  // Helper to detect if a transaction title indicates an asset purchase
  const detectAssetCategoryAndCode = (title: string) => {
    const normTitle = title.toLowerCase();
    
    // Gold
    if (normTitle.includes('emas') || normTitle.includes('gold') || normTitle.includes('perak') || normTitle.includes('logam mulia') || normTitle.includes('antam')) {
      return { category: 'Gold' as const, code: 'GOLD', isAsset: true };
    }
    
    // Crypto
    if (normTitle.includes('btc') || normTitle.includes('bitcoin') || normTitle.includes('crypto') || normTitle.includes('kripto') || normTitle.includes('eth') || normTitle.includes('ethereum') || normTitle.includes('usdt')) {
      return { category: 'Crypto' as const, code: 'BTC', isAsset: true };
    }
    
    // Saham
    if (normTitle.includes('saham') || normTitle.includes('stock') || normTitle.includes('bbca') || normTitle.includes('bbri') || normTitle.includes('bmri') || normTitle.includes('tlkm') || normTitle.includes('gotof')) {
      let code = 'STOCK';
      if (normTitle.includes('bbca')) code = 'BBCA';
      else if (normTitle.includes('bbri')) code = 'BBRI';
      else if (normTitle.includes('bmri')) code = 'BMRI';
      else if (normTitle.includes('tlkm')) code = 'TLKM';
      return { category: 'Saham' as const, code, isAsset: true };
    }
    
    // MutualFund
    if (normTitle.includes('reksadana') || normTitle.includes('reksa dana') || normTitle.includes('mutualfund') || normTitle.includes('mutual fund') || normTitle.includes('bibit')) {
      return { category: 'MutualFund' as const, code: 'MUTUAL_FUND', isAsset: true };
    }
    
    // Forex
    if (normTitle.includes('forex') || normTitle.includes('valas') || normTitle.includes('usd') || normTitle.includes('dollar') || normTitle.includes('dolar')) {
      return { category: 'Forex' as const, code: 'USD', isAsset: true };
    }
    
    // Properti
    if (normTitle.includes('apartemen') || normTitle.includes('tanah') || normTitle.includes('properti') || normTitle.includes('rumah')) {
      return { category: 'Properti' as const, code: 'PROP', isAsset: true };
    }
    
    return { category: 'Gold' as const, code: '', isAsset: false };
  };

  // AI commit handler
  const handleCommitAI = (parsed: ParsedTransaction) => {
    // 1. Commit normal financial transaction
    handleAddTransaction({
      title: parsed.title,
      nominal: parsed.nominal,
      type: parsed.type,
      category: parsed.category,
      source: parsed.source,
      date: parsed.date
    });

    // Check for emergency fund phrases to automatically record contribution
    const normTitle = parsed.title.toLowerCase();
    const isEmergency = normTitle.includes('dana darurat') || normTitle.includes('emergency fund') || normTitle.includes('emergency');
    if (isEmergency) {
      const newContrib = {
        id: `contrib-${Date.now()}`,
        date: parsed.date || new Date().toISOString().split('T')[0],
        amount: parsed.nominal,
        note: parsed.title,
        source: parsed.source || 'Cash'
      };

      setEmergencyConfig(prev => {
        const updatedContribs = [newContrib, ...(prev.contributions || [])];
        return {
          ...prev,
          contributions: updatedContribs
        };
      });
      // Push automated notification
      setNotifications(prev => [
        {
          id: `emergency-notif-ai-${Date.now()}`,
          title: '🛡 Kontribusi AI Dana Darurat',
          message: `Input AI cerdas menyisihkan Rp ${parsed.nominal.toLocaleString('id-ID')} ke portfolio dana darurat Anda melalui ${parsed.source || 'Kas'}!`,
          category: 'AI Recommendation',
          date: parsed.date || new Date().toISOString().split('T')[0],
          isRead: false
        },
        ...prev
      ]);
    }

    // 2. If it is an asset acquisition, directly add it to the asset portfolio
    const isPurchase = parsed.type === 'Pengeluaran';
    if (isPurchase) {
      const assetInfo = detectAssetCategoryAndCode(parsed.title);
      if (assetInfo.isAsset) {
        let logo = '🟡';
        if (assetInfo.category === 'Crypto') logo = '🪙';
        if (assetInfo.category === 'Saham') logo = '📈';
        if (assetInfo.category === 'MutualFund') logo = '💼';
        if (assetInfo.category === 'Forex') logo = '💵';
        if (assetInfo.category === 'Properti') logo = '🏠';

        const categoryLabel = assetInfo.category === 'Gold' ? 'Emas (Logam Mulia)' :
                              assetInfo.category === 'Crypto' ? 'Kripto Token' :
                              assetInfo.category === 'Saham' ? 'Saham Pasar' :
                              assetInfo.category === 'MutualFund' ? 'Reksa Dana' :
                              assetInfo.category === 'Forex' ? 'Valas' : 'Properti';

        const existingAsset = assets.find(a => a.category === assetInfo.category);
        if (existingAsset) {
          const newUnits = existingAsset.units + 1;
          const newBuyPrice = Math.round((existingAsset.units * existingAsset.buyPrice + parsed.nominal) / newUnits);
          handleEditAsset(existingAsset.id, {
            units: newUnits,
            buyPrice: newBuyPrice,
            marketPrice: parsed.nominal
          });
          showToast(`Terdeteksi pembelian! Mengakumulasi unit ke kategori "${categoryLabel}".`, 'success');
        } else {
          handleAddAsset({
            name: categoryLabel,
            code: assetInfo.code || 'VAR',
            category: assetInfo.category,
            units: 1,
            buyPrice: parsed.nominal,
            marketPrice: parsed.nominal,
            logo: logo
          });
          showToast(`Terdeteksi pembelian baru! Berhasil mencatat ke tabungan "${categoryLabel}".`, 'success');
        }
      }
    }
  };

  const [navbarAiInput, setNavbarAiInput] = useState('');

  const handleNavbarAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!navbarAiInput.trim()) return;

    // Mark as tried upon use
    markAiSmartTried();

    const parsed = parseFinanceText(navbarAiInput);
    if (parsed && parsed.parsedOk && parsed.nominal > 0) {
      handleCommitAI(parsed);
      showToast(`AI Berhasil mencatat "${parsed.title}" sebesar ${formatCurrency(parsed.nominal)} ke ${parsed.source}!`, 'success');
      setNavbarAiInput('');
    } else {
      showToast(`Gagal membaca nominal. Format contoh: 'makan bakso 25rb jago' atau 'gaji 5jt bca'.`, 'error');
    }
  };

  // 4. GENERAL ACCOUNT / ASSETS / DEBTS MUTATION HANDLERS
  const handleAddAccount = (acc: Omit<Account, 'id'>) => {
    // Determine balanceDiff from current transactions
    const txsForAcc = transactions.filter(t => t.source.toLowerCase() === acc.name.toLowerCase());
    const balanceDiff = txsForAcc.reduce((sum, t) => {
      return sum + (t.type === 'Pemasukan' ? t.nominal : -t.nominal);
    }, 0);

    const accItem: Account = { 
      ...acc, 
      id: `acc-${Date.now()}`,
      initialBalance: acc.balance - balanceDiff
    };
    setAccounts(prev => [...prev, accItem]);
    showToast(`Sumber uang "${accItem.name}" berhasil dibuat`, 'success');
  };

  const handleEditAccount = (id: string, fields: Partial<Account>) => {
    setAccounts(prev => prev.map(a => {
      if (a.id === id) {
        const updated = { ...a, ...fields };
        if (fields.balance !== undefined) {
          // If balance is edited, recalculate initialBalance to correspond
          const targetName = fields.name || a.name;
          const txsForAcc = transactions.filter(t => t.source.toLowerCase() === targetName.toLowerCase());
          const balanceDiff = txsForAcc.reduce((sum, t) => {
            return sum + (t.type === 'Pemasukan' ? t.nominal : -t.nominal);
          }, 0);
          updated.initialBalance = fields.balance - balanceDiff;
        }
        return updated;
      }
      return a;
    }));
    showToast(`Sumber uang berhasil diupdate`, 'info');
  };

  const handleDeleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    showToast('Sumber uang berhasil dihapus', 'error');
  };

  const handleAddAsset = (asset: Omit<Asset, 'id'>) => {
    const assetItem = { ...asset, id: `asset-${Date.now()}` };
    setAssets(prev => [...prev, assetItem]);
    showToast(`Aset portfolio "${assetItem.name}" berhasil ditambahkan`, 'success');
  };

  const handleEditAsset = (id: string, fields: Partial<Asset>) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, ...fields } : a));
    showToast('Aset portfolio berhasil terupdate', 'info');
  };

  const handleDeleteAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
    showToast('Aset berhasil dikeluarkan dari kalkulasi portfolio', 'error');
  };

  const handleAddDebt = (debt: Omit<Debt, 'id'>, sourceAccountNameRaw: string) => {
    const sourceAccountName = normalizeAccountName(sourceAccountNameRaw);
    const debtItem = { ...debt, id: `debt-${Date.now()}` };
    setDebts(prev => [...prev, debtItem]);

    const nominal = debt.nominal;
    const paidNominal = debt.paidNominal;

    // Check if the source account exists; if not, auto-create it!
    const accountExists = accounts.some(acc => acc.name.toLowerCase() === sourceAccountName.toLowerCase());
    
    if (!accountExists) {
      const gradients = [
        'from-purple-650 to-indigo-950',
        'from-emerald-500 to-teal-900',
        'from-orange-500 to-red-900',
        'from-blue-600 to-blue-950',
        'from-amber-600 to-amber-950',
        'from-sky-450 to-blue-900',
        'from-fuchsia-600 to-pink-900'
      ];
      const selectedGradient = gradients[Math.floor(Math.random() * gradients.length)];
      
      const newAccountObj: Account = {
        id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        name: sourceAccountName,
        balance: 0,
        color: selectedGradient,
        textColor: '#ffffff',
        iconName: 'Wallet',
        accountNumber: 'Saku Virtual Baru'
      };

      setAccounts(prev => [...prev, newAccountObj]);
      showToast(`Sumber uang "${sourceAccountName}" baru otomatis dibuat!`, 'info');
    }

    if (debt.type === 'Hutang') {
      // Kita Pinjam Orang -> We get cash flow (Inflow / Pemasukan)
      setAccounts(prevAccounts => {
        const hasAcc = prevAccounts.some(acc => acc.name.toLowerCase() === sourceAccountName.toLowerCase());
        let finalAccounts = prevAccounts;
        if (!hasAcc) {
          const gradients = [
            'from-purple-650 to-indigo-950',
            'from-emerald-500 to-teal-900',
            'from-orange-500 to-red-900',
            'from-blue-600 to-blue-950',
            'from-amber-600 to-amber-950',
            'from-sky-450 to-blue-900',
            'from-fuchsia-600 to-pink-900'
          ];
          const selectedGradient = gradients[Math.floor(Math.random() * gradients.length)];
          const newAccountObj: Account = {
            id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            name: sourceAccountName,
            balance: 0,
            color: selectedGradient,
            textColor: '#ffffff',
            iconName: 'Wallet',
            accountNumber: 'Saku Virtual Baru'
          };
          finalAccounts = [...prevAccounts, newAccountObj];
        }

        return finalAccounts.map(acc => {
          if (acc.name.toLowerCase() === sourceAccountName.toLowerCase()) {
            return { ...acc, balance: acc.balance + nominal };
          }
          return acc;
        });
      });

      // Add a clean financial transaction element
      const tx: Transaction = {
        id: `tx-${Date.now()}-1`,
        title: `Menerima Pinjaman: ${debt.personName}`,
        nominal: nominal,
        type: 'Pemasukan',
        category: 'Pinjaman',
        source: sourceAccountName,
        date: new Date().toISOString().split('T')[0]
      };

      let initialTxs = [tx];

      // If initial paidNominal is specified
      if (paidNominal > 0) {
        setAccounts(prevAccounts => {
          return prevAccounts.map(acc => {
            if (acc.name.toLowerCase() === sourceAccountName.toLowerCase()) {
              return { ...acc, balance: acc.balance - paidNominal };
            }
            return acc;
          });
        });

        initialTxs.push({
          id: `tx-${Date.now()}-2`,
          title: `Bayar Cicilan Awal ke: ${debt.personName}`,
          nominal: paidNominal,
          type: 'Pengeluaran',
          category: 'Pinjaman',
          source: sourceAccountName,
          date: new Date().toISOString().split('T')[0]
        });
      }

      setTransactions(prev => [...prev, ...initialTxs]);

    } else {
      // Piutang ke Orang (We lend money) -> We lose money (Outflow / Pengeluaran)
      setAccounts(prevAccounts => {
        const hasAcc = prevAccounts.some(acc => acc.name.toLowerCase() === sourceAccountName.toLowerCase());
        let finalAccounts = prevAccounts;
        if (!hasAcc) {
          const gradients = [
            'from-purple-650 to-indigo-950',
            'from-emerald-500 to-teal-900',
            'from-orange-500 to-red-900',
            'from-blue-600 to-blue-950',
            'from-amber-600 to-amber-950',
            'from-sky-450 to-blue-900',
            'from-fuchsia-600 to-pink-900'
          ];
          const selectedGradient = gradients[Math.floor(Math.random() * gradients.length)];
          const newAccountObj: Account = {
            id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            name: sourceAccountName,
            balance: 0,
            color: selectedGradient,
            textColor: '#ffffff',
            iconName: 'Wallet',
            accountNumber: 'Saku Virtual Baru'
          };
          finalAccounts = [...prevAccounts, newAccountObj];
        }

        return finalAccounts.map(acc => {
          if (acc.name.toLowerCase() === sourceAccountName.toLowerCase()) {
            return { ...acc, balance: acc.balance - nominal };
          }
          return acc;
        });
      });

      // Add a clean transaction
      const tx: Transaction = {
        id: `tx-${Date.now()}-1`,
        title: `Memberikan Pinjaman: ${debt.personName}`,
        nominal: nominal,
        type: 'Pengeluaran',
        category: 'Pinjaman',
        source: sourceAccountName,
        date: new Date().toISOString().split('T')[0]
      };

      let initialTxs = [tx];

      // If initial repaid is specified
      if (paidNominal > 0) {
        setAccounts(prevAccounts => {
          return prevAccounts.map(acc => {
            if (acc.name.toLowerCase() === sourceAccountName.toLowerCase()) {
              return { ...acc, balance: acc.balance + paidNominal };
            }
            return acc;
          });
        });

        initialTxs.push({
          id: `tx-${Date.now()}-2`,
          title: `Terima Cicilan Awal dari: ${debt.personName}`,
          nominal: paidNominal,
          type: 'Pemasukan',
          category: 'Pinjaman',
          source: sourceAccountName,
          date: new Date().toISOString().split('T')[0]
        });
      }

      setTransactions(prev => [...prev, ...initialTxs]);
    }

    showToast(`Buku hutang/piutang "${debtItem.personName}" berhasil dibuat dengan penyesuaian saldo ${sourceAccountName}`, 'success');
  };

  const handlePayDebtInstallment = (id: string, payAmount: number, accountNameRaw: string) => {
    const accountName = normalizeAccountName(accountNameRaw);
    const debtItem = debts.find(d => d.id === id);
    if (!debtItem) return;

    const remainingToPay = debtItem.nominal - debtItem.paidNominal;
    const actualPayAmount = Math.min(payAmount, remainingToPay);

    if (actualPayAmount <= 0) {
      showToast('Jumlah pembayaran cicilan tidak valid!', 'warning');
      return;
    }

    // Advance payment
    setDebts(prev => prev.map(d => d.id === id ? { ...d, paidNominal: d.paidNominal + actualPayAmount } : d));

    // Double-entry record keeping
    if (debtItem.type === 'Hutang') {
      // Repaying our liability -> Outflow from account (Pengeluaran)
      setAccounts(prevAccounts => {
        return prevAccounts.map(acc => {
          if (acc.name.toLowerCase() === accountName.toLowerCase()) {
            return { ...acc, balance: acc.balance - actualPayAmount };
          }
          return acc;
        });
      });

      const tx: Transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        title: `Bayar Cicilan Hutang: ${debtItem.personName}`,
        nominal: actualPayAmount,
        type: 'Pengeluaran',
        category: 'Pinjaman',
        source: accountName,
        date: new Date().toISOString().split('T')[0]
      };
      setTransactions(prev => [...prev, tx]);
      showToast(`Cicilan sebesar Rp ${actualPayAmount.toLocaleString()} dibayarkan menggunakan ${accountName}`, 'success');

    } else {
      // Receiving payment for asset -> Inflow to account (Pemasukan)
      setAccounts(prevAccounts => {
        return prevAccounts.map(acc => {
          if (acc.name.toLowerCase() === accountName.toLowerCase()) {
            return { ...acc, balance: acc.balance + actualPayAmount };
          }
          return acc;
        });
      });

      const tx: Transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        title: `Terima Cicilan Piutang: ${debtItem.personName}`,
        nominal: actualPayAmount,
        type: 'Pemasukan',
        category: 'Pinjaman',
        source: accountName,
        date: new Date().toISOString().split('T')[0]
      };
      setTransactions(prev => [...prev, tx]);
      showToast(`Cicilan sebesar Rp ${actualPayAmount.toLocaleString()} diterima sukses ke ${accountName}`, 'success');
    }
  };

  const handleEditDebt = (id: string, fields: Partial<Debt>) => {
    setDebts(prev => prev.map(d => d.id === id ? { ...d, ...fields } : d));
    showToast('Rincian cicilan berhasil terupdate', 'info');
  };

  const handleDeleteDebt = (id: string) => {
    setDebts(prev => prev.filter(d => d.id !== id));
    showToast('Buku tagihan terhapus', 'error');
  };

  // 5. RESET RESET APP DATA TO ZERO SYSTEM (WITH STRENOTYPE CONFIRM POPUP)
  const handleResetToZero = () => {
    // Clear everything instantly
    setTransactions([]);
    setAccounts([
      { id: 'c1', name: 'Cash', balance: 0, color: 'from-neutral-600 to-neutral-900', textColor: '#ffffff', iconName: 'DollarSign', accountNumber: 'Dompet Fisik', initialBalance: 0 },
      { id: 'c2', name: 'BCA', balance: 0, color: 'from-blue-600 to-blue-900', textColor: '#ffffff', iconName: 'CreditCard', accountNumber: 'Buku Tabungan', initialBalance: 0 }
    ]);
    setAssets([]);
    setDebts([]);
    
    // Save defaults with empty indices
    showToast('Semua database pembukuan diatur ulang menjadi Rp 0', 'warning');
    setShowResetConfirm(false);
  };

  // Safe file imports / exports matching specifications
  const handleExportJSON = () => {
    const bundleStr = JSON.stringify({ transactions, accounts, assets, debts, userProfile, categoryBudgets });
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(bundleStr);
    const email = auth.currentUser?.email || userProfile.email || 'pribadi';
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `pembukuan_pribadi_${email}.json`;
    link.click();
    showToast('Backup JSON sukses terunduh', 'success');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const parsed = JSON.parse(loadEvent.target?.result as string);
        if (parsed.transactions) setTransactions(parsed.transactions);
        if (parsed.accounts) setAccounts(parsed.accounts);
        if (parsed.assets) setAssets(parsed.assets);
        if (parsed.debts) setDebts(parsed.debts);
        if (parsed.userProfile) setUserProfile(parsed.userProfile);
        if (parsed.categoryBudgets) setCategoryBudgets(parsed.categoryBudgets);
        
        showToast('Database berhasil dipulihkan dari Backup JSON!', 'success');
      } catch (err) {
        showToast('Format JSON salah atau corrupt!', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Layout calculations
  const totalInflowSum = accounts.reduce((sum, a) => sum + a.balance, 0);

  // Real-time monthly category spent calculation & budget warnings list matching requirements
  const spentMap = React.useMemo(() => {
    // Current date workspace is set in May 2026 as per local workspace time metadata
    const now = new Date();
    const yStr = now.getFullYear().toString();
    const mStr = String(now.getMonth() + 1).padStart(2, '0');

    const map: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.type === 'Pengeluaran' && tx.date) {
        const parts = tx.date.split('-'); // "2026-05-12"
        if (parts[0] === yStr && parts[1] === mStr) {
          const cat = tx.category || 'Lainnya';
          map[cat] = (map[cat] || 0) + tx.nominal;
        }
      }
    });
    return map;
  }, [transactions]);

  const budgetWarnings = React.useMemo(() => {
    const warnings: Array<{
      category: string;
      spent: number;
      budget: number;
      percentage: number;
      message: string;
    }> = [];

    Object.entries(categoryBudgets).forEach(([category, budget]) => {
      const spent = spentMap[category] || 0;
      if (budget > 0) {
        const percentage = (spent / budget) * 100;
        if (percentage >= 90) {
          warnings.push({
            category,
            spent,
            budget,
            percentage,
            message: `⚠️ Peringatan: Pengeluaran untuk Kategori '${category}' telah mencapai Rp ${spent.toLocaleString()} dari batas Rp ${budget.toLocaleString()} (${percentage.toFixed(0)}%). Harap rem pengeluaran!`
          });
        }
      }
    });

    return warnings;
  }, [spentMap, categoryBudgets]);

  const debtWarnings = React.useMemo(() => {
    const warnings: Array<{
      id: string;
      type: 'Hutang' | 'Piutang';
      personName: string;
      nominal: number;
      paidNominal: number;
      dueDate: string;
      diffDays: number;
      isOverdue: boolean;
      message: string;
    }> = [];

    const today = new Date();
    today.setHours(0,0,0,0);

    debts.forEach(d => {
      if (d.paidNominal < d.nominal) {
        const due = new Date(d.dueDate);
        due.setHours(0,0,0,0);
        
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const remaining = d.nominal - d.paidNominal;

        if (diffDays < 0) {
          // Overdue
          const msg = d.type === 'Piutang'
            ? `🔴 PIUTANG OVERDUE: Konsumen ${d.personName} belum melunasi sisa tagihan Rp ${remaining.toLocaleString('id-ID')} (Lewat ${Math.abs(diffDays)} hari!)`
            : `🔴 HUTANG OVERDUE: Tagihan pribadi Rp ${remaining.toLocaleString('id-ID')} ke ${d.personName} belum diselesaikan (Lewat ${Math.abs(diffDays)} hari!)`;

          warnings.push({
            id: d.id,
            type: d.type,
            personName: d.personName,
            nominal: d.nominal,
            paidNominal: d.paidNominal,
            dueDate: d.dueDate,
            diffDays,
            isOverdue: true,
            message: msg
          });
        } else if (diffDays <= 3) {
          // Mendekati Tempo (0 to 3 days remaining)
          let msg = '';
          if (d.type === 'Piutang') {
            msg = diffDays === 0
              ? `⚠️ PIUTANG JATUH TEMPO: Sisa tagihan Konsumen ${d.personName} sebesar Rp ${remaining.toLocaleString('id-ID')} jatuh tempo HARI INI!`
              : `⚠️ PIUTANG DEKAT TEMPO: Sisa tagihan Konsumen ${d.personName} sebesar Rp ${remaining.toLocaleString('id-ID')} jatuh tempo dalam ${diffDays} hari ke depan.`;
          } else {
            msg = diffDays === 0
              ? `⚠️ HUTANG JATUH TEMPO: Tagihan pribadi Rp ${remaining.toLocaleString('id-ID')} ke ${d.personName} harus dibayar HARI INI!`
              : `⚠️ HUTANG DEKAT TEMPO: Tagihan pribadi Rp ${remaining.toLocaleString('id-ID')} harus dibayar dalam ${diffDays} hari ke depan.`;
          }

          warnings.push({
            id: d.id,
            type: d.type,
            personName: d.personName,
            nominal: d.nominal,
            paidNominal: d.paidNominal,
            dueDate: d.dueDate,
            diffDays,
            isOverdue: false,
            message: msg
          });
        }
      }
    });

    return warnings;
  }, [debts]);

  const totalNotificationsCount = budgetWarnings.length + debtWarnings.length;

  // Active Menu List Items
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'transactions', label: 'Transaksi', icon: FileSpreadsheet },
    { id: 'emergency_fund', label: 'Dana Darurat Cerdas', icon: ShieldCheck },
    { id: 'goals', label: 'Target Keuangan', icon: Target },
    { id: 'budget', label: 'Perencanaan Budget', icon: FileSpreadsheet },
    { id: 'forecast', label: 'Prediksi & Net Worth', icon: TrendingUp },
    { id: 'autopay', label: 'Transaksi Berulang', icon: RefreshCw },
    { id: 'health', label: 'Kesehatan & Rasio', icon: HeartPulse },
    { id: 'notifications_tab', label: 'Pusat Notifikasi', icon: Bell },
    { id: 'accounts', label: 'Sumber Uang', icon: Wallet },
    { id: 'assets', label: 'Tabungan Aset', icon: Award },
    { id: 'debts', label: 'Hutang Piutang', icon: HeartPulse },
    { id: 'calendar', label: 'Kalender', icon: Calendar },
    { id: 'statistics', label: 'Statistik Kas', icon: TrendingUp },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  const sortedMenuItems = React.useMemo(() => {
    const listToOrder = menuItems.filter(item => item.id !== 'settings');
    const settingsItem = menuItems.find(item => item.id === 'settings');
    
    const sorted = [...listToOrder].sort((a, b) => {
      const idxA = sidebarOrder.indexOf(a.id);
      const idxB = sidebarOrder.indexOf(b.id);
      const posA = idxA === -1 ? 999 : idxA;
      const posB = idxB === -1 ? 999 : idxB;
      return posA - posB;
    });

    return settingsItem ? [...sorted, settingsItem] : sorted;
  }, [sidebarOrder]);

  return (
    <div className={`min-h-screen flex ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0b1020] text-white'
    } antialiased transition-colors duration-200`}>
      
      {/* 1. SIDEBAR FOR DESKTOP */}
      <aside className={`hidden xl:flex flex-col w-64 border-r shrink-0 transition-colors duration-200 ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0b1020]/80 backdrop-blur-md border-white/[0.06]'
      }`}>
        {/* Top brand */}
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-7 w-7 bg-[#7c5cff] rounded-xl flex items-center justify-center text-white text-xs font-mono font-bold leading-none shadow-[0_0_15px_rgba(124,92,255,0.4)]">
              N
            </span>
            <span className="text-sm font-extrabold tracking-tight uppercase font-mono">LKP PREMIUM</span>
          </div>

          {/* User mini badge ticker */}
          <div className={`p-3 rounded-2xl flex items-center gap-2.5 border ${
            isLight ? 'bg-slate-50 border-slate-100' : 'bg-white/[0.01] border-white/[0.05]'
          }`}>
            <img 
              src={userProfile.avatarUrl} 
              alt="Avatar" 
              className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10"
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold truncate leading-tight">{userProfile.name}</h3>
              <div className="mt-1 flex items-center gap-1.5 text-[#9aa4bf] font-medium text-[9px]">
                <Instagram className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                <span className="truncate">IG : nomadenapp</span>
              </div>
            </div>
          </div>
        </div>

        {/* ATUR SIDEBAR ACTION CONTROLS */}
        <div className="px-5 pb-2">
          {isEditingSidebar ? (
            <div className={`p-3 rounded-xl border ${
              isLight ? 'bg-indigo-50 border-indigo-100/50' : 'bg-[#7c5cff]/10 border-[#7c5cff]/20'
            } flex flex-col gap-2`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-[#7c5cff]">Atur Sidebar</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-normal">Seret item menu untuk menyusun ulang.</p>
              
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSidebarOrder(tempSidebarOrder);
                    localStorage.setItem('LKP_SIDEBAR_ORDER', JSON.stringify(tempSidebarOrder));
                    if (gdriveUser) {
                      const userRef = doc(db, 'users', gdriveUser.uid);
                      setDoc(userRef, { sidebarOrder: tempSidebarOrder }, { merge: true })
                        .then(() => {
                          showToast('Urutan baru disimpan ke cloud!', 'success');
                        })
                        .catch((e) => {
                          try {
                            handleFirestoreError(e, 'write', `users/${gdriveUser.uid}`);
                          } catch (err) {
                            console.error(err);
                          }
                          showToast('Gagal menyinkronkan urutan ke cloud.', 'error');
                        });
                    } else {
                      showToast('Urutan baru disimpan di lokal!', 'success');
                    }
                    setIsEditingSidebar(false);
                  }}
                  className="flex-1 py-1 px-2 text-[10px] font-bold rounded-lg bg-[#16c784] text-white hover:opacity-90 transition-all text-center cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingSidebar(false);
                    showToast('Pengaturan urutan dibatalkan.', 'info');
                  }}
                  className="flex-1 py-1 px-2 text-[10px] font-bold rounded-lg bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 transition-all text-center cursor-pointer"
                >
                  Batal
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTempSidebarOrder(DEFAULT_MENU_ORDER);
                  showToast('Urutan menu dibalikkan ke default (klik Simpan untuk menerapkan)!', 'warning');
                }}
                className="w-full text-center text-[9px] font-bold tracking-tight py-1 text-red-500 hover:underline cursor-pointer mt-0.5"
              >
                Reset Urutan Menu
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  // Initialize temp list matching current sidebarOrder
                  const moveables = sidebarOrder.filter(id => id !== 'settings');
                  setTempSidebarOrder(moveables);
                  setIsEditingSidebar(true);
                  showToast('Mode Atur Sidebar diaktifkan!', 'info');
                }}
                className={`w-full py-2 px-3 text-[10px] font-extrabold uppercase font-mono tracking-wider rounded-xl border flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                  isLight 
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                    : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] text-[#9aa4bf]'
                }`}
              >
                <Layers className="h-3.5 w-3.5 shrink-0 text-[#7c5cff]" />
                Atur Sidebar Menu
              </button>
            </div>
          )}
        </div>

        {/* Links listing scrollable menu */}
        <nav className="px-3 space-y-1 grow py-2 overflow-y-auto">
          {isEditingSidebar ? (
            <>
              <div className="space-y-1 pb-4 flex flex-col">
                {tempSidebarOrder.map((id, idx) => {
                  const item = menuItems.find(i => i.id === id);
                  if (!item) return null;
                  const Icon = item.icon;
                  const isBeingDragged = draggedIndex === idx;

                  return (
                    <div
                      key={item.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-left text-xs font-bold capitalize border transition-all select-none hover:border-[#7c5cff]/40 ${
                        isBeingDragged 
                          ? 'border-dashed border-[#7c5cff] bg-[#7c5cff]/5 opacity-50 scale-95'
                          : isLight 
                            ? 'bg-white border-slate-200 text-slate-700 shadow-sm hover:shadow-md' 
                            : 'bg-slate-950/40 border-white/[0.06] text-[#9aa4bf] shadow-md hover:bg-slate-950/60'
                      }`}
                      style={{ cursor: 'grab' }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <GripVertical className="h-4 w-4 text-slate-400/80 hover:text-[#7c5cff] shrink-0 cursor-grab active:cursor-grabbing transition-colors" />
                        <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {/* Manual Up/Down touch-friendly navigation buttons */}
                      <div className="flex items-center gap-0.5 shrink-0 ml-1.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveMenuUp(idx)}
                          className={`p-1 rounded-md transition-all ${
                            idx === 0 
                              ? 'text-slate-600/20 cursor-not-allowed' 
                              : 'text-slate-400 hover:text-[#7c5cff] hover:bg-[#7c5cff]/10 cursor-pointer'
                          }`}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === tempSidebarOrder.length - 1}
                          onClick={() => moveMenuDown(idx)}
                          className={`p-1 rounded-md transition-all ${
                            idx === tempSidebarOrder.length - 1 
                              ? 'text-slate-600/20 cursor-not-allowed' 
                              : 'text-slate-400 hover:text-[#7c5cff] hover:bg-[#7c5cff]/10 cursor-pointer'
                          }`}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Static Settings locked at bottom */}
              <div className="border-t border-white/[0.05] mt-2 pt-2 opacity-50">
                <div className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold capitalize border border-transparent">
                  <Settings className="h-4.5 w-4.5 text-slate-500" />
                  <span>Pengaturan</span>
                  <span className="ml-auto text-[8px] uppercase font-mono tracking-wider bg-slate-500/10 px-1 py-0.5 rounded text-slate-400">Locked</span>
                </div>
              </div>
            </>
          ) : (
            sortedMenuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-xs font-bold capitalize transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-[#7c5cff] text-white shadow-md' 
                      : isLight ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'text-[#9aa4bf] hover:bg-white/[0.03] hover:text-white'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })
          )}
        </nav>
      </aside>

      {/* 2. MAIN HUB WORKSPACE CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP COMPONENT HEADER BAR */}
        <header className={`h-auto md:h-16 py-3 md:py-0 flex flex-col md:flex-row items-center justify-between px-4 md:px-6 gap-3 md:gap-0 border-b shrink-0 z-20 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0b1020]/60 backdrop-blur-md border-white/[0.06]'
        }`}>
          {/* Row 1 for Mobile: Hamburgers, App Title and Quick Badges */}
          <div className="flex items-center justify-between w-full md:w-auto shrink-0">
            <div className="flex items-center gap-2 md:gap-4">
              {/* Mobile menu logo triggers */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-2 text-[#9aa4bf] hover:text-white cursor-pointer"
              >
                <Menu className="h-5 w-5" />
              </button>
              
              <span className="xl:hidden text-xs font-extrabold tracking-tight uppercase font-mono text-[#7c5cff]">
                Laporan Keuangan
              </span>

              {/* Real-time automated dynamic greetings */}
              <div className="hidden lg:block">
                <span className="text-xs text-[#00d4ff] font-mono leading-none tracking-widest uppercase font-bold">
                  {getFriendlyGreeting()} • 
                </span>
                <p className="text-xs font-bold text-[#9aa4bf] inline ml-1">
                  {userProfile.dashboardName}
                </p>
              </div>
            </div>

            {/* Row 1 mobile icons block */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setUserProfile(prev => ({
                  ...prev,
                  themeMode: prev.themeMode === 'light' ? 'dark' : 'light'
                }))}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors bg-white/[0.02] border border-white/5 cursor-pointer"
                title="Ganti Tema"
              >
                {isLight ? <Moon className="h-4 w-4 text-indigo-400" /> : <Sun className="h-4 w-4 text-amber-400" />}
              </button>

              {/* Mobile notification bell dropdown trigger */}
              <div className="relative">
                <button
                  onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                  className={`p-1.5 rounded-lg transition-all border cursor-pointer relative ${
                    showNotificationDropdown
                      ? 'bg-[#7c5cff]/20 text-white border-[#7c5cff]/30'
                      : 'text-slate-400 hover:text-white bg-white/[0.02] border-white/5'
                  }`}
                  title="Notifikasi"
                >
                  <Bell className={`h-4 w-4 ${totalNotificationsCount > 0 ? 'text-red-400 font-bold' : ''}`} />
                  {totalNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center">
                      <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600 text-[8px] font-bold text-white items-center justify-center font-mono">
                        {totalNotificationsCount}
                      </span>
                    </span>
                  )}
                </button>

                {showNotificationDropdown && (
                  <div className={`absolute right-[-60px] mt-2 w-72 rounded-xl border shadow-xl p-3 z-50 text-left animate-slide-in ${
                    isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0f1424] border-white/[0.08] text-white'
                  }`}>
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.05] mb-2">
                      <p className="text-[10px] font-black uppercase font-mono tracking-wider text-[#9aa4bf]">Peringatan Keuangan</p>
                      <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        totalNotificationsCount > 0 ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
                      }`}>
                        {totalNotificationsCount} Kritis
                      </span>
                    </div>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-0.5 animate-fade-in">
                      {totalNotificationsCount === 0 ? (
                        <p className="text-[10px] text-[#9aa4bf] text-center py-4 font-sans">Semua keuangan aman & terkendali!</p>
                      ) : (
                        <>
                          {budgetWarnings.length > 0 && (
                            <div className="space-y-1 pb-1">
                              <p className="text-[8px] font-bold text-[#a5b4fc] uppercase font-mono tracking-wider">⚠️ Anggaran ({budgetWarnings.length})</p>
                              {budgetWarnings.map((w, idx) => (
                                <div key={idx} className="p-1.5 rounded bg-red-500/[0.03] border border-red-500/10 text-[9px] leading-snug">
                                  Pengeluaran <span className="font-bold text-white">'{w.category}'</span> Rp {w.spent.toLocaleString()} dari Rp {w.budget.toLocaleString()} ({w.percentage.toFixed(0)}%).
                                </div>
                              ))}
                            </div>
                          )}
                          {debtWarnings.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-white/[0.04]">
                              <p className="text-[8px] font-bold text-[#fbcfe8] uppercase font-mono tracking-wider">📅 Tagihan ({debtWarnings.length})</p>
                              {debtWarnings.map((w, idx) => (
                                <div key={idx} className={`p-1.5 rounded border text-[9px] leading-snug ${
                                  w.isOverdue ? 'bg-red-500/[0.03] border-red-500/10' : 'bg-amber-500/[0.02] border-amber-500/10'
                                }`}>
                                  {w.message}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="pt-2 border-t border-white/[0.05] mt-2 flex justify-between items-center text-[9px]">
                      <button
                        onClick={() => {
                          setShowNotificationDropdown(false);
                          setActiveTab('debts');
                        }}
                        className="font-bold text-[#fbcfe8] hover:text-white uppercase font-mono text-[8px]"
                      >
                        Kelola Tagihan
                      </button>
                      <button
                        onClick={() => {
                          setShowNotificationDropdown(false);
                          setActiveTab('settings');
                        }}
                        className="font-bold text-[#7c5cff] hover:text-[#977eff] uppercase font-mono text-[8px]"
                      >
                        Atur Anggaran
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setActiveTab('settings')}
                className={`p-1.5 rounded-lg transition-colors border cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-[#7c5cff]/20 text-white border-[#7c5cff]/30'
                    : 'text-slate-400 hover:text-white bg-white/[0.02] border-white/5'
                }`}
                title="Pengaturan"
              >
                <Settings className="h-4 w-4" />
              </button>

              <img 
                src={userProfile.avatarUrl} 
                alt="Avatar" 
                className="h-7 w-7 rounded-full object-cover ring-1 ring-[#7c5cff]/30 cursor-pointer"
                onClick={() => setActiveTab('settings')}
              />
            </div>
          </div>

          {/* AI SMART QUICK INPUT FORM IN NAVBAR */}
          <form 
            onSubmit={handleNavbarAiSubmit} 
            className="w-full md:flex-1 md:max-w-md mx-0 md:mx-6 relative group"
            id="navbar-ai-quick-input"
          >
            <div className={`relative flex items-center h-10 w-full rounded-xl transition-all duration-300 border ${
              isLight 
                ? 'bg-slate-50 border-slate-200 focus-within:border-[#7c5cff] focus-within:ring-2 focus-within:ring-[#7c5cff]/20 shrink-0' 
                : 'bg-[#12182d]/60 border-white/[0.08] focus-within:border-[#7c5cff] focus-within:ring-2 focus-within:ring-[#7c5cff]/20 shrink-0'
            } ${!aiSmartTried ? 'animate-glow-pulse animate-shimmer-sweep border-[#7c5cff]/60 shadow-lg shadow-violet-500/10' : ''}`}>
              {/* Left Sparkles Icon */}
              <div className="absolute left-3 text-violet-400 group-hover:scale-110 transition-transform flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-[#7c5cff]" />
              </div>

              {/* Text Input */}
              <input
                type="text"
                value={navbarAiInput}
                onChange={(e) => setNavbarAiInput(e.target.value)}
                onFocus={markAiSmartTried}
                placeholder="Catat cepat (AI): 'makan bakso 25rb jago'..."
                className={`w-full pl-9 pr-14 bg-transparent text-xs font-semibold focus:outline-none placeholder:text-[#9aa4bf]/60 ${
                  isLight ? 'text-slate-800' : 'text-slate-100'
                }`}
              />

              {/* Submit Button inside input container */}
              <button
                type="submit"
                className="absolute right-1.5 h-7 px-2.5 text-[10px] font-bold text-white bg-gradient-to-r from-[#7c5cff] to-[#6c4be6] hover:from-[#6c4be6] hover:to-[#5a3bc2] rounded-lg transition-all active:scale-95 shadow-md shadow-violet-500/10 cursor-pointer flex items-center gap-1"
              >
                <span>Catat</span>
                <ChevronRight className="h-3 w-3 opacity-80" />
              </button>
            </div>

            {/* Dynamic visual attention grabber badge */}
            {!aiSmartTried ? (
              <span className="absolute -top-2.5 -right-2 bg-gradient-to-r from-[#10b981] to-[#059669] text-white text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-lg shadow-emerald-500/20 tracking-widest uppercase animate-bounce flex items-center justify-center z-20 border border-emerald-400/40 select-none pointer-events-none font-mono">
                NEW
              </span>
            ) : (
              <span className="absolute -top-2 -right-2 bg-slate-900 border border-emerald-500/30 text-emerald-400 text-[6px] font-black px-1.5 py-0.5 rounded-full shadow-inner flex items-center gap-0.5 z-20 select-none pointer-events-none scale-90 leading-none">
                ✔ Sudah Dicoba
              </span>
            )}
          </form>

          {/* Desktop controls listing */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            {/* Accent colored state pill */}
            <span className="hidden md:inline-block px-1.5 py-1 text-[9px] font-mono font-bold bg-[#7c5cff]/20 text-white rounded-md tracking-wider">
              IDR NET SALDO: {formatCurrency(totalInflowSum)}
            </span>

            {/* Quick theme toggler slider */}
            <button
              onClick={() => setUserProfile(prev => ({
                ...prev,
                themeMode: prev.themeMode === 'light' ? 'dark' : 'light'
              }))}
              className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors bg-white/[0.02] border border-white/5 cursor-pointer"
              title="Ganti Tema Visual"
            >
              {isLight ? <Moon className="h-4.5 w-4.5 text-indigo-400" /> : <Sun className="h-4.5 w-4.5 text-amber-400" />}
            </button>

            {/* NOTIFICATION BELL WITH RED PULSING BADGE */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className={`p-2 rounded-xl transition-all border cursor-pointer relative ${
                  showNotificationDropdown
                    ? 'bg-[#7c5cff]/20 text-white border-[#7c5cff]/30 shadow-md shadow-violet-500/10'
                    : 'text-slate-400 hover:text-white bg-white/[0.02] border-white/5 hover:border-white/10'
                }`}
                title="Notifikasi Sistem"
              >
                <Bell className={`h-4.5 w-4.5 ${totalNotificationsCount > 0 ? 'text-red-400 font-bold animate-pulse' : ''}`} />
                
                {/* 2. Pulsing Notification Badge */}
                {totalNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center">
                    <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-red-650 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600 text-[9px] font-bold text-white items-center justify-center font-mono">
                      {totalNotificationsCount}
                    </span>
                  </span>
                )}
              </button>

              {/* 3. Konten Dropdown Notifikasi */}
              {showNotificationDropdown && (
                <div className={`absolute right-0 mt-2.5 w-80 sm:w-[420px] rounded-2xl border shadow-2xl p-4 z-50 text-left animate-slide-in ${
                  isLight 
                    ? 'bg-white border-slate-200 text-slate-800' 
                    : 'bg-[#0f1424] border-white/[0.08] text-white'
                }`}>
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.05] mb-3">
                    <p className="text-xs font-black uppercase font-mono tracking-wider text-[#9aa4bf]">Peringatan Keuangan</p>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                      totalNotificationsCount > 0 ? 'bg-red-500/15 text-red-00' : 'bg-emerald-500/15 text-emerald-400'
                    }`}>
                      {totalNotificationsCount} Peringatan Kritis
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                    {totalNotificationsCount === 0 ? (
                      <div className="text-center py-6">
                        <ShieldCheck className="h-8 w-8 text-emerald-400 mx-auto mb-2 animate-bounce" />
                        <p className="text-xs font-bold text-slate-350">Semua Kategori Aman!</p>
                        <p className="text-[10px] text-slate-400 mt-1 text-center font-sans">Belum ada anggaran melebihi batas atau tagihan mendekati jatuh tempo.</p>
                      </div>
                    ) : (
                      <>
                        {/* Budget warning sub-section */}
                        {budgetWarnings.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[9px] font-bold text-[#a5b4fc] uppercase font-mono tracking-wider">⚠️ Melebihi Batas Anggaran ({budgetWarnings.length})</p>
                            {budgetWarnings.map((warning, idx) => (
                              <div 
                                key={`budget-desc-${idx}`} 
                                className="p-3 rounded-xl bg-red-500/[0.03] border border-red-500/10 hover:bg-red-500/[0.06] transition-all"
                              >
                                <p className="text-xs font-bold text-white mb-1">Batas Anggaran {warning.category}</p>
                                <p className="text-[10px] text-[#9aa4bf] leading-relaxed">
                                  Pengeluaran Kategori <span className="text-[#a994ff] font-bold">'{warning.category}'</span> mencapai <span className="font-mono text-[#ff5c7a] font-bold">{formatCurrency(warning.spent)}</span> dari <span className="font-mono text-[#00d4ff] font-bold">{formatCurrency(warning.budget)}</span> ({warning.percentage.toFixed(0)}%). Harap rem pengeluaran!
                                </p>
                                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-2 relative">
                                  <div 
                                    className="h-full bg-red-500 rounded-full"
                                    style={{ width: `${Math.min(100, warning.percentage)}%` }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Debt and receivables warnings sub-section */}
                        {debtWarnings.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                            <p className="text-[9px] font-bold text-[#fbcfe8] uppercase font-mono tracking-wider">📅 Jatuh Tempo Hutang & Piutang ({debtWarnings.length})</p>
                            {debtWarnings.map((warning, idx) => (
                              <div 
                                key={`debt-desc-${idx}`} 
                                className={`p-3 rounded-xl border transition-all ${
                                  warning.isOverdue 
                                    ? 'bg-red-500/[0.03] border-red-500/15 hover:bg-red-500/[0.06]' 
                                    : 'bg-amber-500/[0.02] border-amber-500/10 hover:bg-amber-500/[0.05]'
                                }`}
                              >
                                <p className="text-[10px] leading-relaxed text-[#f1f5f9]">
                                  {warning.message}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/[0.05] mt-3 flex justify-between items-center text-[10px]">
                    <button 
                      onClick={() => {
                        setShowNotificationDropdown(false);
                        setActiveTab('debts');
                      }}
                      className="font-bold text-[#fbcfe8] hover:text-white transition-colors flex items-center gap-1 font-mono uppercase text-[9px]"
                    >
                      <HeartPulse className="h-3.5 w-3.5 text-[#ff5c7a]" />
                      <span>Kelola Tagihan</span>
                    </button>

                    <button 
                      onClick={() => {
                        setShowNotificationDropdown(false);
                        setActiveTab('settings');
                      }}
                      className="font-bold text-[#7c5cff] hover:text-[#977eff] transition-colors flex items-center gap-1 font-mono uppercase text-[9px] ml-auto"
                    >
                      <span>Atur Anggaran</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick settings button */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`p-2 rounded-xl transition-colors border cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#7c5cff]/20 text-white border-[#7c5cff]/30'
                  : 'text-slate-400 hover:text-white bg-white/[0.02] border-white/5'
              }`}
              title="Pengaturan"
            >
              <Settings className="h-4.5 w-4.5" />
            </button>

            {/* Mini avatar frame */}
            <img 
              src={userProfile.avatarUrl} 
              alt="Avatar" 
              className="h-8.5 w-8.5 rounded-full object-cover ring-1 ring-[#7c5cff]/30 cursor-pointer"
              onClick={() => setActiveTab('settings')}
            />
          </div>
        </header>

        {/* MOBILE SLIDE-OUT MENU DRAWER */}
        {mobileMenuOpen && (
          <div className="xl:hidden fixed inset-0 z-40 flex">
            <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
            <div className="relative flex flex-col w-56 max-w-xs bg-slate-900 border-r border-white/5 p-4 z-10 text-white space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-xs font-mono font-bold text-[#7c5cff]">MENU STRUKTUR</span>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="space-y-1 overflow-y-auto">
                {isEditingSidebar ? (
                  <>
                    <div className="space-y-1 pb-4 flex flex-col">
                      {tempSidebarOrder.map((id, idx) => {
                        const item = menuItems.find(i => i.id === id);
                        if (!item) return null;
                        const Icon = item.icon;
                        const isBeingDragged = draggedIndex === idx;

                        return (
                          <div
                            key={item.id}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-left text-xs font-bold capitalize border transition-all select-none ${
                              isBeingDragged 
                                ? 'border-dashed border-[#7c5cff] bg-[#7c5cff]/5 opacity-50 scale-95'
                                : 'bg-slate-800/40 border-white/5 text-[#9aa4bf]'
                            }`}
                            style={{ cursor: 'grab' }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <GripVertical className="h-4 w-4 text-slate-500 shrink-0 cursor-grab active:cursor-grabbing" />
                              <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </div>

                            {/* Manual Up/Down touch fallback controls */}
                            <div className="flex items-center gap-0.5 shrink-0 ml-1.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveMenuUp(idx)}
                                className={`p-1 rounded-md transition-all ${
                                  idx === 0 
                                    ? 'text-slate-600/20 cursor-not-allowed' 
                                    : 'text-slate-400 hover:text-[#7c5cff] hover:bg-white/5 cursor-pointer'
                                }`}
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === tempSidebarOrder.length - 1}
                                onClick={() => moveMenuDown(idx)}
                                className={`p-1 rounded-md transition-all ${
                                  idx === tempSidebarOrder.length - 1 
                                    ? 'text-slate-600/20 cursor-not-allowed' 
                                    : 'text-slate-400 hover:text-[#7c5cff] hover:bg-white/5 cursor-pointer'
                                }`}
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t border-white/5 pt-3 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSidebarOrder(tempSidebarOrder);
                            localStorage.setItem('LKP_SIDEBAR_ORDER', JSON.stringify(tempSidebarOrder));
                            if (gdriveUser) {
                              const userRef = doc(db, 'users', gdriveUser.uid);
                              setDoc(userRef, { sidebarOrder: tempSidebarOrder }, { merge: true })
                                .then(() => showToast('Urutan baru disimpan ke cloud!', 'success'))
                                .catch(() => showToast('Gagal menyinkronkan urutan.', 'error'));
                            } else {
                              showToast('Urutan baru disimpan di lokal!', 'success');
                            }
                            setIsEditingSidebar(false);
                          }}
                          className="flex-1 py-1.5 px-2 text-[10px] font-bold rounded-lg bg-[#16c784] text-white text-center cursor-pointer"
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingSidebar(false);
                            showToast('Pengaturan urutan dibatalkan.', 'info');
                          }}
                          className="flex-1 py-1.5 px-2 text-[10px] font-bold rounded-lg bg-white/10 text-slate-300 text-center cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTempSidebarOrder(DEFAULT_MENU_ORDER);
                          showToast('Urutan menu dibalikkan ke default!', 'warning');
                        }}
                        className="w-full text-center text-[9px] font-bold tracking-tight py-1 text-red-400 hover:underline cursor-pointer mt-0.5"
                      >
                        Reset Urutan Menu
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const moveables = sidebarOrder.filter(id => id !== 'settings');
                        setTempSidebarOrder(moveables);
                        setIsEditingSidebar(true);
                        showToast('Mode Atur Sidebar diaktifkan!', 'info');
                      }}
                      className="w-full mb-3 py-2 px-3 text-[10px] font-mono font-bold uppercase tracking-wider rounded-xl border border-white/10 hover:bg-white/5 text-[#9aa4bf] flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
                    >
                      <Layers className="h-3.5 w-3.5 shrink-0 text-[#7c5cff]" />
                      Atur Sidebar Menu
                    </button>
                    {sortedMenuItems.map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold capitalize transition-all cursor-pointer ${
                            isActive ? 'bg-[#7c5cff] text-white' : 'text-[#9aa4bf] hover:bg-white/5'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. WORKING WORKSPACE PANELS ROUTER */}
        <main className="flex-1 py-4 px-4 sm:px-6 pb-20 xl:pb-4 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                transactions={transactions}
                accounts={accounts}
                assets={assets}
                debts={debts}
                userProfile={userProfile}
                onNavigate={setActiveTab}
                onCommitAI={handleCommitAI}
                emergencyConfig={emergencyConfig}
              />
            )}

            {activeTab === 'emergency_fund' && (
              <EmergencyFundPlannerView
                transactions={transactions}
                accounts={accounts}
                assets={assets}
                onAddTransaction={handleAddTransaction}
                onAddNotification={(notif) => {
                  setNotifications(prev => [notif, ...prev]);
                }}
                emergencyConfig={emergencyConfig}
                onUpdateEmergencyConfig={setEmergencyConfig}
              />
            )}

            {activeTab === 'goals' && (
              <FinancialGoalsView
                goals={goals}
                onAddGoal={(g: Goal) => setGoals(prev => [g, ...prev])}
                onEditGoal={(updatedGoal: Goal) => setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g))}
                onDeleteGoal={(id: string) => setGoals(prev => prev.filter(g => g.id !== id))}
              />
            )}

            {activeTab === 'budget' && (
              <BudgetPlannerView
                transactions={transactions}
                categoryBudgets={categoryBudgets}
                onUpdateBudget={(cat, amt) => setCategoryBudgets(prev => ({ ...prev, [cat]: amt }))}
              />
            )}

            {activeTab === 'forecast' && (
              <CashflowForecastView
                transactions={transactions}
                accounts={accounts}
                assets={assets}
                debts={debts}
              />
            )}

            {activeTab === 'autopay' && (
              <RecurringTransactionView
                recurringTransactions={recurringTransactions}
                billReminders={billReminders}
                onAddRecurring={(item) => setRecurringTransactions(prev => [item, ...prev])}
                onUpdateRecurringStatus={(id, status) => setRecurringTransactions(prev => prev.map(r => r.id === id ? { ...r, status } : r))}
                onDeleteRecurring={(id) => setRecurringTransactions(prev => prev.filter(r => r.id !== id))}
                onAddBillReminder={(item) => setBillReminders(prev => [item, ...prev])}
                onDeleteBillReminder={(id) => setBillReminders(prev => prev.filter(r => r.id !== id))}
              />
            )}

            {activeTab === 'health' && (
              <FinancialHealthView
                transactions={transactions}
                accounts={accounts}
                assets={assets}
                debts={debts}
              />
            )}

            {activeTab === 'notifications_tab' && (
              <NotificationCenterView
                notifications={notifications}
                onMarkRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))}
                onMarkAllRead={() => setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))}
                onClearNotifications={() => setNotifications([])}
              />
            )}

            {activeTab === 'transactions' && (
              <TransaksiView
                transactions={transactions}
                accounts={accounts}
                onAddTransaction={handleAddTransaction}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onDuplicateTransaction={handleDuplicateTransaction}
                onCommitAI={handleCommitAI}
                aiSmartTried={aiSmartTried}
                onAiSmartTried={markAiSmartTried}
              />
            )}

            {activeTab === 'accounts' && (
              <SumberUangView
                accounts={accounts}
                onAddAccount={handleAddAccount}
                onEditAccount={handleEditAccount}
                onDeleteAccount={handleDeleteAccount}
              />
            )}

            {activeTab === 'assets' && (
              <AsetView
                assets={assets}
                onAddAsset={handleAddAsset}
                onEditAsset={handleEditAsset}
                onDeleteAsset={handleDeleteAsset}
              />
            )}

            {activeTab === 'debts' && (
              <HutangPiutangView
                debts={debts}
                accounts={accounts}
                onAddDebt={handleAddDebt}
                onEditDebt={handleEditDebt}
                onDeleteDebt={handleDeleteDebt}
                onPayDebtInstallment={handlePayDebtInstallment}
              />
            )}

            {activeTab === 'calendar' && (
              <KalenderView
                transactions={transactions}
              />
            )}

            {activeTab === 'statistics' && (
              <StatistikView
                transactions={transactions}
              />
            )}

            {/* SETTINGS PANEL COMPONENT VIEW CONTAINER */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-white">Konfigurasi Pengaturan LKP</h1>
                  <p className="text-xs text-[#9aa4bf]">Atur setelan data backup ekspor serta personalisasi akun Anda di dashboard</p>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.06] p-6 rounded-[28px] space-y-6">
                  {/* Grid Profile update name inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono">Nama Pengguna (Nickname)</label>
                      <input 
                        type="text" 
                        value={userProfile.name}
                        onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#0c1020] text-xs text-white rounded-xl border border-white/5 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono">Dashboard Branding Slogan</label>
                      <input 
                        type="text" 
                        value={userProfile.dashboardName}
                        onChange={(e) => setUserProfile(prev => ({ ...prev, dashboardName: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#0c1020] text-xs text-white rounded-xl border border-white/5 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Upload photo simulation links */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">Profile Picture Avatar URL</label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-white/[0.01] border border-white/5 p-3.5 rounded-xl">
                      {/* Image Preview */}
                      <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-[#7c5cff]/30 bg-[#0c1020] shrink-0 flex items-center justify-center relative group">
                        {userProfile.avatarUrl ? (
                          <img 
                            src={userProfile.avatarUrl} 
                            alt="Avatar Preview" 
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80';
                            }}
                          />
                        ) : (
                          <span className="text-[10px] text-[#9aa4bf]">No Pic</span>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex-1 space-y-2.5 min-w-0 text-left">
                        <input 
                          type="text" 
                          placeholder="Paste image URL here..."
                          value={userProfile.avatarUrl}
                          onChange={(e) => setUserProfile(prev => ({ ...prev, avatarUrl: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#0c1020] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff]"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="px-3 py-1.5 bg-[#7c5cff]/10 hover:bg-[#7c5cff]/20 text-[#a994ff] hover:text-[#cabafe] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-[#7c5cff]/20 transition-all">
                            <Upload className="h-3.5 w-3.5" /> Pilih File Gambar
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    if (typeof reader.result === 'string') {
                                      setUserProfile(prev => ({ ...prev, avatarUrl: reader.result as string }));
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                          <button 
                            type="button"
                            onClick={() => setUserProfile(prev => ({ ...prev, avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80' }))}
                            className="px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] text-[#9aa4bf] hover:text-white rounded-xl text-xs font-bold transition-all border border-white/5 cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CATEGORY BUDGETS CONFIGURATION SECTION */}
                  <div className="pt-6 border-t border-white/[0.05] space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#ff5c7a]/10 text-[#ff5c7a]">
                        <Target className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Batas Anggaran Pengeluaran Bulanan (Budget Cap)</h3>
                        <p className="text-[10px] text-[#9aa4bf]">Tentukan batas maksimal anggaran bulanan per kategori pengeluaran untuk mengaktifkan sistem peringatan over-budget real-time.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Interactive list of current active thresholds with sliders */}
                      <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/[0.05] space-y-3">
                        <p className="text-[#a5b4fc] text-[10px] font-bold font-mono tracking-wider text-left border-b border-white/5 pb-1.5">Kategori & Batas Setelan Saat Ini</p>
                        
                        <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                          {Object.entries(categoryBudgets).length === 0 ? (
                            <p className="text-xs text-[#9aa4bf] text-center py-4">Belum ada batas anggaran yang diatur.</p>
                          ) : (
                            Object.entries(categoryBudgets).map(([catName, capAmount]) => {
                              const spent = spentMap[catName] || 0;
                              const percentage = capAmount > 0 ? (spent / capAmount) * 100 : 0;
                              
                              return (
                                <div key={catName} className="p-3 rounded-xl bg-[#0c1224] border border-white/[0.04] flex flex-col gap-2">
                                  <div className="flex items-center justify-between">
                                    <div className="text-left font-bold text-xs text-white">
                                      {catName}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = { ...categoryBudgets };
                                        delete updated[catName];
                                        setCategoryBudgets(updated);
                                        showToast(`Batas anggaran kategori '${catName}' berhasil dihapus.`, 'info');
                                      }}
                                      className="p-1 text-[#ff5c7a] hover:bg-white/5 rounded-md transition-colors"
                                      title="Reset Batas"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 text-left min-w-0">
                                      {/* Realtime progress */}
                                      <div className="flex justify-between text-[10px] text-[#9aa4bf]">
                                        <span>Terpakai: <strong className={percentage >= 90 ? 'text-red-400 font-mono' : 'text-[#16c784] font-mono'}>{formatCurrency(spent)}</strong></span>
                                        <span>Batas: <strong className="text-white font-mono">{formatCurrency(capAmount)}</strong></span>
                                      </div>
                                      
                                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-1.5 relative border border-white/5">
                                        <div 
                                          className={`h-full rounded-full transition-all duration-300 ${
                                            percentage >= 100 ? 'bg-red-500' : percentage >= 90 ? 'bg-amber-500 animate-pulse' : 'bg-[#7c5cff]'
                                          }`}
                                          style={{ width: `${Math.min(100, percentage)}%` }}
                                        ></div>
                                      </div>
                                    </div>

                                    {/* Direct inline input for fast tuning */}
                                    <div className="w-28 shrink-0">
                                      <div className="relative">
                                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-[#9aa4bf] font-mono">Rp</span>
                                        <input
                                          type="text"
                                          value={capAmount === 0 ? '' : capAmount.toLocaleString('id-ID')}
                                          onChange={(e) => {
                                            const rawVal = e.target.value.replace(/\D/g, '');
                                            const numVal = rawVal ? parseInt(rawVal) : 0;
                                            setCategoryBudgets(prev => ({
                                              ...prev,
                                              [catName]: numVal
                                            }));
                                          }}
                                          className="w-full pl-6 pr-1.5 py-1 text-[11px] font-mono bg-[#060a14] font-bold text-right text-[#00d4ff] rounded-lg border border-white/10 focus:outline-none focus:border-[#7c5cff]"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Right: Quick threshold control & addNew interface card container */}
                      <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/[0.05] flex flex-col justify-between">
                        <div className="space-y-4">
                          <p className="text-[#a5b4fc] text-[10px] font-bold font-mono tracking-wider text-left border-b border-white/5 pb-1.5">Atur Anggaran Kategori Baru / Perbarui</p>
                          
                          <div className="space-y-3">
                            <div className="space-y-1.5 text-left">
                              <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono">Pilih Kategori / Rekomendasi</label>
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  id="budget-category-selector"
                                  className="px-3 py-1.5 bg-[#0c1020] text-xs text-white rounded-xl border border-white/10 focus:outline-none"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const nameInput = document.getElementById('budget-category-custom-input') as HTMLInputElement;
                                    if (val && nameInput) {
                                      nameInput.value = val;
                                      const event = new Event('input', { bubbles: true });
                                      nameInput.dispatchEvent(event);
                                    }
                                  }}
                                  defaultValue=""
                                >
                                  <option value="">-- Presets --</option>
                                  {EXPENSE_CATEGORIES.map(c => (
                                    <option key={c.name} value={c.name}>{c.name}</option>
                                  ))}
                                  <option value="Operasional Workshop">Operasional Workshop</option>
                                  <option value="Vendor Tambahan">Vendor Tambahan</option>
                                </select>

                                <input
                                  id="budget-category-custom-input"
                                  placeholder="Nama Kategori..."
                                  type="text"
                                  className="px-3 py-1.5 bg-[#0c1020] text-xs text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#7c5cff]"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5 text-left">
                              <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono">Batas Nilai Anggaran Bulanan (Rp)</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#9aa4bf] font-semibold">Rp</span>
                                <input
                                  id="budget-amount-input"
                                  placeholder="Contoh: 5.000.000"
                                  type="text"
                                  onChange={(e) => {
                                    const rawVal = e.target.value.replace(/\D/g, '');
                                    const numVal = rawVal ? parseInt(rawVal) : 0;
                                    e.target.value = numVal > 0 ? numVal.toLocaleString('id-ID') : '';
                                  }}
                                  className="w-full pl-10 pr-3 py-1.5 bg-[#0c1020] text-xs text-white font-mono rounded-xl border border-white/10 focus:outline-none focus:border-[#7c5cff]"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-white/[0.04] mt-4">
                          <button
                            type="button"
                            onClick={() => {
                              const nameInput = document.getElementById('budget-category-custom-input') as HTMLInputElement;
                              const amtInput = document.getElementById('budget-amount-input') as HTMLInputElement;
                              
                              if (!nameInput || !nameInput.value.trim()) {
                                showToast('Harap tentukan nama kategori terlebih dahulu!', 'error');
                                return;
                              }
                              
                              const amtVal = amtInput ? amtInput.value.replace(/\D/g, '') : '';
                              if (!amtVal || parseInt(amtVal) <= 0) {
                                showToast('Harap cantumkan nominal batas anggaran yang valid!', 'error');
                                return;
                              }
                              
                              const targetCatName = nameInput.value.trim();
                              const targetAmt = parseInt(amtVal);
                              
                              setCategoryBudgets(prev => ({
                                ...prev,
                                [targetCatName]: targetAmt
                              }));
                              
                              showToast(`Berhasil menyimpan batas anggaran ${targetCatName} sebesar ${formatCurrency(targetAmt)}`, 'success');
                              
                              // Clear forms
                              nameInput.value = '';
                              const sel = document.getElementById('budget-category-selector') as HTMLSelectElement;
                              if (sel) sel.value = '';
                              if (amtInput) amtInput.value = '';
                            }}
                            className="w-full py-2 bg-[#7c5cff] hover:bg-[#6847ff] text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Terapkan Batas Anggaran</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Backup / Restore Database files */}
                  <div className="pt-4 border-t border-white/[0.05] space-y-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Akses Backup Ekspor database</h3>
                    <p className="text-[11px] text-[#9aa4bf]">Unduh cadangan data Anda dalam format JSON untuk dipindahkan sewaktu-waktu.</p>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button 
                        onClick={handleExportJSON}
                        className="px-4 py-2 bg-white/[0.05] hover:bg-white/10 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-white/5"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Ekspor Backup JSON
                      </button>
                      
                      <div className="relative">
                        <button className="px-4 py-2 bg-[#7c5cff]/10 hover:bg-[#7c5cff]/20 text-[#7c5cff] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-[#7c5cff]/20">
                          <Upload className="h-3.5 w-3.5" /> Unggah Pulihkan JSON
                        </button>
                        <input 
                          type="file" 
                          accept=".json"
                          onChange={handleImportJSON}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* GOOGLE DRIVE SYNC SETTINGS CARD */}
                  <div className="pt-5 border-t border-white/[0.05] space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#7c5cff]/10 text-[#cabafe]">
                        <Upload className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Penyimpanan Awan & Google Drive</h3>
                        <p className="text-[10px] text-[#9aa4bf]">Sinkronisasi draf otomatis yang aman di Google Drive Anda: <code className="text-[#cabafe] font-mono">pembukuan_pribadi_{gdriveUser?.email || '(email)'}.json</code></p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
                      {gdriveUser ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a0f1d] p-3 rounded-xl border border-white/[0.04]">
                            <div className="flex items-center gap-2.5">
                              <img src={gdriveUser.photoURL || userProfile.avatarUrl} alt="GDrive User" className="h-8 w-8 rounded-full border border-[#7c5cff]/30 object-cover" />
                              <div>
                                <p className="text-xs font-bold text-white leading-tight">{gdriveUser.displayName || 'Pengguna Google'}</p>
                                <p className="text-[10px] text-[#16c784] font-mono leading-none mt-1">● Terhubung: {gdriveUser.email}</p>
                              </div>
                            </div>
                            <button
                              onClick={handleGdriveLogout}
                              className="px-3 py-1.5 rounded-xl bg-red-400/10 hover:bg-red-400/20 text-[#ff5c7a] text-[10px] font-bold border border-red-500/10 cursor-pointer transition-colors active:scale-95"
                            >
                              Putuskan Sesi
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2.5 pt-1">
                            <button
                              onClick={handleManualGDriveBackup}
                              disabled={isSavingManualCloud || !gdriveToken}
                              className="px-3.5 py-2 bg-[#7c5cff] hover:bg-[#6847ff] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#7c5cff]/10 disabled:opacity-50 transition-all active:scale-95"
                            >
                              {isSavingManualCloud ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                              <span>Simpan Draf Cloud Sekarang</span>
                            </button>
                            
                            <button
                              onClick={() => gdriveToken && handleCheckAndAutoLoadDraft(gdriveToken)}
                              className="px-3.5 py-2 bg-white/[0.05] hover:bg-white/10 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-white/5 transition-all active:scale-95"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span>Muat Cadangan Cloud</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-4 text-center space-y-3">
                          <p className="text-xs text-[#9aa4bf]">Sesi penyimpanan awan terputus. Silakan hubungkan untuk mengaktifkan sinkronisasi otomatis.</p>
                          <button
                            onClick={handleGdriveLogin}
                            className="px-4 py-2 bg-white text-slate-800 hover:bg-slate-50 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.98]"
                          >
                            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4">
                              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                            </svg>
                            <span>Hubungkan Google Drive</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reset Database Trigger danger button */}
                  <div className="pt-6 border-t border-red-500/10 space-y-2">
                    <h3 className="text-xs font-bold text-[#ff5c7a] uppercase tracking-wider font-mono">Zona Penghancuran Data</h3>
                    <p className="text-[11px] text-[#9aa4bf]">Setel ulang seluruh transaksi, sumber uang BCA, dan hutang aset kembali ke titik nol.</p>
                    <button 
                      onClick={() => setShowResetConfirm(true)}
                      className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-[#ff5c7a] rounded-xl text-xs font-bold cursor-pointer border border-red-500/20 transition-colors"
                    >
                      Mulai Dari Nol (Reset Total)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* SATISFYING TOAST FLOATING ALERTS */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 border border-white/[0.08] shadow-2xl flex items-center gap-3 animate-slide-in relative overflow-hidden min-w-[280px]">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#7c5cff]"></div>
            <div className={`p-2.5 rounded-xl ${
              toast.type === 'success' ? 'bg-[#16c784]/10 text-[#16c784]' :
              toast.type === 'error' ? 'bg-[#ff5c7a]/15 text-[#ff5c7a]' : 'bg-[#00d4ff]/10 text-[#00d4ff]'
            }`}>
              {toast.type === 'success' ? <ShieldCheck className="h-4.5 w-4.5" /> : <AlertCircle className="h-4.5 w-4.5" />}
            </div>
            <p className="text-xs font-bold text-white leading-tight">{toast.message}</p>
          </div>
        )}

        {/* CUSTOM CONFIRMATION SAFE BOX FOR DELETING LIFECYCLE */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <div className="w-full max-w-sm p-6 rounded-[28px] bg-[#0c1020] border border-white/[0.1] shadow-2xl text-center space-y-4 text-white">
              <div className="h-12 w-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center text-[#ff5c7a]">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Yakin Reset Seluruh Database?</h4>
                <p className="text-xs text-[#9aa4bf] mt-1.5 leading-relaxed">Seluruh mutasi harian, portofolio reksa dana BBCA, dan alarm hutang piutang Anda akan dimusnahkan secara permanen.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  onClick={handleResetToZero}
                  className="py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-xs font-bold cursor-pointer"
                >
                  Reset Sekarang
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- 1. POPUP LOGIN GOOGLE DRIVE & CLOUD STORAGE OVERLAY --- */}
        {showGdrivePopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#060913]/95 backdrop-blur-xl animate-fade-in">
            <div className="relative w-full max-w-md p-8 bg-[#0e1328] border border-[#7c5cff]/30 rounded-[32px] shadow-2xl text-center space-y-6">
              {/* Outer glowing effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#7c5cff]/10 to-transparent rounded-[32px] pointer-events-none -z-10 blur-xl"></div>
              
              <div className="mx-auto h-16 w-16 bg-[#7c5cff]/10 rounded-2xl flex items-center justify-center border border-[#7c5cff]/20 animate-pulse">
                <Upload className="h-8 w-8 text-[#7c5cff]" />
              </div>
              
              <div className="space-y-2">
                <span className="inline-block px-2 py-0.5 rounded-md bg-[#7c5cff]/25 text-[#cabafe] text-[9px] font-bold uppercase tracking-wider font-mono">
                  SINKRONISASI KEUANGAN SEAMLESS
                </span>
                <h2 className="text-xl font-black text-white">Penyimpanan Awan & Google Drive</h2>
                <p className="text-xs text-[#9aa4bf] leading-relaxed">
                  Autentikasi sesi cloud untuk mengaktifkan sinkronisasi draf otomatis, mencegah kehilangan data, dan memulihkan laporan keuangan secara instan.
                </p>
              </div>

              <div className="py-2 space-y-3">
                {isLoggingIn ? (
                  <div className="flex flex-col items-center justify-center py-4 gap-3">
                    <div className="h-8 w-8 rounded-full border-2 border-[#7c5cff] border-t-transparent animate-spin" />
                    <span className="text-xs text-[#cabafe] font-medium font-mono animate-pulse">Menghubungkan Akun Google...</span>
                  </div>
                ) : (
                  <button 
                    onClick={handleGdriveLogin}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-slate-800 hover:bg-slate-50 rounded-2xl font-black text-sm shadow-xl transition-all hover:shadow-[#7c5cff]/10 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer"
                  >
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    <span>Masuk dengan Google Drive</span>
                  </button>
                )}
              </div>

              <div className="pt-3 border-t border-white/[0.04] flex flex-col gap-1 items-center">
                <button 
                  onClick={() => {
                    setShowGdrivePopup(false);
                    showToast('Aplikasi berjalan dalam mode Lokal (Luring)', 'info');
                  }}
                  className="text-[11px] text-[#9aa4bf] hover:text-white transition-colors underline decoration-dotted decoration-white/20 capitalize font-medium cursor-pointer"
                >
                  Lompati &amp; Gunakan Mode Offline (Lokal)
                </button>
                <p className="text-[9px] text-[#555d73]">Sesi terputus otomatis setiap halaman dimuat ulang (Refresh)</p>
              </div>
            </div>
          </div>
        )}

        {/* --- 2. MODERN LOAD SYNC INTEGRATION LOADING INDICATOR & NOTIFICATION MODAL --- */}
        {showSyncIndicator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <div className="relative w-full max-w-lg p-8 bg-[#0a0f22] border-2 border-[#7c5cff]/40 rounded-[36px] shadow-2xl text-center space-y-6 overflow-hidden">
              <div className="absolute -top-12 -left-12 h-24 w-24 bg-[#7c5cff]/30 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-12 -right-12 h-24 w-24 bg-[#00d4ff]/25 rounded-full blur-2xl"></div>

              {/* Progress visual or Warning icon based on mode */}
              <div className="mx-auto flex items-center justify-center">
                {syncIndicatorType === 'warning' ? (
                  <div className="h-16 w-16 bg-[#ff5c7a]/15 rounded-full flex items-center justify-center border border-[#ff5c7a]/30 animate-pulse">
                    <AlertCircle className="h-8 w-8 text-[#ff5c7a]" />
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center">
                    <div className="h-16 w-16 rounded-full border-4 border-white/[0.04] border-t-[#7c5cff] animate-spin" />
                    <Upload className="h-6 w-6 text-[#7c5cff] absolute animate-bounce" />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {syncIndicatorType === 'warning' ? (
                  <div className="space-y-4">
                    <div className="px-3 py-1.5 rounded-full bg-[#ff5c7a]/10 border border-[#ff5c7a]/20 text-[#ff5c7a] inline-block text-[11px] font-bold tracking-tight uppercase font-mono">
                      Ditemukan Backup Cloud!
                    </div>
                    <div className="text-left bg-white/[0.01] border border-white/[0.06] p-4 rounded-2xl relative">
                      <p className="text-xs font-bold text-white text-center">Google Drive draft sinkronisasi terdeteksi.</p>
                      <p className="text-xs text-[#9aa4bf] mt-2 leading-relaxed text-center">
                        Ada berkas cadangan <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[#00d4ff]">pembukuan_pribadi_{auth.currentUser?.email || 'pribadi'}.json</code> di Google Drive Anda
                      </p>
                      <p className="text-xs text-[#ff5c7a] font-bold mt-3 text-center border-t border-white/[0.05] pt-2.5">
                        ⚠️ PERHATIAN: Memulihkan draft ini akan menumpuk (menghapus permanen) seluruh data lokal yang anda ada saat ini.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#00d4ff] font-mono leading-none font-extrabold uppercase tracking-widest leading-none">PENDERITAAN BERAKHIR</span>
                    <h3 className="text-lg font-black text-white">Memproses Sinkronisasi</h3>
                  </div>
                )}

                {/* Status Message */}
                <p className="text-xs text-[#9aa4bf] whitespace-pre-line leading-relaxed max-w-sm mx-auto">
                  {syncIndicatorType === 'warning' ? '' : syncStatusMsg}
                </p>
              </div>

              {/* Action Buttons with auto selection triggers info */}
              <div className="pt-2 border-t border-white/[0.05] space-y-3">
                {countdownMsg && (
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex flex-col items-center justify-center gap-1.5 shadow-inner">
                    <div className="h-1.5 w-full max-w-[200px] bg-white/[0.04] rounded-full overflow-hidden relative">
                      <div className="absolute top-0 bottom-0 left-0 bg-[#7c5cff] rounded-full animate-pulse" style={{ width: '100%' }}></div>
                    </div>
                    <span className="text-[11px] font-bold text-[#cabafe] font-mono animate-pulse">
                      {countdownMsg}
                    </span>
                  </div>
                )}

                {syncIndicatorType === 'warning' && (
                  <div className="grid grid-cols-2 gap-3.5">
                    {/* User requested: "otomatis pilih muat draf, sambil menunggu muat draf tampil loading" - button states highlight selection */}
                    <button 
                      className="py-3 px-4 rounded-xl bg-white/[0.03] text-[#9aa4bf] text-xs font-semibold border border-white/[0.06] opacity-60 flex items-center justify-center gap-1"
                      disabled
                    >
                      Simpan Lokal saja
                    </button>
                    <button 
                      className="py-3 px-4 rounded-xl bg-[#7c5cff] text-white text-xs font-extrabold shadow-lg shadow-[#7c5cff]/10 flex items-center justify-center gap-1.5 border border-[#7c5cff]/30 relative"
                      disabled
                    >
                      <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-md bg-[#16c784] text-white text-[8px] uppercase tracking-normal animate-bounce font-mono">Auto</span>
                      Ya, Muat Draft
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MOBILE BOTTOM NAVIGATION PANEL BAR */}
        <div className={`xl:hidden fixed bottom-0 left-0 right-0 h-16 border-t flex items-center justify-around px-1.5 z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.22)] ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0d1226]/95 backdrop-blur-md border-white/5'
        }`} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {/* Item 1: Dashboard */}
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setMobileMenuOpen(false);
            }}
            className={`py-1 flex flex-col items-center justify-center grow cursor-pointer transition-all duration-200 ${
              activeTab === 'dashboard' && !mobileMenuOpen
                ? 'text-[#7c5cff] scale-105 font-extrabold'
                : 'text-[#9aa4bf]/80 hover:text-[#7c5cff]'
            }`}
          >
            <BarChart2 className={`h-5 w-5 transition-transform duration-200 ${activeTab === 'dashboard' && !mobileMenuOpen ? 'stroke-[2.5px] scale-105' : 'stroke-[2px]'}`} />
            <span className="text-[9px] font-bold tracking-tight mt-1 text-center truncate leading-none">Dashboard</span>
          </button>

          {/* Item 2: Transaksi */}
          <button
            onClick={() => {
              setActiveTab('transactions');
              setMobileMenuOpen(false);
            }}
            className={`py-1 flex flex-col items-center justify-center grow cursor-pointer transition-all duration-200 ${
              activeTab === 'transactions' && !mobileMenuOpen
                ? 'text-[#7c5cff] scale-105 font-extrabold'
                : 'text-[#9aa4bf]/80 hover:text-[#7c5cff]'
            }`}
          >
            <FileSpreadsheet className={`h-5 w-5 transition-transform duration-200 ${activeTab === 'transactions' && !mobileMenuOpen ? 'stroke-[2.5px] scale-105' : 'stroke-[2px]'}`} />
            <span className="text-[9px] font-bold tracking-tight mt-1 text-center truncate leading-none">Transaksi</span>
          </button>

          {/* Item 3: Sumber Uang */}
          <button
            onClick={() => {
              setActiveTab('accounts');
              setMobileMenuOpen(false);
            }}
            className={`py-1 flex flex-col items-center justify-center grow cursor-pointer transition-all duration-200 ${
              activeTab === 'accounts' && !mobileMenuOpen
                ? 'text-[#7c5cff] scale-105 font-extrabold'
                : 'text-[#9aa4bf]/80 hover:text-[#7c5cff]'
            }`}
          >
            <Wallet className={`h-5 w-5 transition-transform duration-200 ${activeTab === 'accounts' && !mobileMenuOpen ? 'stroke-[2.5px] scale-105' : 'stroke-[2px]'}`} />
            <span className="text-[9px] font-bold tracking-tight mt-1 text-center truncate leading-none">Sumber Uang</span>
          </button>

          {/* Item 4: Hutang Piutang */}
          <button
            onClick={() => {
              setActiveTab('debts');
              setMobileMenuOpen(false);
            }}
            className={`py-1 flex flex-col items-center justify-center grow cursor-pointer transition-all duration-200 ${
              activeTab === 'debts' && !mobileMenuOpen
                ? 'text-[#7c5cff] scale-105 font-extrabold'
                : 'text-[#9aa4bf]/80 hover:text-[#7c5cff]'
            }`}
          >
            <HeartPulse className={`h-5 w-5 transition-transform duration-200 ${activeTab === 'debts' && !mobileMenuOpen ? 'stroke-[2.5px] scale-105' : 'stroke-[2px]'}`} />
            <span className="text-[9px] font-bold tracking-tight mt-1 text-center truncate leading-none">Hutang</span>
          </button>

          {/* Item 5: Daftar Menu */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`py-1 flex flex-col items-center justify-center grow cursor-pointer transition-all duration-200 ${
              mobileMenuOpen
                ? 'text-[#7c5cff] scale-105 font-extrabold'
                : 'text-[#9aa4bf]/80 hover:text-[#7c5cff]'
            }`}
          >
            <Menu className={`h-5 w-5 transition-transform duration-200 ${mobileMenuOpen ? 'stroke-[2.5px] scale-105' : 'stroke-[2px]'}`} />
            <span className="text-[9px] font-bold tracking-tight mt-1 text-center truncate leading-none">Daftar Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
