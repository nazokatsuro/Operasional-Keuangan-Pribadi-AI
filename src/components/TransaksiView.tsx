/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, Edit2, Copy, Trash2, Search, Filter, SlidersHorizontal, ArrowUpDown,
  TrendingUp, TrendingDown, X, Upload, Calendar, RefreshCw, FileText, Check, AlertCircle
} from 'lucide-react';
import { 
  Transaction, Account, formatCurrency, 
  INCOME_CATEGORIES, EXPENSE_CATEGORIES 
} from '../utils/financeHelper';

interface TransaksiViewProps {
  transactions: Transaction[];
  accounts: Account[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onEditTransaction: (id: string, tx: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onDuplicateTransaction: (tx: Transaction) => void;
}

export function TransaksiView({
  transactions,
  accounts,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onDuplicateTransaction
}: TransaksiViewProps) {
  // Navigation Search & Filter State
  const [search, setSearch] = useState('');
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
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Mutasi Transaksi LKP</h1>
          <p className="text-xs text-[#9aa4bf]">Administrasikan log pengeluaran dan pemasukan Anda secara visual</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-2xl bg-[#7c5cff] text-white font-bold text-xs hover:bg-[#6847ff] hover:shadow-[0_0_20px_rgba(124,92,255,0.4)] active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Catat Transaksi
        </button>
      </div>

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
            <option value="all">Semua Jenis Aliran</option>
            <option value="Pemasukan">Pemasukan (+)</option>
            <option value="Pengeluaran">Pengeluaran (-)</option>
          </select>

          {/* Source Filter */}
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-3 py-2 bg-[#0e1329] text-xs text-white border border-white/5 rounded-xl focus:outline-none focus:border-[#7c5cff] cursor-pointer"
          >
            <option value="all">Semua Sumber Uang</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.name}>{acc.name}</option>
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
              <option value="date-desc">Tanggal Terkini (Baru → Lama)</option>
              <option value="date-asc">Tanggal Terlama (Lama → Baru)</option>
              <option value="nominal-desc">Nominal Tertinggi</option>
              <option value="nominal-asc">Nominal Terendah</option>
            </select>
          </div>
        </div>
      </div>

      {/* CORE TRANSACTIONS LIST CARD GRID / TABLE */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-[28px] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
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
                      <div className="flex items-center justify-center gap-1.5 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenEdit(tx)}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-white transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => onDuplicateTransaction(tx)}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-emerald-400 transition-colors cursor-pointer"
                          title="Duplicate"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => setTxToDelete(tx.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-[#ff5c7a] transition-colors cursor-pointer"
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
                      type="number" 
                      value={formNominal}
                      onChange={(e) => setFormNominal(e.target.value)}
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
                      <option key={acc.id} value={acc.name}>{acc.name} (Sisa: {formatCurrency(acc.balance)})</option>
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
                      INCOME_CATEGORIES.map(cat => <option key={cat.name} value={cat.name}>{cat.name}</option>)
                    ) : (
                      EXPENSE_CATEGORIES.map(cat => <option key={cat.name} value={cat.name}>{cat.name}</option>)
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
                      <option value="Harian">Harian</option>
                      <option value="Mingguan">Mingguan</option>
                      <option value="Bulanan">Bulanan</option>
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
