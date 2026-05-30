import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Sparkles, PieChart, Activity, Zap } from 'lucide-react';
import { Transaction } from '../utils/financeHelper';
import { formatCurrency } from '../utils/financeHelper';

interface AdvancedStatisticsViewProps {
  transactions: Transaction[];
}

export function AdvancedStatisticsView({
  transactions,
}: AdvancedStatisticsViewProps) {
  // 1. CALCULATE RELEVANT METRICS
  const expenses = useMemo(() => transactions.filter(t => t.type === 'Pengeluaran'), [transactions]);
  const totalExpenseVal = useMemo(() => expenses.reduce((sum, e) => sum + e.nominal, 0), [expenses]);
  
  const categorySpends = useMemo(() => {
    return expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.nominal;
      return acc;
    }, {} as Record<string, number>);
  }, [expenses]);

  const sortedSpends = useMemo(() => {
    return Object.entries(categorySpends)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [categorySpends]);

  // 2. WEEKLY HEATMAP CALCULATION (SUNDAY TO SATURDAY)
  const heatmapData = useMemo(() => {
    // Generate empty 7 days x 4 weeks matrix
    const matrix = Array.from({ length: 7 }, () => Array(4).fill(0));
    const dayIndices: Record<number, number> = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 }; // Sun-Sat

    expenses.forEach(e => {
      const dateObj = new Date(e.date);
      const day = dateObj.getDay();
      // Mock distribute into 4 grid rows based on date parity
      const parity = dateObj.getDate() % 4;
      matrix[day][parity] += e.nominal;
    });

    return matrix;
  }, [expenses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-[#7c5cff]" />
            Statistik Kas & Heatmap Belanja <span className="text-xs bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-[#9aa4bf] font-normal font-mono">Expert Analytics</span>
          </h1>
          <p className="text-xs text-[#9aa4bf]">Model visualisasi heatmap, sebaran pengeluaran harian, serta kontributor penyerapan modal terbesar Anda</p>
        </div>
      </div>

      {/* TOP BREAKDOWN COMPONENT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* HEATMAP GRID REPRESENTATION */}
        <div className="bg-white/[0.02] border border-white/[0.06] p-5 rounded-[24px] space-y-4">
          <h3 className="text-xs uppercase font-mono font-bold text-white flex items-center gap-1.5 border-b border-white/[0.06] pb-3">
            🔥 Heatmap Kepadatan Belanja (Harian)
          </h3>

          <p className="text-[11px] text-[#9aa4bf] leading-relaxed">
            Warna yang lebih menyala menunjukkan volume nominal pengeluaran kas yang lebih pekat pada tanggal paritas tersebut.
          </p>

          <div className="flex justify-between font-mono text-[9px] text-slate-500 pb-1">
            <span>Minggu</span>
            <span>Senin</span>
            <span>Selasa</span>
            <span>Rabu</span>
            <span>Kamis</span>
            <span>Jumat</span>
            <span>Sabtu</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {heatmapData.map((row, dayIdx) => (
              <div key={dayIdx} className="space-y-2">
                {row.map((val, weekIdx) => {
                  let opacityPreset = 'bg-white/[0.03]';
                  if (val > 1000000) opacityPreset = 'bg-[#7c5cff] shadow-[0_0_12px_#7c5cff]';
                  else if (val > 250000) opacityPreset = 'bg-[#7c5cff]/65';
                  else if (val > 50000) opacityPreset = 'bg-[#7c5cff]/30';
                  else if (val > 0) opacityPreset = 'bg-[#7c5cff]/10';

                  return (
                    <div 
                      key={weekIdx} 
                      className={`h-9 w-full rounded-lg transition-all hover:scale-105 duration-200 cursor-pointer ${opacityPreset}`}
                      title={`Volume Pengeluaran: ${formatCurrency(val)}`}
                    ></div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 text-[8px] font-mono text-slate-500 pt-2">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-white/[0.03]"></span> Rendah</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-[#7c5cff]/30"></span> Sedang</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-[#7c5cff] shadow-[0_0_4px_#7c5cff]"></span> Tinggi</span>
          </div>
        </div>

        {/* MOST ABSORBING CATEGORIES */}
        <div className="bg-white/[0.02] border border-white/[0.06] p-5 rounded-[24px] space-y-4">
          <h3 className="text-xs uppercase font-mono font-bold text-white flex items-center gap-1.5 border-b border-white/[0.06] pb-3">
            💸 Distribusi Spends per Kategori
          </h3>

          <div className="space-y-3.5 max-h-[220px] overflow-y-auto pt-1 font-mono text-xs">
            {sortedSpends.length === 0 ? (
              <p className="py-8 text-center text-[#9aa4bf]">Belum ada aliran pengeluaran terekam</p>
            ) : (
              sortedSpends.map((item) => {
                const pct = Math.round((item.value / (totalExpenseVal || 1)) * 100);
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>{item.name}</span>
                      <span>{formatCurrency(item.value)} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-[#7c5cff] rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
