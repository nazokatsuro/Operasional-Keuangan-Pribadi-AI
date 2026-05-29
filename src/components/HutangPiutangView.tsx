/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, Edit2, Trash2, Calendar, ClipboardList, AlertCircle, CheckCircle2, 
  UserMinus, UserPlus, Info, Check, X, BellDot
} from 'lucide-react';
import { Debt, Account, formatCurrency } from '../utils/financeHelper';

interface HutangPiutangViewProps {
  debts: Debt[];
  accounts: Account[];
  onAddDebt: (debt: Omit<Debt, 'id'>, sourceAccountName: string) => void;
  onEditDebt: (id: string, debt: Partial<Debt>) => void;
  onDeleteDebt: (id: string) => void;
  onPayDebtInstallment: (id: string, payAmount: number, accountName: string) => void;
}

export function HutangPiutangView({
  debts,
  accounts,
  onAddDebt,
  onEditDebt,
  onDeleteDebt,
  onPayDebtInstallment
}: HutangPiutangViewProps) {
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Repayment Modal states
  const [showPayModal, setShowPayModal] = useState(false);
  const [payTargetDebt, setPayTargetDebt] = useState<Debt | null>(null);
  const [payFormNominal, setPayFormNominal] = useState('');
  const [payFormAccount, setPayFormAccount] = useState('Cash');

  // Form states
  const [formPersonName, setFormPersonName] = useState('');
  const [formType, setFormType] = useState<'Hutang' | 'Piutang'>('Piutang');
  const [formNominal, setFormNominal] = useState('');
  const [formPaidNominal, setFormPaidNominal] = useState('');
  const [formDueDate, setFormDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formInstallments, setFormInstallments] = useState('1');
  const [formNotes, setFormNotes] = useState('');
  const [formReminder, setFormReminder] = useState(true);
  const [formAccountName, setFormAccountName] = useState('Cash');

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setFormPersonName('');
    setFormType('Piutang');
    setFormNominal('');
    setFormPaidNominal('0');
    setFormDueDate(new Date().toISOString().split('T')[0]);
    setFormInstallments('1');
    setFormNotes('');
    setFormReminder(true);
    setFormAccountName(accounts[0]?.name || 'Cash');
    setShowModal(true);
  };

  const handleOpenPayInstallment = (debt: Debt) => {
    setPayTargetDebt(debt);
    setPayFormNominal((debt.nominal - debt.paidNominal).toString());
    setPayFormAccount(accounts[0]?.name || 'Cash');
    setShowPayModal(true);
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTargetDebt) return;
    const amount = parseFloat(payFormNominal);
    if (isNaN(amount) || amount <= 0) return;
    
    onPayDebtInstallment(payTargetDebt.id, amount, payFormAccount);
    setShowPayModal(false);
  };

  const handleOpenEdit = (debt: Debt) => {
    setIsEditMode(true);
    setEditId(debt.id);
    setFormPersonName(debt.personName);
    setFormType(debt.type);
    setFormNominal(debt.nominal.toString());
    setFormPaidNominal(debt.paidNominal.toString());
    setFormDueDate(debt.dueDate);
    setFormInstallments(debt.installmentsCount.toString());
    setFormNotes(debt.notes || '');
    setFormReminder(debt.reminderStatus);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPersonName || !formNominal || !formPaidNominal) return;

    const nomNum = parseFloat(formNominal);
    const paidNum = parseFloat(formPaidNominal);
    const instNum = parseInt(formInstallments) || 1;

    if (isNaN(nomNum) || isNaN(paidNum)) return;

    const debtData = {
      personName: formPersonName,
      type: formType,
      nominal: nomNum,
      paidNominal: paidNum,
      dueDate: formDueDate,
      installmentsCount: instNum,
      notes: formNotes || undefined,
      reminderStatus: formReminder
    };

    if (isEditMode && editId) {
      onEditDebt(editId, debtData);
    } else {
      onAddDebt(debtData, formAccountName);
    }
    setShowModal(false);
  };

  const totalHutang = debts
    .filter(d => d.type === 'Hutang')
    .reduce((sum, d) => sum + (d.nominal - d.paidNominal), 0);

  const totalPiutang = debts
    .filter(d => d.type === 'Piutang')
    .reduce((sum, d) => sum + (d.nominal - d.paidNominal), 0);

  // Helper date status warning
  const getDueAlertStatus = (dueDateStr: string, isLunas: boolean) => {
    if (isLunas) return { label: 'Lunas', color: 'text-[#16c784] bg-[#16c784]/10' };
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dueDateStr);
    due.setHours(0,0,0,0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { label: `Overdue ${Math.abs(diffDays)} Hari`, color: 'text-[#ff5c7a] bg-[#ff5c7a]/10 font-bold animate-pulse', urgent: true };
    }
    if (diffDays === 0) {
      return { label: 'Jatuh Tempo Hari Ini!', color: 'text-amber-400 bg-amber-500/10 font-bold', urgent: true };
    }
    if (diffDays <= 7) {
      return { label: `${diffDays} Hari Lagi`, color: 'text-[#ffb547] bg-white/5', urgent: false };
    }
    return { label: `${diffDays} Hari Lagi`, color: 'text-[#9aa4bf] bg-white/5', urgent: false };
  };

  const hutangList = debts.filter(d => d.type === 'Hutang');
  const piutangList = debts.filter(d => d.type === 'Piutang');

  const DebtCard = ({ item, onEdit, onDelete, onPay }: { item: Debt, onEdit: (d: Debt) => void, onDelete: (id: string) => void, onPay: (d: Debt) => void }) => {
    const sisaPunya = item.nominal - item.paidNominal;
    const isLunas = sisaPunya <= 0;
    const pctLunas = Math.round((item.paidNominal / item.nominal) * 100);
    const dueAlert = getDueAlertStatus(item.dueDate, isLunas);

    return (
      <div 
        key={item.id}
        className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 relative overflow-hidden flex flex-col justify-between shadow-lg"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] rounded-full blur-xl pointer-events-none"></div>

        <div>
          <div className="flex justify-between items-start">
            <div>
              <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono tracking-wider ${
                item.type === 'Hutang' ? 'bg-[#ffb547]/10 text-[#ffb547]' : 'bg-[#16c784]/10 text-[#16c784]'
              }`}>
                {item.type === 'Hutang' ? 'Hutang Kita' : 'Piutang ke Orang'}
              </span>
              <h3 className="text-sm font-bold text-white mt-2 block">{item.personName}</h3>
              <p className="text-[10px] text-[#9aa4bf] mt-0.5">{item.notes || '-'}</p>
            </div>

            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => onEdit(item)}
                className="p-1 px-1.5 rounded-lg bg-white/[0.03] hover:bg-white/10 text-white cursor-pointer"
              >
                <Edit2 className="h-3 w-3" />
              </button>
              <button 
                onClick={() => onDelete(item.id)}
                className="p-1 px-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-[#ff5c7a] cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="mt-4.5 space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#9aa4bf]">Terbayar: {pctLunas}%</span>
              <span className="text-white font-bold">{formatCurrency(item.paidNominal)} / {formatCurrency(item.nominal)}</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full bg-gradient-to-r ${
                  item.type === 'Hutang' ? 'from-amber-400 to-amber-600' : 'from-[#16c784] to-[#00d4ff]'
                }`}
                style={{ width: `${pctLunas}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center justify-between mt-5 pt-3.5 border-t border-white/[0.03] text-xs">
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${dueAlert.color}`}>
              {dueAlert.label}
            </span>
            {item.reminderStatus && !isLunas && (
              <span className="p-1 rounded bg-[#7c5cff]/15 text-[#7c5cff]" title="Alarm Hidup">
                <BellDot className="h-3 w-3" />
              </span>
            )}
            {!isLunas && (
              <button
                onClick={() => onPay(item)}
                className="px-2 py-1 rounded bg-[#7c5cff]/15 text-[#a28aff] hover:bg-[#7c5cff] hover:text-white text-[10px] font-bold transition-all cursor-pointer border border-white/5 mx-1"
              >
                {item.type === 'Hutang' ? 'Bayar' : 'Terima'}
              </button>
            )}
          </div>

          <div className="text-right">
            <span className="text-[10px] text-[#9aa4bf]">Sisa Tagihan:</span>
            <p className="text-xs font-extrabold text-white font-mono">{formatCurrency(sisaPunya)}</p>
          </div>
        </div>
      </div>
    );
  }

  const allReminders = debts
    .filter(d => !d.reminderStatus && !(d.nominal <= d.paidNominal))
    .map(d => ({ ...d, alert: getDueAlertStatus(d.dueDate, false) }))
    .filter(d => d.alert.urgent);
    
  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="text-[10px] text-[#16c784] font-bold uppercase tracking-widest font-mono">Balance Reminder</div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1">Manajemen Hutang & Piutang</h1>
          <p className="text-xs text-[#9aa4bf] mt-1">Catat pinjaman dana darurat (hutang) atau uang talangan yang dipinjamkan ke teman (piutang) dengan alarm cerdas jatuh tempo.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-[#16c784] text-white font-bold text-xs hover:bg-[#12a36b] transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Tambah Sangkutan Baru
        </button>
      </div>

      {/* REMINDERS SECTION */}
      {allReminders.length > 0 && (
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] shadow-lg">
          <div className="flex items-center gap-2 mb-4 text-[#ffb547]">
            <BellDot className="h-4 w-4" />
            <h3 className="text-xs font-bold uppercase tracking-widest font-mono">Reminders Pengingkat Jatuh Tempo Aktif ({allReminders.length})</h3>
          </div>
          <div className="space-y-2">
            {allReminders.map(rem => (
               <div key={rem.id} className={`p-3 rounded-lg border flex items-center gap-3 ${rem.alert.color.includes('ff5c7a') ? 'bg-[#ff5c7a]/5 border-[#ff5c7a]/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                 <AlertCircle className={`h-4 w-4 ${rem.alert.color.split(' ')[0]}`} />
                 <span className={`text-xs ${rem.alert.color.split(' ')[0]}`}>{rem.type === 'Hutang' ? 'Terlambat pelunasan oleh' : 'Jatuh tempo tagih piutang ke'} {rem.personName}: {formatCurrency(rem.nominal - rem.paidNominal)} ({rem.alert.label})</span>
               </div>
            ))}
          </div>
        </div>
      )}

      {/* DETAILED LEDGER GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hutang Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[#ffb547]">
            <UserMinus className="h-4 w-4" />
            <h2 className="text-sm font-bold">Pos Hutang (Tanggungan Kita)</h2>
          </div>
          {hutangList.map((item) => (
            <DebtCard key={item.id} item={item} onEdit={handleOpenEdit} onDelete={onDeleteDebt} onPay={handleOpenPayInstallment} />
          ))}
        </div>
        
        {/* Piutang Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[#16c784]">
            <UserPlus className="h-4 w-4" />
            <h2 className="text-sm font-bold">Pos Piutang (Hak Tagihan Kita)</h2>
          </div>
          {piutangList.map((item) => (
             <DebtCard key={item.id} item={item} onEdit={handleOpenEdit} onDelete={onDeleteDebt} onPay={handleOpenPayInstallment} />
          ))}
        </div>
      </div>

      {/* SLIDE MODAL ADD DEBT */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-[24px] bg-[#0c1020] border border-white/[0.1] shadow-2xl p-6 space-y-4 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-white/[0.04]">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{isEditMode ? 'Edit Hutang / Piutang' : 'Catat Hutang / Piutang'}</h3>
              <button onClick={() => setShowModal(false)} className="text-[#9aa4bf] hover:text-white cursor-pointer">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.02] border border-white/5">
                <button
                  type="button"
                  onClick={() => setFormType('Piutang')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    formType === 'Piutang' ? 'bg-[#16c784]/15 text-[#16c784]' : 'text-[#9aa4bf] hover:text-white'
                  }`}
                >
                  Orang Pinjam Kita
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('Hutang')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    formType === 'Hutang' ? 'bg-amber-500/10 text-[#ffb547]' : 'text-[#9aa4bf] hover:text-white'
                  }`}
                >
                  Kita Pinjam Orang
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">Nama Orang / Rekan</label>
                <input 
                  type="text" 
                  value={formPersonName}
                  onChange={(e) => setFormPersonName(e.target.value)}
                  placeholder="Misal: Andi Pratama, Bu Siska, dll"
                  required
                  className="w-full px-3 py-2 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff]"
                />
              </div>

              {!isEditMode && (
                <div className="space-y-1">
                  <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">
                    {formType === 'Hutang' ? 'Saku Tujuan Penerimaan Dana (Inflow)' : 'Saku Sumber Pengeluaran Dana (Outflow)'}
                  </label>
                  <select
                    value={formAccountName}
                    onChange={(e) => setFormAccountName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0c1020] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff]"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.name}>
                        {acc.name} ({formatCurrency(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">Jumlah Uang (Rp)</label>
                  <input 
                    type="number" 
                    value={formNominal}
                    onChange={(e) => setFormNominal(e.target.value)}
                    placeholder="0"
                    required
                    className="w-full px-3 py-2 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">Telah Dibayar (Rp)</label>
                  <input 
                    type="number" 
                    value={formPaidNominal}
                    onChange={(e) => setFormPaidNominal(e.target.value)}
                    placeholder="0"
                    required
                    className="w-full px-3 py-2 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">Jatuh Tempo</label>
                  <input 
                    type="date" 
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">Rencana Cicilan (Kali)</label>
                  <input 
                    type="number" 
                    value={formInstallments}
                    onChange={(e) => setFormInstallments(e.target.value)}
                    placeholder="1"
                    min="1"
                    className="w-full px-3 py-2 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff] font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">Catatan Tambahan</label>
                <textarea 
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Keterangan transfer BCA atau alasan pinjaman..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-white/[0.03] text-xs text-white hover:bg-white/[0.07] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-[#7c5cff] text-white font-bold text-xs hover:bg-[#6847ff] cursor-pointer"
                >
                  Simpan Buku
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPAYMENT / CICILAN MODAL */}
      {showPayModal && payTargetDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-[24px] bg-[#0c1020] border border-white/[0.1] shadow-2xl p-6 space-y-4 text-left animate-in fade-in duration-100">
            <div className="flex justify-between items-center pb-2 border-b border-white/[0.04]">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {payTargetDebt.type === 'Hutang' ? 'Bayar Cicilan Hutang' : 'Terima Pembayaran Piutang'}
              </h3>
              <button onClick={() => setShowPayModal(false)} className="text-[#9aa4bf] hover:text-white cursor-pointer">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#9aa4bf]">Rekan:</span>
                <span className="text-white font-bold">{payTargetDebt.personName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9aa4bf]">Total Tagihan:</span>
                <span className="text-white font-mono">{formatCurrency(payTargetDebt.nominal)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9aa4bf]">Sisa Terbuka:</span>
                <span className="text-amber-400 font-bold font-mono">
                  {formatCurrency(payTargetDebt.nominal - payTargetDebt.paidNominal)}
                </span>
              </div>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">
                  Jumlah Pembayaran (Rp)
                </label>
                <input 
                  type="number" 
                  value={payFormNominal}
                  onChange={(e) => setPayFormNominal(e.target.value)}
                  placeholder="0"
                  max={payTargetDebt.nominal - payTargetDebt.paidNominal}
                  required
                  className="w-full px-3 py-2 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff] font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">
                  {payTargetDebt.type === 'Hutang' ? 'Bayar Pakai Saku' : 'Simpan Masuk Saku'}
                </label>
                <select
                  value={payFormAccount}
                  onChange={(e) => setPayFormAccount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0c1020] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff]"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.name}>
                      {acc.name} ({formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-400 mt-1 italic">
                  {payTargetDebt.type === 'Hutang' 
                    ? '*Mengurangi saldo akun finansial' 
                    : '*Menambah saldo akun finansial'}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-white/[0.03] text-xs text-white hover:bg-white/[0.07] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-[#7c5cff] text-white font-bold text-xs hover:bg-[#6847ff] cursor-pointer"
                >
                  Konfirmasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
