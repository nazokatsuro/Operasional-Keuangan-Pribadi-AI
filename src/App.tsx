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
  RefreshCw, X, Menu, Bell, Search, LogOut, Sun, Moon, FileText, Instagram
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

// Helper Utilities Imports
import { 
  Transaction, Account, Asset, Debt,
  DEFAULT_TRANSACTIONS, DEFAULT_ACCOUNTS, DEFAULT_ASSETS, DEFAULT_DEBTS,
  formatCurrency, getFriendlyGreeting 
} from './utils/financeHelper';
import { ParsedTransaction } from './utils/aiParser';

import { 
  signInWithGoogleDrive, 
  logoutGDrive, 
  searchDraftFile, 
  downloadDraftFile, 
  saveDraftFile, 
  getGDriveAccessToken,
  DraftPayload
} from './utils/googleDriveHelper';

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

  // Toast premium alerts notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // Clear App data verification lock popups
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
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

  // Automatic Draft Search and Countdown Restore sequence
  const handleCheckAndAutoLoadDraft = async (token: string) => {
    setSyncIndicatorType('info');
    setSyncStatusMsg('Memeriksa Penyimpanan Awan & Google Drive Anda...');
    setShowSyncIndicator(true);

    try {
      const fileId = await searchDraftFile(token);
      if (fileId) {
        // Formulated exact message pattern specified in standard prompt instruction rules
        setSyncIndicatorType('warning');
        setSyncStatusMsg(
          `Ditemukan Backup Cloud!\nGoogle Drive draft sinkronisasi terdeteksi.\nAda berkas cadangan laporan_jersey_draft.json di Google Drive Anda\n\n⚠️ PERHATIAN: Memulihkan draft ini akan menumpuk (menghapus permanen) seluruh data lokal yang anda ada saat ini.`
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

          // Force instant save locally too to avoid stale states
          if (draft.transactions) localStorage.setItem('LKP_TRANSACTIONS', JSON.stringify(draft.transactions));
          if (draft.accounts) localStorage.setItem('LKP_ACCOUNTS', JSON.stringify(draft.accounts));
          if (draft.assets) localStorage.setItem('LKP_ASSETS', JSON.stringify(draft.assets));
          if (draft.debts) localStorage.setItem('LKP_DEBTS', JSON.stringify(draft.debts));
          if (draft.userProfile) localStorage.setItem('LKP_USER_PROFILE', JSON.stringify(draft.userProfile));

          showToast('Cadangan Cloud berhasil dipulihkan secara otomatis!', 'success');
        } else {
          showToast('Gagal memulihkan draf dari Google Drive.', 'error');
        }
      } else {
        showToast('Tidak ada draft draf laporan_jersey_draft.json sebelumnya. Memulai lembar baru!', 'info');
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
    } catch (err) {
      console.error(err);
      showToast('Gagal terhubung dengan Penyimpanan Awan & Google Drive.', 'error');
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
        userProfile
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
        userProfile
      };
      const ok = await saveDraftFile(gdriveToken, payload);
      if (ok) {
        console.log('[Cloud Auto-Save] Backup draf berhasil disinkronkan ke Google Drive.');
      }
    }, 5000); // Debounce to prevent hitting rapid rate limits during fast inputs

    return () => clearTimeout(autoSaveTimer);
  }, [transactions, accounts, assets, debts, userProfile, gdriveToken]);

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

  // 1.8 SELF-HEALING SYSTEM: Always keep account balances perfectly computed from transactions list in real-time
  useEffect(() => {
    setAccounts(prevAccounts => {
      let changed = false;
      const updated = prevAccounts.map(acc => {
        const defaultAcc = DEFAULT_ACCOUNTS.find(d => d.name.toLowerCase() === acc.name.toLowerCase());
        const baseBal = acc.initialBalance !== undefined 
          ? acc.initialBalance 
          : (defaultAcc ? (defaultAcc.initialBalance ?? 0) : 0);
        
        const txsForAcc = transactions.filter(t => t.source.toLowerCase() === acc.name.toLowerCase());
        const balanceDiff = txsForAcc.reduce((sum, t) => {
          return sum + (t.type === 'Pemasukan' ? t.nominal : -t.nominal);
        }, 0);
        
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
        accountNumber: 'Saku Virtual Baru'
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
          accountNumber: 'Saku Virtual Baru'
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

  // AI commit handler
  const handleCommitAI = (parsed: ParsedTransaction) => {
    handleAddTransaction({
      title: parsed.title,
      nominal: parsed.nominal,
      type: parsed.type,
      category: parsed.category,
      source: parsed.source,
      date: parsed.date
    });
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
        category: 'Lainnya Pemasukan',
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
          category: 'Lainnya',
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
        category: 'Lainnya',
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
          category: 'Lainnya Pemasukan',
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
        category: 'Lainnya',
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
        category: 'Lainnya Pemasukan',
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
    const bundleStr = JSON.stringify({ transactions, accounts, assets, debts, userProfile });
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(bundleStr);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = 'LKP-Backup-Database.json';
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
        
        showToast('Database berhasil dipulihkan dari Backup JSON!', 'success');
      } catch (err) {
        showToast('Format JSON salah atau corrupt!', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Layout calculations
  const totalInflowSum = accounts.reduce((sum, a) => sum + a.balance, 0);

  // Active Menu List Items
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'transactions', label: 'Transaksi', icon: FileSpreadsheet },
    { id: 'accounts', label: 'Sumber Uang', icon: Wallet },
    { id: 'ai-parser', label: 'AI Smart Input', icon: Sparkles },
    { id: 'assets', label: 'Tabungan Aset', icon: Award },
    { id: 'debts', label: 'Hutang Piutang', icon: HeartPulse },
    { id: 'calendar', label: 'Kalender', icon: Calendar },
    { id: 'statistics', label: 'Statistik Kas', icon: TrendingUp },
  ];

  return (
    <div className={`min-h-screen flex ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0b1020] text-white'
    } antialiased transition-colors duration-200`}>
      
      {/* 1. SIDEBAR FOR DESKTOP */}
      <aside className={`hidden xl:flex flex-col justify-between w-64 border-r shrink-0 transition-colors duration-200 ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0b1020]/80 backdrop-blur-md border-white/[0.06]'
      }`}>
        {/* Top brand */}
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-7 w-7 bg-[#7c5cff] rounded-xl flex items-center justify-center text-white text-xs font-mono font-bold leading-none shadow-[0_0_15px_rgba(124,92,255,0.4)]">
              N
            </span>
            <span className="text-sm font-extrabold tracking-tight uppercase font-mono">Laporan Keuangan</span>
          </div>

          {/* User mini badge ticker */}
          <div className={`p-4.5 rounded-2xl flex items-center gap-3 border ${
            isLight ? 'bg-slate-50 border-slate-100' : 'bg-white/[0.03] border-white/[0.05]'
          }`}>
            <img 
              src={userProfile.avatarUrl} 
              alt="Avatar" 
              className="h-8.5 w-8.5 rounded-full object-cover ring-1 ring-white/10"
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold truncate leading-tight">{userProfile.name}</h3>
              <div className="mt-1 flex items-center gap-1.5 text-[#9aa4bf] font-medium text-[10px]">
                <Instagram className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                <span className="truncate">IG : nomadenapp</span>
              </div>
            </div>
          </div>
        </div>

        {/* Links listing scrollable menu */}
        <nav className="px-3 space-y-1 grow py-2 overflow-y-auto">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-left text-xs font-bold capitalize transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-[#7c5cff] text-white' 
                    : isLight ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'text-[#9aa4bf] hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Setting / Logout switchers */}
        <div className="p-4 border-t border-white/[0.05] space-y-2.5">
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-[#9aa4bf] hover:text-white cursor-pointer`}
          >
            <Settings className="h-4.5 w-4.5" />
            <span>Pengaturan</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN HUB WORKSPACE CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP COMPONENT HEADER BAR */}
        <header className={`h-16 flex items-center justify-between px-6 border-b shrink-0 z-20 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0b1020]/60 backdrop-blur-md border-white/[0.06]'
        }`}>
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile menu logo triggers */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 text-[#9aa4bf] hover:text-white cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            {/* Real-time automated dynamic greetings */}
            <div className="hidden sm:block">
              <span className="text-xs text-[#00d4ff] font-mono leading-none tracking-widest uppercase font-bold">
                {getFriendlyGreeting()} • 
              </span>
              <p className="text-xs font-bold text-[#9aa4bf] inline ml-1">
                {userProfile.dashboardName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
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
                {menuItems.map(item => {
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
              </div>

              <div className="absolute bottom-4 inset-x-4 space-y-2">
                <button 
                  onClick={() => {
                    setActiveTab('settings');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#9aa4bf]"
                >
                  <Settings className="h-4 w-4" /> Configs
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. WORKING WORKSPACE PANELS ROUTER */}
        <main className="flex-1 py-4 px-4 sm:px-6 overflow-y-auto">
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

            {activeTab === 'ai-parser' && (
              <AiInputView
                accounts={accounts}
                onCommitTransaction={handleCommitAI}
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
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">Profile Picture Avatar URL</label>
                    <input 
                      type="text" 
                      value={userProfile.avatarUrl}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, avatarUrl: e.target.value }))}
                      className="w-full px-3 py-2 bg-[#0c1020] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff]"
                    />
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
                        <p className="text-[10px] text-[#9aa4bf]">Sinkronisasi draf otomatis yang aman di Google Drive Anda (`laporan_jersey_draft.json`)</p>
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
                    <p className="text-[11px] text-[#9aa4bf]">Setel ulang seluruh transaksi, sumber uang BCA, dan liabilitas aset kembali ke titik nol.</p>
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
                        Ada berkas cadangan <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[#00d4ff]">laporan_jersey_draft.json</code> di Google Drive Anda
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
        <div className={`xl:hidden h-14 border-t flex items-center justify-around px-2 z-10 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0b1020] border-white/[0.06]'
        }`}>
          {menuItems.slice(0, 4).map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`py-1.5 flex flex-col items-center justify-center grow cursor-pointer ${
                  isActive ? 'text-[#7c5cff]' : 'text-[#9aa4bf]'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                <span className="text-[8px] font-bold tracking-tight uppercase mt-1 hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
