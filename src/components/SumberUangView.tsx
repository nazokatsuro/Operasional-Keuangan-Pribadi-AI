/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, Edit2, Trash2, Wallet, CreditCard, DollarSign, Send, 
  Sparkles, Smartphone, Award, ShieldCheck, ShoppingBag, Landmark,
  Check, X, AlertCircle, Info
} from 'lucide-react';
import { Account, formatCurrency } from '../utils/financeHelper';

interface SumberUangViewProps {
  accounts: Account[];
  onAddAccount: (acc: Omit<Account, 'id'>) => void;
  onEditAccount: (id: string, acc: Partial<Account>) => void;
  onDeleteAccount: (id: string) => void;
}

// Preset gradients to pick from for a beautiful luxury fintech card appearance
const GRADIENT_PRESETS = [
  { name: 'BCA Royal Blue', value: 'from-blue-600 to-blue-900', textColor: '#ffffff' },
  { name: 'Mandiri Luxury Gold', value: 'from-amber-600 to-amber-900', textColor: '#ffffff' },
  { name: 'BNI Sunset Orange', value: 'from-orange-500 to-orange-800', textColor: '#ffffff' },
  { name: 'BRI Blue Ocean', value: 'from-blue-500 to-blue-700', textColor: '#ffffff' },
  { name: 'Seabank Fire Red', value: 'from-orange-600 to-red-600', textColor: '#ffffff' },
  { name: 'Jago Amber Yellow', value: 'from-yellow-400 to-yellow-600', textColor: '#1e293b' },
  { name: 'Dana Digital Sky', value: 'from-sky-400 to-blue-600', textColor: '#ffffff' },
  { name: 'OVO Royal Purple', value: 'from-purple-600 to-indigo-900', textColor: '#ffffff' },
  { name: 'GoPay Lime Green', value: 'from-emerald-500 to-teal-800', textColor: '#ffffff' },
  { name: 'ShopeePay Fire Orange', value: 'from-orange-500 to-red-500', textColor: '#ffffff' },
  { name: 'Cash Slate Gray', value: 'from-neutral-600 to-neutral-900', textColor: '#ffffff' },
  { name: 'Cyberpunk Violet', value: 'from-[#7c5cff] via-[#b030b0] to-[#00d2ff]', textColor: '#ffffff' },
];

const ICON_PRESETS = [
  { name: 'Dompet / Cash', value: 'DollarSign', component: DollarSign },
  { name: 'Kartu Debit / Kredit', value: 'CreditCard', component: CreditCard },
  { name: 'Buku Tabungan / Bank', value: 'Landmark', component: Landmark },
  { name: 'Smartphone / E-Wallet', value: 'Smartphone', component: Smartphone },
  { name: 'Sparkles', value: 'Sparkles', component: Sparkles },
  { name: 'Wallet Simple', value: 'Wallet', component: Wallet },
];

export function SumberUangView({
  accounts,
  onAddAccount,
  onEditAccount,
  onDeleteAccount
}: SumberUangViewProps) {
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formBalance, setFormBalance] = useState('');
  const [formColor, setFormColor] = useState('from-blue-600 to-blue-900');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formIconName, setFormIconName] = useState('CreditCard');

  const totalBalanceAllSources = accounts.reduce((sum, a) => sum + a.balance, 0);

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setFormName('');
    setFormBalance('');
    setFormColor('from-blue-600 to-blue-900');
    setFormAccountNumber('');
    setFormIconName('CreditCard');
    setShowModal(true);
  };

  const handleOpenEdit = (acc: Account) => {
    setIsEditMode(true);
    setEditId(acc.id);
    setFormName(acc.name);
    setFormBalance(acc.balance.toString());
    setFormColor(acc.color || 'from-blue-600 to-blue-900');
    setFormAccountNumber(acc.accountNumber || '');
    setFormIconName(acc.iconName || 'CreditCard');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const parsedBalance = parseFloat(formBalance) || 0;
    const selectedPreset = GRADIENT_PRESETS.find(p => p.value === formColor);
    const textCol = selectedPreset ? selectedPreset.textColor : '#ffffff';

    if (isEditMode && editId) {
      onEditAccount(editId, {
        name: formName,
        balance: parsedBalance,
        color: formColor,
        accountNumber: formAccountNumber,
        iconName: formIconName,
        textColor: textCol
      });
    } else {
      onAddAccount({
        name: formName,
        balance: parsedBalance,
        color: formColor,
        accountNumber: formAccountNumber,
        iconName: formIconName,
        textColor: textCol
      });
    }

    setShowModal(false);
  };

  // Helper to dynamically render icon component from its string name
  const renderIcon = (name: string, className = "h-5 w-5") => {
    switch (name) {
      case 'DollarSign': return <DollarSign className={className} />;
      case 'CreditCard': return <CreditCard className={className} />;
      case 'Landmark': return <Landmark className={className} />;
      case 'Smartphone': return <Smartphone className={className} />;
      case 'Sparkles': return <Sparkles className={className} />;
      default: return <Wallet className={className} />;
    }
  };

  return (
    <div className="space-y-6" id="sumber-uang-view-root">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0c1020]/40 p-6 rounded-3xl border border-white/[0.04] backdrop-blur-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Wallet className="h-6 w-6 text-[#7c5cff]" /> Kelola Sumber Uang Anda
          </h1>
          <p className="text-xs text-[#9aa4bf] mt-1">Definisikan bank, e-wallet, dompet fisik, or akun keuangan lainnya untuk pengelompokan saldo kas</p>
        </div>
        
        <button
          onClick={handleOpenAdd}
          className="px-4.5 py-2.5 bg-gradient-to-r from-[#7c5cff] to-[#00d2ff] hover:from-[#6c4be6] hover:to-[#00b2e6] text-white font-extrabold text-xs rounded-xl shadow-[0_4px_15px_rgba(124,92,255,0.35)] hover:shadow-[0_4px_20px_rgba(124,92,255,0.5)] active:scale-97 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Tambah Sumber Uang
        </button>
      </div>

      {/* SUMMARY TOTAL BOX */}
      <div className="bg-gradient-to-r from-[#11162d] via-[#10152a] to-[#0a0c16] rounded-3xl border border-white/[0.05] p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#7c5cff]/5 rounded-full blur-[100px] pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold text-[#00ffa3] tracking-wider uppercase bg-[#00ffa3]/10 px-2 py-0.5 rounded-md">SALDO GABUNGAN</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-3">
              {formatCurrency(totalBalanceAllSources)}
            </h2>
            <p className="text-xs text-[#9aa4bf] mt-1.5">Aset likuid Anda yang dialokasikan di {accounts.length} sumber uang berbeda.</p>
          </div>
          
          <div className="bg-white/[0.02] border border-white/[0.05] p-3.5 rounded-2xl flex items-center gap-3">
            <Info className="h-5 w-5 text-[#00d2ff] shrink-0" />
            <p className="text-[11px] text-[#9aa4bf] max-w-[240px] leading-relaxed">
              Pencatatan mutasi di menu <strong className="text-white">Transaksi</strong> atau <strong className="text-white">AI Smart Input</strong> akan secara dinamis membelanjakan atau menambah saldo ke rekening ini.
            </p>
          </div>
        </div>
      </div>

      {/* ACCOUNTS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
        {accounts.map((acc) => {
          const percentage = totalBalanceAllSources > 0 ? (acc.balance / totalBalanceAllSources) * 100 : 0;
          return (
            <div 
              key={acc.id}
              className={`relative overflow-hidden bg-gradient-to-br ${acc.color || 'from-[#11182d] to-[#060814]'} p-3 sm:p-5.5 rounded-2xl sm:rounded-3xl border border-white/[0.06] hover:-translate-y-1.5 transition-all duration-300 shadow-lg flex flex-col justify-between min-h-[125px] sm:min-h-[190px] group`}
            >
              {/* Card Holographic Flare effect */}
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-white/[0.03] group-hover:bg-white/[0.06] rounded-full blur-xl pointer-events-none transition-all duration-300"></div>
              
              <div className="flex justify-between items-center relative z-10 gap-2 w-full">
                <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
                  <span className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-white/10 text-white shadow-sm backdrop-blur-md flex items-center justify-center shrink-0">
                    {renderIcon(acc.iconName || 'CreditCard')}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide truncate">{acc.name}</h3>
                    {acc.accountNumber && (
                      <p className="text-[8px] sm:text-[10px] font-mono text-white/60 mt-0.5 tracking-wider font-semibold truncate">{acc.accountNumber}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 opacity-60 sm:opacity-40 group-hover:opacity-100 transition-opacity shrink-0">
                  <button 
                    onClick={() => handleOpenEdit(acc)}
                    className="p-1 sm:p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title="Ubah Rincian"
                  >
                    <Edit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </button>
                  <button 
                    onClick={() => onDeleteAccount(acc.id)}
                    className="p-1 sm:p-1.5 rounded-md bg-red-500/10 hover:bg-red-500/30 text-red-200 hover:text-red-400 transition-colors cursor-pointer"
                    title="Hapus"
                  >
                    <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 sm:mt-6 relative z-10 text-left">
                <p className="text-[8px] sm:text-[9px] font-mono text-white/50 uppercase tracking-widest font-black leading-none">SALDO REKENING</p>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mt-1 gap-1 w-full">
                  <h4 className="text-xs sm:text-xl md:text-2xl font-black text-white tracking-tight leading-none truncate flex-1 min-w-0">
                    {formatCurrency(acc.balance)}
                  </h4>
                  <span className="text-[8px] sm:text-[10px] font-mono text-white/80 font-black px-1.5 py-0.5 bg-white/10 rounded-md backdrop-blur-md shrink-0">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Progress visual slider */}
              <div className="w-full bg-white/10 h-1 sm:h-1.5 rounded-full overflow-hidden mt-2.5 sm:mt-4 relative z-10">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* EDIT/ADD MODAL DIALOG */}
      {showModal && (
        <div className="fixed inset-0 bg-[#060813]/85 backdrop-blur-lg z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1020] border border-white/[0.08] rounded-3xl w-full max-w-md p-6 relative shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-fade-in text-left">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 mb-1">
              {isEditMode ? <Edit2 className="h-5 w-5 text-[#7c5cff]" /> : <Plus className="h-5 w-5 text-[#7c5cff]" />}
              {isEditMode ? 'Edit Rincian Sumber Uang' : 'Tambah Sumber Uang Baru'}
            </h2>
            <p className="text-[11px] text-[#9aa4bf] mb-5">Atur detail nama, saldo bawaan, serta presentasi visual kartu rekening Anda.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-white uppercase tracking-wider mb-1.5">Nama Rekening/Sumber</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: BCA, GoPay, Dompet Fisik"
                  className="w-full p-2.5 bg-[#060813] text-xs rounded-xl border border-white/[0.08] text-white focus:outline-none focus:border-[#7c5cff]/60 focus:ring-1 focus:ring-[#7c5cff]/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white uppercase tracking-wider mb-1.5">Saldo Saat Ini (Rp)</label>
                  <input
                    type="number"
                    required
                    value={formBalance}
                    onChange={(e) => setFormBalance(e.target.value)}
                    placeholder="Contoh: 5000000"
                    className="w-full p-2.5 bg-[#060813] text-xs font-mono rounded-xl border border-white/[0.08] text-white focus:outline-none focus:border-[#7c5cff]/60 focus:ring-1 focus:ring-[#7c5cff]/60"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white uppercase tracking-wider mb-1.5">No Rekening / Identifier</label>
                  <input
                    type="text"
                    value={formAccountNumber}
                    onChange={(e) => setFormAccountNumber(e.target.value)}
                    placeholder="Contoh: •••• 9901 atau Dompet"
                    className="w-full p-2.5 bg-[#060813] text-xs font-mono rounded-xl border border-white/[0.08] text-white focus:outline-none focus:border-[#7c5cff]/60 focus:ring-1 focus:ring-[#7c5cff]/60"
                  />
                </div>
              </div>

              {/* Selector Presets Icon */}
              <div>
                <label className="block text-[10px] font-bold text-white uppercase tracking-wider mb-2">Simbol / Icon</label>
                <div className="grid grid-cols-6 gap-2 bg-[#060813] p-2 rounded-xl border border-white/[0.06]">
                  {ICON_PRESETS.map((icon) => {
                    const IconComp = icon.component;
                    const isSelected = formIconName === icon.value;
                    return (
                      <button
                        type="button"
                        key={icon.value}
                        onClick={() => setFormIconName(icon.value)}
                        className={`p-2 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-[#7c5cff] text-white scale-105 shadow-md' 
                            : 'bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.05]'
                        }`}
                        title={icon.name}
                      >
                        <IconComp className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector Visual Gradients */}
              <div>
                <label className="block text-[10px] font-bold text-white uppercase tracking-wider mb-2">Pilih Palette Warna Kartu</label>
                <div className="grid grid-cols-4 gap-2 bg-[#060813] p-2.5 rounded-xl border border-white/[0.06] max-h-[120px] overflow-y-auto">
                  {GRADIENT_PRESETS.map((p) => {
                    const isSelected = formColor === p.value;
                    return (
                      <button
                        type="button"
                        key={p.name}
                        onClick={() => setFormColor(p.value)}
                        className={`h-8 rounded-lg bg-gradient-to-br ${p.value} border flex items-center justify-center transition-all cursor-pointer relative overflow-hidden ${
                          isSelected ? 'border-white scale-103 shadow-md ring-1 ring-white/10' : 'border-transparent hover:scale-101'
                        }`}
                        title={p.name}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submission Button Row */}
              <div className="flex justify-end gap-3.5 pt-4 border-t border-white/[0.05]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#7c5cff] hover:bg-[#6c4be6] text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1"
                >
                  <Check className="h-4 w-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
