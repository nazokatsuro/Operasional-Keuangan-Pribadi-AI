import React, { useState } from 'react';
import { FileSpreadsheet, Plus, AlertCircle, Edit2, Check, TrendingUp, Wallet, ArrowUpRight } from 'lucide-react';
import { Transaction } from '../utils/financeHelper';
import { formatCurrency } from '../utils/financeHelper';

interface BudgetPlannerViewProps {
  transactions: Transaction[];
  categoryBudgets: Record<string, number>;
  onUpdateBudget: (category: string, amount: number) => void;
}

export function BudgetPlannerView({
  transactions,
  categoryBudgets,
  onUpdateBudget,
}: BudgetPlannerViewProps) {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newVal, setNewVal] = useState('');

  // Sieve actual expenses in the current month (May 2026 based on timestamp 2026-05-30)
  const expenseTransactions = transactions.filter(t => t.type === 'Pengeluaran');

  // Compute actual spent per category
  const actualSpents = expenseTransactions.reduce((acc, t) => {
    const cat = t.category || 'Lainnya';
    acc[cat] = (acc[cat] || 0) + t.nominal;
    return acc;
  }, {} as Record<string, number>);

  // Compute summaries
  const totalBudget = Object.values(categoryBudgets).reduce((sum, b) => sum + b, 0);
  const totalSpent = Object.values(actualSpents).reduce((sum, s) => sum + s, 0);
  const totalRemaining = Math.max(0, totalBudget - totalSpent);

  const startEdit = (category: string, budget: number) => {
    setEditingCategory(category);
    setEditValue(budget.toString());
  };

  const saveEdit = (category: string) => {
    const num = parseFloat(editValue) || 0;
    onUpdateBudget(category, num);
    setEditingCategory(null);
  };

  const handleCreateNewBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat || !newVal) return;
    onUpdateBudget(newCat, parseFloat(newVal) || 0);
    setNewCat('');
    setNewVal('');
  };

  // SVG Radar or custom Donut/Doughnut Chart for Expense distribution against budgets
  // We can build an elegant stacked horizontal bar chart or simple beautiful donut chart.
  const chartCategoryData = Object.entries(categoryBudgets).map(([category, budget]) => {
    const spent = actualSpents[category] || 0;
    const pct = Math.min(100, Math.round((spent / budget) * 100)) || 0;
    return { category, budget, spent, pct };
  }).sort((a, b) => b.spent - a.spent);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-[#7c5cff]" />
            Perencanaan Budget <span className="text-xs bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-[#9aa4bf] font-normal">SaaS Planner</span>
          </h1>
          <p className="text-xs text-[#9aa4bf]">Kendalikan batas pengeluaran bulanan Anda untuk menghindari pengeluaran berlebih</p>
        </div>
      </div>

      {/* TOP COMPREHENSIVE OVERVIEWS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/[0.02] border border-white/[0.04] p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-4 right-4 text-xs font-mono text-[#7c5cff]">LIMIT</div>
          <span className="text-[10px] uppercase font-mono font-bold text-[#9aa4bf] block mb-1">Total Limit Anggaran</span>
          <div className="text-xl font-black text-white">{formatCurrency(totalBudget)}</div>
          <p className="text-[10px] text-[#9aa4bf] mt-2">Batas akumulatif semua kategori</p>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.04] p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-4 right-4 text-xs font-mono text-red-400">AKTUAL</div>
          <span className="text-[10px] uppercase font-mono font-bold text-[#9aa4bf] block mb-1">Total Pengeluaran Bulan Ini</span>
          <div className="text-xl font-black text-white">{formatCurrency(totalSpent)}</div>
          <div className="text-[10px] text-[#9aa4bf] mt-2 font-mono">
            Pemakaian: <strong className="text-[#7c5cff]">{Math.round((totalSpent / (totalBudget || 1)) * 100)}%</strong> dari total limit
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.04] p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-4 right-4 text-xs font-mono text-emerald-400">SISA</div>
          <span className="text-[10px] uppercase font-mono font-bold text-[#9aa4bf] block mb-1">Sisa Anggaran Aman</span>
          <div className="text-xl font-black text-emerald-400">{formatCurrency(totalRemaining)}</div>
          <p className="text-[10px] text-[#9aa4bf] mt-2">Dana yang aman untuk sisa bulan ini</p>
        </div>
      </div>

      {/* VISUAL SPENDING CHART BAR */}
      <div className="bg-white/[0.02] border border-white/[0.06] p-6 rounded-[24px] space-y-4">
        <h3 className="text-xs uppercase font-mono font-bold text-[#9aa4bf]">Komparasi Alokasi Penggunaan Terbesar</h3>

        <div className="space-y-4 pt-2">
          {chartCategoryData.slice(0, 5).map((d) => {
            let colorTheme = 'bg-emerald-500';
            let barGlow = 'rgba(16,185,129,0.3)';
            if (d.pct >= 100) {
              colorTheme = 'bg-red-500';
              barGlow = 'rgba(239,68,68,0.3)';
            } else if (d.pct >= 80) {
              colorTheme = 'bg-amber-400';
              barGlow = 'rgba(245,158,11,0.3)';
            }

            return (
              <div key={d.category} className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-white font-bold">{d.category}</span>
                  <span className="text-slate-400">
                    <strong className="text-white">{formatCurrency(d.spent)}</strong> / {formatCurrency(d.budget)}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden relative">
                  <div 
                    className={`h-full rounded-full transition-all duration-500`}
                    style={{ 
                      width: `${d.pct}%`,
                      backgroundColor: d.pct >= 100 ? '#ef4444' : d.pct >= 80 ? '#f59e0b' : '#10b981',
                      boxShadow: `0 0 8px ${barGlow}`
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>{d.pct}% digunakan</span>
                  {d.pct >= 100 ? (
                    <span className="text-red-400 flex items-center gap-0.5"><AlertCircle className="h-3 w-3" /> Over Budget!</span>
                  ) : d.pct >= 80 ? (
                    <span className="text-amber-400 font-bold">Hampir Habis</span>
                  ) : (
                    <span className="text-emerald-400">Aman</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAILED BUDGET TABLE */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-[24px] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex justify-between items-center bg-white/[0.01]">
          <h3 className="text-xs uppercase font-mono font-bold text-white">Daftar Anggaran per Kategori</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/[0.04] text-[#9aa4bf] font-mono">
                <th className="p-4 pl-6 uppercase tracking-wider font-bold text-[10px]">Kategori</th>
                <th className="p-4 uppercase tracking-wider font-bold text-[10px] text-right">Limit Anggaran</th>
                <th className="p-4 uppercase tracking-wider font-bold text-[10px] text-right">Pemakaian Riil</th>
                <th className="p-4 uppercase tracking-wider font-bold text-[10px] text-right">Sisa Anggaran</th>
                <th className="p-4 uppercase tracking-wider font-bold text-[10px] text-center">Status</th>
                <th className="p-4 uppercase tracking-wider font-bold text-[10px] text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(categoryBudgets).map(([category, budget]) => {
                const spent = actualSpents[category] || 0;
                const remaining = budget - spent;
                const pct = Math.round((spent / budget) * 100) || 0;

                let statusText = 'Aman';
                let statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                if (pct >= 100) {
                  statusText = 'Over Budget';
                  statusColor = 'text-red-400 bg-red-500/10 border-red-500/20';
                } else if (pct >= 80) {
                  statusText = 'Hampir Habis';
                  statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                }

                const isEditing = editingCategory === category;

                return (
                  <tr key={category} className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors font-mono">
                    <td className="p-4 pl-6 font-bold text-white text-xs">{category}</td>
                    
                    <td className="p-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[10px] text-slate-500">Rp</span>
                          <input 
                            type="text"
                            value={editValue ? parseInt(editValue, 10).toLocaleString('id-ID') : ''}
                            onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ''))}
                            className="w-24 px-2 py-1 bg-slate-900 border border-white/10 rounded-lg text-xs font-mono text-right text-white focus:outline-none"
                          />
                        </div>
                      ) : (
                        <span className="text-white">{formatCurrency(budget)}</span>
                      )}
                    </td>

                    <td className="p-4 text-right text-slate-300">
                      {formatCurrency(spent)} <span className="text-[10px] font-normal text-slate-500">({pct}%)</span>
                    </td>

                    <td className="p-4 text-right">
                      {remaining < 0 ? (
                        <span className="text-red-400 font-bold">-{formatCurrency(Math.abs(remaining))}</span>
                      ) : (
                        <span className="text-emerald-400">{formatCurrency(remaining)}</span>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusColor}`}>
                        {statusText}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      {isEditing ? (
                        <button
                          onClick={() => saveEdit(category)}
                          className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all cursor-pointer inline-flex items-center"
                          title="Save"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => startEdit(category, budget)}
                          className="p-1.5 bg-white/5 hover:bg-white/10 text-[#9aa4bf] hover:text-white rounded-lg transition-all cursor-pointer inline-flex items-center"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD NEW BUDGET PANEL */}
      <div className="bg-white/[0.02] border border-white/[0.06] p-6 rounded-[24px] space-y-4">
        <h4 className="text-xs uppercase font-mono font-bold text-white flex items-center gap-1.5">
          <Plus className="h-4 w-4 text-[#7c5cff]" /> Tambah / Kelola Kategori Budget Baru
        </h4>

        <form onSubmit={handleCreateNewBudget} className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            placeholder="Contoh: Belanja Online, Langganan Cloud" 
            value={newCat} 
            onChange={(e) => setNewCat(e.target.value)} 
            required
            className="flex-1 px-3 py-2 bg-[#0c1020] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff]"
          />
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-[10px] text-slate-500 font-mono">Rp</span>
            <input 
              type="text" 
              placeholder="Nominal Limit" 
              value={newVal ? parseInt(newVal, 10).toLocaleString('id-ID') : ''} 
              onChange={(e) => setNewVal(e.target.value.replace(/\D/g, ''))} 
              required
              className="w-full sm:w-44 pl-8 pr-3 py-2 bg-[#0c1020] text-xs font-mono text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#7c5cff] hover:bg-[#684be3] text-white text-xs font-bold rounded-xl transition-all shadow-lg hover:shadow-[#7c5cff]/20 cursor-pointer"
          >
            Terapkan Limit
          </button>
        </form>
      </div>
    </div>
  );
}
