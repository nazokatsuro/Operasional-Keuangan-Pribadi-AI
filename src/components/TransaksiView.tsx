/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, Edit2, Copy, Trash2, Search, Filter, SlidersHorizontal, ArrowUpDown,
  TrendingUp, TrendingDown, X, Upload, Calendar, RefreshCw, FileText, Check, AlertCircle,
  Sparkles
} from 'lucide-react';
import { 
  Transaction, Account, formatCurrency, 
  INCOME_CATEGORIES, EXPENSE_CATEGORIES 
} from '../utils/financeHelper';
import { AiInputView } from './AiInputView';

interface TransaksiViewProps {
  transactions: Transaction[];
  accounts: Account[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onEditTransaction: (id: string, tx: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onDuplicateTransaction: (tx: Transaction) => void;
  onCommitAI?: (tx: any) => void;
  aiSmartTried?: boolean;
  onAiSmartTried?: () => void;
}

export function TransaksiView({
  transactions,
  accounts,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onDuplicateTransaction,
  onCommitAI,
  aiSmartTried: propAiSmartTried,
  onAiSmartTried
}: TransaksiViewProps) {
  // Navigation Search & Filter State
  const [search, setSearch] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'manual' | 'ai_local' | 'ai_chatgpt'>('manual');
  
  // Track if AI Smart Input has been tried - locally or reactively
  const [localAiSmartTried, setLocalAiSmartTried] = useState<boolean>(() => {
    return localStorage.getItem('LKP_AI_SMART_TRIED') === 'true';
  });

  const isAiSmartTried = propAiSmartTried !== undefined ? propAiSmartTried : localAiSmartTried;

  const handleAiSmartClick = (type: 'ai_local' | 'ai_chatgpt') => {
    setActiveSubTab(type);
    if (!isAiSmartTried) {
      if (onAiSmartTried) {
        onAiSmartTried();
      } else {
        setLocalAiSmartTried(true);
        localStorage.setItem('LKP_AI_SMART_TRIED', 'true');
      }
    }
  };

  const [filterType, setFilterType] = useState<'all' | 'Pemasukan' | 'Pengeluaran'>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'nominal-desc' | 'nominal-asc'>('date-desc');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formNominal, setFormNominal] = useState('');
  const [formType, setFormType] = useState<'Pemasukan' | 'Pengeluaran'>('Pengeluaran');
  const [formCategory, setFormCategory] = useState('Makan');
  const [formSource, setFormSource] = useState('BCA');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formNote, setFormNote] = useState('');
  const [formAttachment, setFormAttachment] = useState<string>('');
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formRecurringPeriod, setFormRecurringPeriod] = useState<'Harian' | 'Mingguan' | 'Bulanan'>('Bulanan');

  // Deletion lock popup state
  const [txToDelete, setTxToDelete] = useState<string | null>(null);

  // OpenAI ChatGPT Smart input states
  const [aiInputText, setAiInputText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);
  const [aiPreviewData, setAiPreviewData] = useState<{
    tipe: 'pemasukan' | 'pengeluaran';
    nominal: number;
    kategori: string;
    wallet: string;
    deskripsi: string;
  } | null>(null);

  const handleAiParse = async () => {
    if (!aiInputText.trim()) return;
    setIsAiLoading(true);
    setAiError(null);
    setAiPreviewData(null);
    setAiSuccessMessage(null);

    const requestUrl = '/api/ai-parse';
    console.log(`[AI-FETCH] Calling URL: ${requestUrl} with body:`, { text: aiInputText });

    try {
      const res = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: aiInputText })
      });

      const statusCode = res.status;
      const contentType = res.headers.get('content-type');
      console.log(`[AI-RESPONSE] URL: ${requestUrl}, Status: ${statusCode}, Content-Type: ${contentType}`);

      const rawText = await res.text();
      console.log(`[AI-RESPONSE-BODY] URL: ${requestUrl}, Raw Body:`, rawText);

      // Validate status code
      if (!res.ok) {
        try {
          const parsedErr = JSON.parse(rawText);
          throw new Error(parsedErr.message || parsedErr.error || `API Error: ${statusCode}`);
        } catch {
          throw new Error(`API Error: ${statusCode}`);
        }
      }

      // Check content-type
      if (!contentType?.includes('application/json')) {
        throw new Error('Server tidak mengembalikan JSON valid');
      }

      let result;
      try {
        result = JSON.parse(rawText);
      } catch (jsonErr: any) {
        console.error(`[AI-PARSE-ERROR] Gagal mengurai JSON respon: ${jsonErr.message}`);
        throw new Error(`Gagal melakukan parsing JSON dari server (Status: ${statusCode}): ${jsonErr.message}`);
      }

      if (result.success) {
        const parsed = result.data;
        setAiPreviewData(parsed);
        
        // Map parsed.tipe
        const matchedType = parsed.tipe && parsed.tipe.toLowerCase() === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran';
        setFormType(matchedType);
        
        // Map parsed.deskripsi/description
        if (parsed.deskripsi) {
          setFormTitle(parsed.deskripsi);
        }
        
        // Map parsed.nominal
        if (parsed.nominal) {
          setFormNominal(parsed.nominal.toString());
        }
        
        // Map parsed.kategori
        if (parsed.kategori) {
          const categoryName = parsed.kategori.trim();
          const categoriesList = matchedType === 'Pemasukan' 
            ? ['Gaji', 'Freelance', 'Bonus', 'Investasi', 'Penjualan', 'Refund', 'Lainnya Pemasukan']
            : ['Makan', 'Transport', 'Belanja', 'Internet', 'Listrik', 'Air', 'Langganan', 'Hiburan', 'Kesehatan', 'Top Up', 'Pendidikan', 'Pajak', 'Produksi', 'Logistik', 'Marketing', 'Pinjaman', 'Lainnya'];
            
          const match = categoriesList.find(c => c.toLowerCase() === categoryName.toLowerCase());
          if (match) {
            setFormCategory(match);
          } else {
            setFormCategory(matchedType === 'Pemasukan' ? 'Lainnya Pemasukan' : 'Lainnya');
          }
        }
        
        // Map parsed.wallet
        if (parsed.wallet) {
          const walletName = parsed.wallet.trim();
          const accountNames = accounts.map(a => a.name);
          const match = accountNames.find(a => a.toLowerCase() === walletName.toLowerCase());
          if (match) {
            setFormSource(match);
          } else {
            // Settle default fallback source
            setFormSource(accounts[0]?.name || 'Cash');
          }
        }

        setAiSuccessMessage("Berhasil mendeteksi transaksi dan mengisi formulir!");
        
        // Mark as tried dynamically
        if (!isAiSmartTried) {
          if (onAiSmartTried) {
            onAiSmartTried();
          } else {
            setLocalAiSmartTried(true);
            localStorage.setItem('LKP_AI_SMART_TRIED', 'true');
          }
        }
        
        // Automatically fade-out the success message after 4s
        setTimeout(() => {
          setAiSuccessMessage(null);
        }, 4000);
      } else {
        setAiError(result.message || result.error || 'Gagal menganalisa kalimat.');
      }
    } catch (e: any) {
      setAiError(e.message || 'Terjadi kesalahan saat memproses data.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setFormTitle('');
    setFormNominal('');
    setFormType('Pengeluaran');
    setFormCategory('Makan');
    setFormSource(accounts[0]?.name || 'Cash');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNote('');
    setFormAttachment('');
    setFormIsRecurring(false);
    setFormRecurringPeriod('Bulanan');
    
    // Clear AI States
    setAiInputText('');
    setAiPreviewData(null);
    setAiError(null);
    setAiSuccessMessage(null);

    setShowModal(true);
  };

  const handleOpenEdit = (tx: Transaction) => {
    setIsEditMode(true);
    setEditId(tx.id);
    setFormTitle(tx.title);
    setFormNominal(tx.nominal.toString());
    setFormType(tx.type);
    setFormCategory(tx.category);
    setFormSource(tx.source);
    setFormDate(tx.date);
    setFormNote(tx.note || '');
    setFormAttachment(tx.attachment || '');
    setFormIsRecurring(tx.isRecurring || false);
    setFormRecurringPeriod(tx.recurringPeriod || 'Bulanan');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formNominal) return;

    const nominalNum = parseFloat(formNominal);
    if (isNaN(nominalNum) || nominalNum <= 0) return;

    const txData = {
      title: formTitle,
      nominal: nominalNum,
      type: formType,
      category: formCategory,
      source: formSource,
      date: formDate,
      note: formNote || undefined,
      attachment: formAttachment || undefined,
      isRecurring: formIsRecurring,
      recurringPeriod: formIsRecurring ? formRecurringPeriod : undefined
    };

    if (isEditMode && editId) {
      onEditTransaction(editId, txData);
    } else {
      onAddTransaction(txData);
    }
    setShowModal(false);
  };

  // Dragger state mock for slip attachment
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        if (loadEvent.target?.result) {
          setFormAttachment(loadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredTransactions = transactions
    .filter(tx => {
      const matchesSearch = tx.title.toLowerCase().includes(search.toLowerCase()) || 
                            tx.category.toLowerCase().includes(search.toLowerCase()) ||
                            (tx.note && tx.note.toLowerCase().includes(search.toLowerCase()));
      const matchesType = filterType === 'all' ? true : tx.type === filterType;
      const matchesSource = filterSource === 'all' ? true : tx.source === filterSource;
      return matchesSearch && matchesType && matchesSource;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'nominal-desc') return b.nominal - a.nominal;
      if (sortBy === 'nominal-asc') return a.nominal - b.nominal;
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* HEADER SECTION WITH FLEXIBILITY & ACTION BUTTONS ON THE EDGE AS REQUESTED */}
      <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 border-b border-white/[0.04] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Mutasi Transaksi LKP</h1>
          <p className="text-xs text-[#9aa4bf]">Administrasikan log pengeluaran dan pemasukan Anda secara visual</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 self-stretch xl:self-auto shrink-0 select-none">
          {/* Sub-tab Switcher Bar moved next to Catat Transaksi */}
          <div className="flex bg-[#0c1020] p-1 rounded-xl border border-white/[0.06] shrink-0 h-[42px] items-center" id="tx-view-navigation-tab">
            <button
              type="button"
              onClick={() => setActiveSubTab('manual')}
              className={`px-3 sm:px-4 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer h-full flex items-center justify-center ${
                activeSubTab === 'manual'
                  ? 'bg-white/[0.07] text-white border border-white/5 shadow-md'
                  : 'text-[#9aa4bf] hover:text-white'
              }`}
            >
              Mutasi Manual
            </button>
            <button
              type="button"
              onClick={() => handleAiSmartClick('ai_local')}
              className={`relative px-3 sm:px-4 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 h-full select-none group/aibtn ${
                activeSubTab === 'ai_local'
                  ? 'bg-[#7c5cff] text-white shadow-md'
                  : 'text-[#9aa4bf] hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <Sparkles className={`h-3.5 w-3.5 ${activeSubTab === 'ai_local' ? 'text-white' : 'text-[#a855f7]'} group-hover/aibtn:scale-110 transition-transform`} />
              <span className="relative z-10">AI Smart (Lokal)</span>
            </button>
            <button
              type="button"
              onClick={() => handleAiSmartClick('ai_chatgpt')}
              className={`relative px-3 sm:px-4 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 h-full overflow-visible select-none group/aibtn ${
                activeSubTab === 'ai_chatgpt'
                  ? 'bg-gradient-to-r from-emerald-500 to-[#10b981] text-white shadow-lg shadow-emerald-500/15'
                  : 'text-[#9aa4bf] hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <Sparkles className={`h-3.5 w-3.5 ${activeSubTab === 'ai_chatgpt' ? 'text-white' : 'text-emerald-400'} group-hover/aibtn:scale-110 transition-transform`} />
              <span className="relative z-10-chatgpt flex items-center gap-1">
                Google Gemini <span className="text-[10px] text-yellow-300 animate-pulse">Hot 🔥</span>
              </span>

              {/* Floating NEW Sparkle status badge */}
              {!isAiSmartTried && (
                <span className="absolute -top-2.5 -right-2.5 bg-gradient-to-r from-yellow-400 to-[#10b981] text-black text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-lg tracking-wider uppercase animate-bounce border border-yellow-300 pointer-events-none font-mono">
                  NEW
                </span>
              )}
            </button>
          </div>

          <button 
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-[#7c5cff] text-white font-bold text-xs hover:bg-[#6847ff] hover:shadow-[0_0_20px_rgba(124,92,255,0.4)] active:scale-95 transition-all cursor-pointer h-[42px] shrink-0"
          >
            <Plus className="h-4 w-4" /> Catat Transaksi
          </button>
        </div>
      </div>

      {activeSubTab === 'manual' ? (
        <>
          {/* SEARCH AND FILTERS STYLING */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Bar */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-[#9aa4bf]" />
            <input 
              type="text" 
              placeholder="Cari transaksi, kategori, atau deskripsi..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff]"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 bg-[#0e1329] text-xs text-white border border-white/5 rounded-xl focus:outline-none focus:border-[#7c5cff] cursor-pointer"
          >
            <option value="all" className="bg-[#0b1020] text-white">Semua Jenis Aliran</option>
            <option value="Pemasukan" className="bg-[#0b1020] text-white">Pemasukan (+)</option>
            <option value="Pengeluaran" className="bg-[#0b1020] text-white">Pengeluaran (-)</option>
          </select>

          {/* Source Filter */}
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-3 py-2 bg-[#0e1329] text-xs text-white border border-white/5 rounded-xl focus:outline-none focus:border-[#7c5cff] cursor-pointer"
          >
            <option value="all" className="bg-[#0b1020] text-white">Semua Sumber Uang</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.name} className="bg-[#0b1020] text-white">{acc.name}</option>
            ))}
          </select>
        </div>

        {/* Sorting options */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-white/[0.04] gap-2">
          <div className="flex items-center gap-2 text-[11px] text-[#9aa4bf]">
            <Filter className="h-3 w-3" />
            <span>Terfilter: {filteredTransactions.length} dari {transactions.length} baris</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#9aa4bf] font-mono">Urutan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs text-[#00d4ff] font-bold focus:outline-none cursor-pointer"
            >
              <option value="date-desc" className="bg-[#0b1020] text-white">Tanggal Terkini (Baru → Lama)</option>
              <option value="date-asc" className="bg-[#0b1020] text-white">Tanggal Terlama (Lama → Baru)</option>
              <option value="nominal-desc" className="bg-[#0b1020] text-white">Nominal Tertinggi</option>
              <option value="nominal-asc" className="bg-[#0b1020] text-white">Nominal Terendah</option>
            </select>
          </div>
        </div>
      </div>

      {/* CORE TRANSACTIONS LIST CARD GRID / TABLE */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-[28px] overflow-hidden shadow-xl">
        {/* DESKTOP VIEW: Classical Structured Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-white/[0.03] text-[10px] uppercase font-mono tracking-widest text-[#9aa4bf] border-b border-white/[0.04]">
                <th className="px-5 py-4">Title / Alur</th>
                <th className="px-5 py-4">Saku / Wallet</th>
                <th className="px-5 py-4">Kategori</th>
                <th className="px-5 py-4">Nominal</th>
                <th className="px-5 py-4">Tanggal</th>
                <th className="px-5 py-4 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    <p className="text-xs text-[#9aa4bf]">Tidak ada data transaksi yang cocok dengan kriteria filter.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-5 py-4.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white leading-tight">{tx.title}</p>
                          {tx.isRecurring && (
                            <span className="text-[8px] font-mono bg-[#7c5cff]/20 text-[#7c5cff] px-1 py-0.2 rounded leading-none">Rutin</span>
                          )}
                        </div>
                        {tx.note && <p className="text-[10px] text-[#9aa4bf] line-clamp-1 mt-0.5 max-w-[200px]">{tx.note}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-4.5">
                      <span className="text-xs text-white font-mono bg-white/[0.04] px-2 py-1 rounded-md border border-white/5">{tx.source}</span>
                    </td>
                    <td className="px-5 py-4.5">
                      <span className="text-xs text-[#9aa4bf]">{tx.category}</span>
                    </td>
                    <td className="px-5 py-4.5">
                      <p className={`text-xs font-bold ${tx.type === 'Pemasukan' ? 'text-[#16c784]' : 'text-[#ff5c7a]'}`}>
                        {tx.type === 'Pemasukan' ? '+' : '-'}{formatCurrency(tx.nominal)}
                      </p>
                    </td>
                    <td className="px-5 py-4.5">
                      <p className="text-xs text-[#9aa4bf] font-mono">{tx.date}</p>
                    </td>
                    <td className="px-5 py-4.5">
                      <div className="flex items-center justify-center gap-1.5 opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenEdit(tx)}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-[#7c5cff]/30 text-white transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => onDuplicateTransaction(tx)}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/30 text-emerald-400 transition-colors cursor-pointer"
                          title="Duplicate"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => setTxToDelete(tx.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-[#ff5c7a] transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE VIEW: Stacked Card Layout */}
        <div className="block md:hidden divide-y divide-white/[0.04]">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="text-xs text-[#9aa4bf]">Tidak ada data transaksi yang cocok dengan kriteria filter.</p>
            </div>
          ) : (
            filteredTransactions.map((tx) => (
              <div key={tx.id} className="p-4 flex flex-col gap-3 hover:bg-white/[0.01] transition-colors">
                {/* Row 1: Title & Nominal */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-bold text-white leading-tight break-words">{tx.title}</p>
                      {tx.isRecurring && (
                        <span className="text-[7px] font-mono bg-[#7c5cff]/20 text-[#7c5cff] px-1 py-0.2 rounded leading-none">Rutin</span>
                      )}
                    </div>
                    {tx.note && <p className="text-[10px] text-[#9aa4bf] mt-0.5 line-clamp-1">{tx.note}</p>}
                  </div>
                  
                  <div className="shrink-0 text-right">
                    <p className={`text-xs font-black font-mono ${tx.type === 'Pemasukan' ? 'text-[#16c784]' : 'text-[#ff5c7a]'}`}>
                      {tx.type === 'Pemasukan' ? '+' : '-'}{formatCurrency(tx.nominal)}
                    </p>
                  </div>
                </div>

                {/* Row 2: Badges/Meta and Actions */}
                <div className="flex items-center justify-between gap-2 mt-1">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <span className="text-[10px] text-white font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5 truncate max-w-[80px]">
                      {tx.source}
                    </span>
                    <span className="text-[10px] text-[#9aa4bf] bg-white/[0.02] px-1.5 py-0.5 rounded">
                      {tx.category}
                    </span>
                    <span className="text-[10px] font-mono text-[#9aa4bf]/80">
                      {tx.date}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => handleOpenEdit(tx)}
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-[#7c5cff]/20 active:bg-[#7c5cff]/30 text-[#00d4ff] transition-all cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => onDuplicateTransaction(tx)}
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 active:bg-emerald-500/30 text-emerald-400 transition-all cursor-pointer"
                      title="Duplikat"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => setTxToDelete(tx.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-[#ff5c7a] transition-all cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SWIPE DELETE SAFETY ACTION DIALOG POPUP */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border border-white/[0.08] shadow-2xl text-center space-y-4">
            <div className="h-12 w-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center text-[#ff5c7a]">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Konfirmasi Hapus Transaksi?</h4>
              <p className="text-xs text-[#9aa4bf] mt-1.5">Aksi ini bersifat permanen dan saldo pembukuan sumber uang Anda akan disinkronisasikan ulang.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button 
                onClick={() => setTxToDelete(null)}
                className="py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs text-white cursor-pointer"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  onDeleteTransaction(txToDelete);
                  setTxToDelete(null);
                }}
                className="py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-xs text-white font-bold cursor-pointer"
              >
                Tetap Hapus
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      ) : (
        <AiInputView
          accounts={accounts}
          onCommitTransaction={onCommitAI || onAddTransaction}
          initialEngine={activeSubTab === 'ai_chatgpt' ? 'chatgpt' : 'lokal'}
        />
      )}

      {/* SLIDE-IN POPUP MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] bg-[#0c1020] border border-white/[0.08] shadow-2xl overflow-hidden self-end sm:self-auto max-h-[85vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-white/[0.05]">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {isEditMode ? 'Edit Catatan Transaksi' : 'Catat Transaksi Baru'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-[#9aa4bf] hover:text-white cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 grow">
              {/* Google Gemini Auto-Fill component inside Modal */}
              {!isEditMode && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#7c5cff]/5 to-indigo-900/10 border border-[#7c5cff]/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-black text-violet-300 font-mono">
                      <Sparkles className="h-4 w-4 text-[#7c5cff] animate-pulse" />
                      AI SMART AUTO-FILL (GEMINI)
                    </span>
                    {!isAiSmartTried && (
                      <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/35 uppercase animate-pulse">
                        Baru
                      </span>
                    )}
                  </div>
                  
                  <div className="relative">
                    <input 
                      type="text"
                      value={aiInputText}
                      onChange={(e) => setAiInputText(e.target.value)}
                      placeholder="e.g. Makan bakso 25rb pakai Dana"
                      className="w-full pl-3 pr-24 py-2 bg-[#080d1e]/90 text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAiParse();
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={isAiLoading || !aiInputText.trim()}
                      onClick={handleAiParse}
                      className="absolute right-1.5 top-1 px-3 py-1 bg-[#7c5cff] hover:bg-[#633be6] disabled:bg-[#34246d]/40 disabled:text-[#9aa4bf]/50 text-[10px] font-black uppercase text-white rounded-lg transition-all cursor-pointer h-7 flex items-center justify-center gap-1 shadow-md shadow-violet-500/10"
                    >
                      {isAiLoading ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      <span>{isAiLoading ? 'Proses...' : 'Parse AI'}</span>
                    </button>
                  </div>

                  {/* AI Parse Error Feedback */}
                  {aiError && (
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-300 flex items-start gap-1.5 leading-relaxed">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                      <span>{aiError}</span>
                    </div>
                  )}

                  {/* AI Success Toast Message */}
                  {aiSuccessMessage && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-1.5 animate-pulse">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>{aiSuccessMessage}</span>
                    </div>
                  )}

                  {/* Structured Preview Card */}
                  {aiPreviewData && (
                    <div className="p-3.5 bg-[#080d1e]/80 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-mono pb-1 border-b border-white/5">
                        Preview Deteksi AI (Silakan Periksa)
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                        <div>
                          <span className="text-slate-400 font-medium font-mono text-[10px]">Tipe:</span>
                          <span className={`ml-1.5 font-bold ${aiPreviewData.tipe.toLowerCase() === 'pemasukan' ? 'text-[#16c784]' : 'text-[#ff5c7a]'}`}>
                            {aiPreviewData.tipe.toLowerCase() === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium font-mono text-[10px]">Kategori:</span>
                          <span className="ml-1.5 font-bold text-[#00d4ff] bg-[#00d4ff]/10 px-1.5 py-0.5 rounded">
                            {aiPreviewData.kategori}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium font-mono text-[10px]">Nominal:</span>
                          <span className="ml-1.5 font-black font-mono text-white">
                            Rp {aiPreviewData.nominal?.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium font-mono text-[10px]">Wallet:</span>
                          <span className="ml-1.5 font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">
                            {aiPreviewData.wallet}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] pt-1">
                        <span className="text-slate-400 font-medium font-mono text-[10px]">Deskripsi:</span>
                        <span className="ml-1.5 text-white italic">"{aiPreviewData.deskripsi}"</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Type Switcher */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.03] border border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setFormType('Pengeluaran');
                    setFormCategory('Makan');
                  }}
                  className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    formType === 'Pengeluaran' ? 'bg-red-500/10 text-[#ff5c7a]' : 'text-[#9aa4bf] hover:text-white'
                  }`}
                >
                  <TrendingDown className="h-4 w-4" /> Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormType('Pemasukan');
                    setFormCategory('Gaji');
                  }}
                  className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    formType === 'Pemasukan' ? 'bg-[#16c784]/10 text-[#16c784]' : 'text-[#9aa4bf] hover:text-white'
                  }`}
                >
                  <TrendingUp className="h-4 w-4" /> Pemasukan
                </button>
              </div>

              {/* Title Input */}
              <div className="space-y-1">
                <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono">Nama Transaksi</label>
                <input 
                  type="text" 
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Makan Siang Nasi Padang, Gaji Utama, dll"
                  required
                  className="w-full px-4 py-2 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff]"
                />
              </div>

              {/* Nominal & Source Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono">Nominal / Jumlah</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-500 font-mono">Rp</span>
                    <input 
                      type="text" 
                      value={formNominal ? parseInt(formNominal, 10).toLocaleString('id-ID') : ''}
                      onChange={(e) => {
                        const rawVal = e.target.value.replace(/\D/g, '');
                        setFormNominal(rawVal);
                      }}
                      placeholder="0"
                      required
                      className="w-full pl-9 pr-4 py-2 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff] font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono">Sumber Uang</label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0c1020] text-xs text-white border border-white/5 rounded-xl focus:outline-none focus:border-[#7c5cff] cursor-pointer"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.name} className="bg-[#0b1020] text-white">{acc.name} (Sisa: {formatCurrency(acc.balance)})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono">Kategori</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0c1020] text-xs text-white border border-white/5 rounded-xl focus:outline-none focus:border-[#7c5cff] cursor-pointer"
                  >
                    {formType === 'Pemasukan' ? (
                      INCOME_CATEGORIES.map(cat => <option key={cat.name} value={cat.name} className="bg-[#0b1020] text-white">{cat.name}</option>)
                    ) : (
                      EXPENSE_CATEGORIES.map(cat => <option key={cat.name} value={cat.name} className="bg-[#0b1020] text-white">{cat.name}</option>)
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono">Tanggal Transaksi</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                      className="w-full px-4 py-2 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff] font-mono cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Recurring Switcher */}
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Transaksi Berulang (Recurring)?</h4>
                  <p className="text-[10px] text-[#9aa4bf] mt-0.5">Sering dipakai untuk langganan atau gaji bulanan</p>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={formIsRecurring}
                    onChange={(e) => setFormIsRecurring(e.target.checked)}
                    className="h-4 w-4 rounded text-[#7c5cff] focus:ring-[#7c5cff] cursor-pointer"
                  />
                  {formIsRecurring && (
                    <select
                      value={formRecurringPeriod}
                      onChange={(e) => setFormRecurringPeriod(e.target.value as any)}
                      className="bg-[#0c1020] text-xs text-[#00d4ff] font-mono font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="Harian" className="bg-[#0b1020] text-white">Harian</option>
                      <option value="Mingguan" className="bg-[#0b1020] text-white">Mingguan</option>
                      <option value="Bulanan" className="bg-[#0b1020] text-white">Bulanan</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Note / Deskripsi */}
              <div className="space-y-1">
                <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono">Catatan Tambahan</label>
                <textarea 
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Masukkan rincian belanja atau pesan pengingat..."
                  rows={2}
                  className="w-full px-4 py-2 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff]"
                />
              </div>

              {/* Premium Drag and Drop / Simple Upload Slip Attached */}
              <div className="space-y-1">
                <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono">Lampiran Bukti Transaksi (Slip)</label>
                <div className="border border-dashed border-white/10 p-3 rounded-xl flex flex-col items-center justify-center bg-white/[0.01] hover:bg-white/[0.03] transition-colors relative">
                  {formAttachment ? (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-emerald-400" />
                        <span className="text-[11px] text-[#9aa4bf] line-clamp-1">Kopi_Bukti_Slip.png</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setFormAttachment('')}
                        className="text-[10px] text-[#ff5c7a] font-bold underline cursor-pointer"
                      >
                        Ganti
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-4.5 w-4.5 text-[#9aa4bf] mb-1" />
                      <span className="text-[10px] text-[#9aa4bf]">Semburkan struk belanja (klik / drag file)</span>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.05]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] text-xs hover:bg-white/[0.08] text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-[#7c5cff] text-white font-bold text-xs hover:bg-[#6847ff] hover:shadow-[0_0_15px_rgba(124,92,255,0.3)] cursor-pointer"
                >
                  {isEditMode ? 'Simpan Perubahan' : 'Selesaikan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
