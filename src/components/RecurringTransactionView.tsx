import React, { useState } from 'react';
import { RefreshCw, Play, Pause, Trash2, Plus, Calendar, Bell, Shield, ShieldAlert, Sparkles } from 'lucide-react';
import { RecurringTransaction, BillReminder } from '../types';
import { formatCurrency } from '../utils/financeHelper';

interface RecurringTransactionViewProps {
  recurringTransactions: RecurringTransaction[];
  billReminders: BillReminder[];
  onAddRecurring: (item: RecurringTransaction) => void;
  onUpdateRecurringStatus: (id: string, status: 'Aktif' | 'Pause') => void;
  onDeleteRecurring: (id: string) => void;
  onAddBillReminder: (item: BillReminder) => void;
  onDeleteBillReminder: (id: string) => void;
}

export function RecurringTransactionView({
  recurringTransactions,
  billReminders,
  onAddRecurring,
  onUpdateRecurringStatus,
  onDeleteRecurring,
  onAddBillReminder,
  onDeleteBillReminder,
}: RecurringTransactionViewProps) {
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);

  // States for adding recurring transaction
  const [txName, setTxName] = useState('');
  const [txNominal, setTxNominal] = useState('');
  const [txCat, setTxCat] = useState('Langganan');
  const [txSource, setTxSource] = useState('BCA');
  const [txFreq, setTxFreq] = useState<RecurringTransaction['frequency']>('Bulanan');

  // States for adding bill reminder
  const [remName, setRemName] = useState('');
  const [remNominal, setRemNominal] = useState('');
  const [remDueDate, setRemDueDate] = useState('');
  const [remCat, setRemCat] = useState('Internet');
  const [remPeriod, setRemPeriod] = useState<BillReminder['reminderPeriod']>('H-3');

  const handleAddTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txName || !txNominal) return;

    onAddRecurring({
      id: 'rec_' + Date.now(),
      name: txName,
      nominal: parseFloat(txNominal) || 0,
      category: txCat,
      source: txSource,
      frequency: txFreq,
      status: 'Aktif',
    });

    setTxName('');
    setTxNominal('');
    setTxCat('Langganan');
    setTxSource('BCA');
    setTxFreq('Bulanan');
    setShowAddTxModal(false);
  };

  const handleAddRemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remName || !remNominal || !remDueDate) return;

    onAddBillReminder({
      id: 'rem_' + Date.now(),
      name: remName,
      nominal: parseFloat(remNominal) || 0,
      dueDate: remDueDate,
      category: remCat,
      reminderPeriod: remPeriod,
    });

    setRemName('');
    setRemNominal('');
    setRemDueDate('');
    setRemCat('Internet');
    setRemPeriod('H-3');
    setShowAddReminderModal(false);
  };

  // Compute countdown labels for reminders
  const getCountdownLabel = (dueDateStr: string) => {
    const due = new Date(dueDateStr);
    const today = new Date('2026-05-30'); // system constant current local time reference
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hari Ini';
    if (diffDays === 1) return 'Besok';
    if (diffDays < 0) return 'Terlewat (' + Math.abs(diffDays) + ' hari yang lalu)';
    return `${diffDays} Hari Lagi`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-[#7c5cff]" />
            Transaksi Berulang & Reminder <span className="text-xs bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-[#9aa4bf] font-normal font-mono">Autopay Center</span>
          </h1>
          <p className="text-xs text-[#9aa4bf]">Otomatisasi pengeluaran rutin berlangganan serta atur sistem tagihan berjadwal Anda</p>
        </div>
      </div>

      {/* TWO COLUMN GRID PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* RECURRING SCHEDULER */}
        <div className="bg-white/[0.02] border border-white/[0.06] p-5 rounded-[24px] space-y-4">
          <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
            <h3 className="text-xs uppercase font-mono font-bold text-white flex items-center gap-1.5">
              🔄 Transaksi Berulang Aktif
            </h3>
            <button
              onClick={() => setShowAddTxModal(true)}
              className="flex items-center gap-1 px-3 py-1 bg-white/5 border border-white/5 hover:border-[#7c5cff]/30 text-[10px] text-white rounded-lg hover:bg-white/10 font-bold transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Autopay</span>
            </button>
          </div>

          <div className="space-y-3">
            {recurringTransactions.length === 0 ? (
              <p className="text-xs text-[#9aa4bf] py-6 text-center">Belum ada penjadwal otomatis terdaftar</p>
            ) : (
              recurringTransactions.map((rec) => (
                <div key={rec.id} className="p-3.5 bg-white/[0.01] border border-white/5 rounded-xl flex items-center justify-between transition-all hover:bg-white/[0.03]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${rec.status === 'Aktif' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span className="text-xs font-bold text-white">{rec.name}</span>
                    </div>
                    <div className="text-[10px] text-[#9aa4bf] font-mono">
                      {formatCurrency(rec.nominal)} • {rec.frequency} • <strong className="text-slate-400">{rec.source}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {rec.status === 'Aktif' ? (
                      <button
                        onClick={() => onUpdateRecurringStatus(rec.id, 'Pause')}
                        className="p-1 px-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-lg border border-amber-500/15 transition-all cursor-pointer flex items-center gap-1"
                        title="Pause"
                      >
                        <Pause className="h-3 w-3" />
                        <span>Sita</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onUpdateRecurringStatus(rec.id, 'Aktif')}
                        className="p-1 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/15 transition-all cursor-pointer flex items-center gap-1 animate-pulse"
                        title="Resume"
                      >
                        <Play className="h-3 w-3" />
                        <span>Mulai</span>
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteRecurring(rec.id)}
                      className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/15 transition-all cursor-pointer"
                      title="Deconstruct"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* BILL REMINDERS */}
        <div className="bg-white/[0.02] border border-white/[0.06] p-5 rounded-[24px] space-y-4">
          <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
            <h3 className="text-xs uppercase font-mono font-bold text-white flex items-center gap-1.5">
              📅 Tagihan & Jadwal Jatuh Tempo
            </h3>
            <button
              onClick={() => setShowAddReminderModal(true)}
              className="flex items-center gap-1 px-3 py-1 bg-white/5 border border-white/5 hover:border-[#7c5cff]/30 text-[10px] text-white rounded-lg hover:bg-white/10 font-bold transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Tagihan</span>
            </button>
          </div>

          <div className="space-y-3">
            {billReminders.length === 0 ? (
              <p className="text-xs text-[#9aa4bf] py-6 text-center">Belum ada pengingat tagihan berjadwal</p>
            ) : (
              billReminders.map((rem) => {
                const countdown = getCountdownLabel(rem.dueDate);
                return (
                  <div key={rem.id} className="p-3.5 bg-white/[0.01] border border-white/5 rounded-xl flex items-center justify-between transition-all hover:bg-white/[0.03]">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white">{rem.name}</div>
                      <div className="text-[10px] text-[#9aa4bf] font-mono">
                        {formatCurrency(rem.nominal)} • Jatuh Tempo <strong className="text-white">{rem.dueDate}</strong> ({rem.reminderPeriod})
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 font-mono">
                      <span className="px-2.5 py-1 bg-[#ffb547]/5 border border-[#ffb547]/15 rounded-lg text-[#ffb547] text-[10px] font-bold">
                        {countdown}
                      </span>
                      <button
                        onClick={() => onDeleteBillReminder(rem.id)}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* AUTOPAY INITIATION POPUP */}
      {showAddTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowAddTxModal(false)}></div>
          <div className="bg-[#0b1020] border border-white/[0.08] rounded-[28px] w-full max-w-sm p-6 relative z-10 text-white space-y-4">
            <h2 className="text-sm font-black text-white flex items-center gap-1.5">
              🔄 Tambah Transaksi Berulang Baru
            </h2>

            <form onSubmit={handleAddTxSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono">Nama Pengeluaran</label>
                <input 
                  type="text" 
                  value={txName}
                  onChange={(e) => setTxName(e.target.value)}
                  placeholder="E.g., Spotify Fam, Internet PLN"
                  required
                  className="w-full px-3 py-2 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono">Nominal Mandatori (Rp)</label>
                  <input 
                    type="text" 
                    value={txNominal ? parseInt(txNominal, 10).toLocaleString('id-ID') : ''}
                    onChange={(e) => setTxNominal(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    required
                    className="w-full px-3 py-2 bg-white/[0.04] text-xs font-mono text-white rounded-xl border border-white/5 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono">Sumber Pembayaran</label>
                  <select
                    value={txSource}
                    onChange={(e) => setTxSource(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0c1020] text-xs text-white rounded-xl border border-white/5 focus:outline-none"
                  >
                    <option value="BCA" className="bg-[#0b1020] text-white">BCA</option>
                    <option value="Mandiri" className="bg-[#0b1020] text-white">Mandiri</option>
                    <option value="Jago" className="bg-[#0b1020] text-white">Jago</option>
                    <option value="GoPay" className="bg-[#0b1020] text-white">GoPay</option>
                    <option value="Dana" className="bg-[#0b1020] text-white">Dana</option>
                    <option value="Cash" className="bg-[#0b1020] text-white">Cash</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono">Kategori</label>
                  <select
                    value={txCat}
                    onChange={(e) => setTxCat(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0c1020] text-xs text-white rounded-xl border border-white/5 focus:outline-none"
                  >
                    <option value="Langganan" className="bg-[#0b1020] text-white">Langganan</option>
                    <option value="Internet" className="bg-[#0b1020] text-white">Internet</option>
                    <option value="Listrik" className="bg-[#0b1020] text-white">Listrik</option>
                    <option value="Hiburan" className="bg-[#0b1020] text-white">Hiburan</option>
                    <option value="Kesehatan" className="bg-[#0b1020] text-white">Kesehatan</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono">Siklus Pengulangan</label>
                  <select
                    value={txFreq}
                    onChange={(e) => setTxFreq(e.target.value as RecurringTransaction['frequency'])}
                    className="w-full px-3 py-2 bg-[#0c1020] text-xs text-white rounded-xl border border-white/5 focus:outline-none"
                  >
                    <option value="Harian" className="bg-[#0b1020] text-white">Harian</option>
                    <option value="Mingguan" className="bg-[#0b1020] text-white">Mingguan</option>
                    <option value="Bulanan" className="bg-[#0b1020] text-white">Bulanan</option>
                    <option value="Tahunan" className="bg-[#0b1020] text-white">Tahunan</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddTxModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#7c5cff] hover:bg-[#684be3] rounded-xl text-white font-bold"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BILL REMINDER POPUP */}
      {showAddReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowAddReminderModal(false)}></div>
          <div className="bg-[#0b1020] border border-white/[0.08] rounded-[28px] w-full max-w-sm p-6 relative z-10 text-white space-y-4">
            <h2 className="text-sm font-black text-white flex items-center gap-1.5">
              📅 Rencana Pengingat Tagihan Baru
            </h2>

            <form onSubmit={handleAddRemSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono">Nama Tagihan</label>
                <input 
                  type="text" 
                  value={remName}
                  onChange={(e) => setRemName(e.target.value)}
                  placeholder="Contoh: Pajak STNK, Internet Biznet"
                  required
                  className="w-full px-3 py-2 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono">Tagihan Nominal (Rp)</label>
                  <input 
                    type="text" 
                    value={remNominal ? parseInt(remNominal, 10).toLocaleString('id-ID') : ''}
                    onChange={(e) => setRemNominal(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    required
                    className="w-full px-3 py-2 bg-white/[0.04] text-xs font-mono text-white rounded-xl border border-white/5 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono">Jatuh Tempo</label>
                  <input 
                    type="date" 
                    value={remDueDate}
                    onChange={(e) => setRemDueDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono">Kategori Utama</label>
                  <select
                    value={remCat}
                    onChange={(e) => setRemCat(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0c1020] text-xs text-white rounded-xl border border-white/5 focus:outline-none"
                  >
                    <option value="Internet" className="bg-[#0b1020] text-white">Internet</option>
                    <option value="Listrik" className="bg-[#0b1020] text-white">Listrik</option>
                    <option value="Pajak" className="bg-[#0b1020] text-white">Pajak</option>
                    <option value="Kesehatan" className="bg-[#0b1020] text-white">Kesehatan</option>
                    <option value="Aset" className="bg-[#0b1020] text-white">Aset</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono">Waktu Pengingat</label>
                  <select
                    value={remPeriod}
                    onChange={(e) => setRemPeriod(e.target.value as BillReminder['reminderPeriod'])}
                    className="w-full px-3 py-2 bg-[#0c1020] text-xs text-white rounded-xl border border-white/5 focus:outline-none"
                  >
                    <option value="Hari H" className="bg-[#0b1020] text-white">Hari H</option>
                    <option value="H-1" className="bg-[#0b1020] text-white">H-1 (Satu Hari Sebelumnya)</option>
                    <option value="H-3" className="bg-[#0b1020] text-white">H-3 (Tiga Hari Sebelumnya)</option>
                    <option value="H-7" className="bg-[#0b1020] text-white">H-7 (Satu Minggu Sebelumnya)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddReminderModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#7c5cff] hover:bg-[#684be3] rounded-xl text-white font-bold"
                >
                  Buat Pengingat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
