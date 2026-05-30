import React, { useState } from 'react';
import { Target, Plus, Trash2, Calendar, Award, AlertCircle, TrendingUp, CheckCircle } from 'lucide-react';
import { Goal } from '../types';
import { formatCurrency } from '../utils/financeHelper';

interface FinancialGoalsViewProps {
  goals: Goal[];
  onAddGoal: (goal: Goal) => void;
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (id: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Dana Darurat': '🛡️',
  'Beli Rumah': '🏠',
  'Beli Kendaraan': '🚗',
  'Liburan': '✈️',
  'Modal Usaha': '💼',
  'Pendidikan': '🎓',
  'Target Custom': '🎯',
};

const COLOR_PRESETS = [
  { name: 'Violet Glow', value: '#7c5cff' },
  { name: 'Emerald Sparkle', value: '#10b981' },
  { name: 'Amber Gold', value: '#f59e0b' },
  { name: 'Crimson Power', value: '#ef4444' },
  { name: 'Cyan Sky', value: '#06b6d4' },
  { name: 'Rose Dream', value: '#f43f5e' },
];

export function FinancialGoalsView({
  goals,
  onAddGoal,
  onEditGoal,
  onDeleteGoal,
}: FinancialGoalsViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Goal['category']>('Dana Darurat');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState('#7c5cff');

  // Calculating stats
  const totalGoals = goals.length;
  const activeGoals = goals.filter(g => g.currentAmount < g.targetAmount).length;
  const achievedGoals = goals.filter(g => g.currentAmount >= g.targetAmount).length;
  
  // Find nearest goal based on deadline
  const nearestGoal = goals
    .filter(g => g.currentAmount < g.targetAmount && g.deadline)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;

    const newGoal: Goal = {
      id: 'g_' + Date.now(),
      name,
      category,
      targetAmount: parseFloat(targetAmount) || 0,
      currentAmount: parseFloat(currentAmount) || 0,
      deadline,
      color,
    };

    onAddGoal(newGoal);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setCategory('Dana Darurat');
    setTargetAmount('');
    setCurrentAmount('');
    setDeadline('');
    setColor('#7c5cff');
    setShowAddModal(false);
  };

  const handleQuickAddFunds = (goal: Goal, amount: number) => {
    const updated = {
      ...goal,
      currentAmount: Math.min(goal.targetAmount, goal.currentAmount + amount),
    };
    onEditGoal(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Target className="h-6 w-6 text-[#7c5cff]" />
            Target Keuangan <span className="text-xs bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-[#9aa4bf] font-normal">Premium Planner</span>
          </h1>
          <p className="text-xs text-[#9aa4bf]">Rencanakan, kumpulkan dana, dan raih impian keuangan Anda secara terstruktur</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#7c5cff] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#7c5cff]/25 hover:bg-[#684be3] transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Target Baru</span>
        </button>
      </div>

      {/* TOP ANALYTICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/[0.02] border border-white/[0.04] p-4.5 rounded-2xl flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xl">
            🎯
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-[#9aa4bf]">Total Goal Aktif</span>
            <div className="text-lg font-black text-white">{activeGoals} Target</div>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.04] p-4.5 rounded-2xl flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl">
            🏆
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-[#9aa4bf]">Goal Tercapai</span>
            <div className="text-lg font-black text-emerald-400">{achievedGoals} / {totalGoals} Target</div>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.04] p-4.5 rounded-2xl flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl">
            ⏳
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-[#9aa4bf]">Target Terdekat</span>
            <div className="text-sm font-black text-white truncate max-w-[125px]">
              {nearestGoal ? nearestGoal.name : '-'}
            </div>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.04] p-4.5 rounded-2xl flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-xl">
            📈
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-[#9aa4bf]">Alokasi Terkumpul</span>
            <div className="text-lg font-black text-white">
              {formatCurrency(goals.reduce((sum, g) => sum + g.currentAmount, 0))}
            </div>
          </div>
        </div>
      </div>

      {/* GOALS LIST VIEW */}
      {goals.length === 0 ? (
        <div className="bg-white/[0.01] border border-white/[0.04] rounded-3xl p-10 text-center space-y-3">
          <div className="text-4xl text-slate-500">🏁</div>
          <h3 className="text-sm font-bold text-white">Belum Ada Target Keuangan</h3>
          <p className="text-xs text-[#9aa4bf] max-w-md mx-auto">Mulai susun rencana pembelian impian Anda, dana darurat, maupun masa pensiun dengan menekan tombol diatas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) || 0;
            const remaining = Math.max(0, g.targetAmount - g.currentAmount);
            const isFinished = pct >= 100;

            // Estimate completion timing remaining (dummy mathematical estimate based on remaining)
            const remainingMonths = remaining > 0 ? Math.ceil(remaining / 500000) : 0; // assuming 500k monthly savings

            return (
              <div 
                key={g.id} 
                className="bg-white/[0.02] border border-white/[0.06] p-5 rounded-[24px] space-y-4 hover:border-[#7c5cff]/30 transition-all group relative overflow-hidden"
              >
                {/* Background ambient glow according to goal's color theme */}
                <div 
                  className="absolute -right-16 -top-16 w-32 h-32 rounded-full blur-3xl opacity-[0.03] transition-all group-hover:opacity-[0.06] pointer-events-none z-0"
                  style={{ backgroundColor: g.color }}
                ></div>

                <div className="flex justify-between items-start relative z-10">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl h-10 w-10 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      {CATEGORY_ICONS[g.category] || '🎯'}
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                        {g.name}
                        {isFinished && <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                      </h3>
                      <span className="text-[10px] font-medium text-[#9aa4bf]">Kategori: {g.category}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteGoal(g.id)}
                    className="p-1 px-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold rounded-lg hover:bg-red-500/20 transition-all cursor-pointer flex items-center gap-1 opacity-60 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Hapus</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-[#9aa4bf]">Terpenuhi: <strong className="text-white">{formatCurrency(g.currentAmount)}</strong></span>
                    <span className="text-slate-400">Target: <strong className="text-white">{formatCurrency(g.targetAmount)}</strong></span>
                  </div>

                  {/* Gorgeous glowing progress bar */}
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-700 relative"
                      style={{ 
                        width: `${pct}%`,
                        backgroundColor: g.color,
                        boxShadow: `0 0 10px ${g.color}`
                      }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono pt-1">
                    <span className="text-xs font-bold" style={{ color: g.color }}>{pct}% Terkumpul</span>
                    {remaining > 0 ? (
                      <span className="text-[#9aa4bf]">Kurang: <strong className="text-[#ff5c7a]">{formatCurrency(remaining)}</strong></span>
                    ) : (
                      <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">Lunas Achieved!</span>
                    )}
                  </div>
                </div>

                {/* Deadline & Estimate Tickers */}
                <div className="p-3 bg-white/[0.01] border border-white/[0.04] rounded-xl flex justify-between items-center text-[10px] text-[#9aa4bf]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>Batas: <strong>{g.deadline ? g.deadline : 'Kapanpun'}</strong></span>
                  </div>
                  {remaining > 0 && (
                    <span className="text-[#ffb547] text-right font-mono">
                      Estimasi: ~{remainingMonths} bln lagi (tabungan Rp500rb/bln)
                    </span>
                  )}
                </div>

                {/* Quick actions budget injection */}
                {!isFinished && (
                  <div className="pt-2 flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-slate-500 font-mono tracking-wide uppercase mr-1">Tepuk Celengan (+):</span>
                    <button
                      onClick={() => handleQuickAddFunds(g, 50000)}
                      className="px-2 py-1 bg-white/5 border border-white/5 hover:border-[#7c5cff]/30 text-[9px] text-white rounded-lg hover:bg-white/10 font-mono transition-all cursor-pointer"
                    >
                      +50rb
                    </button>
                    <button
                      onClick={() => handleQuickAddFunds(g, 100000)}
                      className="px-2 py-1 bg-white/5 border border-white/5 hover:border-[#7c5cff]/30 text-[9px] text-white rounded-lg hover:bg-white/10 font-mono transition-all cursor-pointer"
                    >
                      +100rb
                    </button>
                    <button
                      onClick={() => handleQuickAddFunds(g, 500000)}
                      className="px-2 py-1 bg-white/5 border border-white/5 hover:border-[#7c5cff]/30 text-[9px] text-white rounded-lg hover:bg-white/10 font-mono transition-all cursor-pointer"
                    >
                      +500rb
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="bg-[#0b1020] border border-white/[0.08] rounded-[28px] w-full max-w-md p-6 relative z-10 text-white space-y-5 shadow-2xl">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-[#7c5cff]" />
              Buat Target Keuangan Baru
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">Nama Target</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Beli Laptop Baru, Liburan Bali"
                  required
                  className="w-full px-3 py-2.5 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Goal['category'])}
                    className="w-full px-3 py-2.5 bg-[#121832] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff]"
                  >
                    <option value="Dana Darurat" className="bg-[#0b1020] text-white">Dana Darurat</option>
                    <option value="Beli Rumah" className="bg-[#0b1020] text-white">Beli Rumah</option>
                    <option value="Beli Kendaraan" className="bg-[#0b1020] text-white">Beli Kendaraan</option>
                    <option value="Liburan" className="bg-[#0b1020] text-white">Liburan</option>
                    <option value="Modal Usaha" className="bg-[#0b1020] text-white">Modal Usaha</option>
                    <option value="Pendidikan" className="bg-[#0b1020] text-white">Pendidikan</option>
                    <option value="Target Custom" className="bg-[#0b1020] text-white">Target Custom</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">Jatuh Tempo</label>
                  <input 
                    type="date" 
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">Nominal Target (Rp)</label>
                  <input 
                    type="text" 
                    value={targetAmount ? parseInt(targetAmount, 10).toLocaleString('id-ID') : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setTargetAmount(raw);
                    }}
                    placeholder="0"
                    required
                    className="w-full px-3 py-2.5 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">Saldo Awal (Rp)</label>
                  <input 
                    type="text" 
                    value={currentAmount ? parseInt(currentAmount, 10).toLocaleString('id-ID') : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setCurrentAmount(raw);
                    }}
                    placeholder="0"
                    className="w-full px-3 py-2.5 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff] font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">Warna Glow Tema</label>
                <div className="flex gap-2">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      type="button"
                      key={p.value}
                      onClick={() => setColor(p.value)}
                      className={`h-7 w-7 rounded-full border transition-all cursor-pointer relative flex items-center justify-center ${
                        color === p.value ? 'scale-110 border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: p.value }}
                      title={p.name}
                    >
                      {color === p.value && <div className="h-2 w-2 bg-white rounded-full"></div>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#7c5cff] hover:bg-[#684be3] text-xs font-bold rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  Simpan Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
