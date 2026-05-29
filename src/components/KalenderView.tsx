/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, 
  Sparkles, Coffee, Clock, HeartPulse, ShieldAlert
} from 'lucide-react';
import { Transaction, formatCurrency } from '../utils/financeHelper';

interface KalenderViewProps {
  transactions: Transaction[];
}

export function KalenderView({ transactions }: KalenderViewProps) {
  // We can lock the visual calendar defaults to May 2026 (matching our mock date environment)
  // or dynamically let the user select year/month. Default to May 2026 to align with mock records!
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(4); // 4 = May (0-indexed)

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Specific selected day state
  const [selectedDay, setSelectedDay] = useState<number | null>(28); // Default to current mock date May 28, 2026!

  // Calculations for calendar grid
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Shift Sunday start boundary to standard Monday or keep Sunday (we will pad slots)
  const paddedSlots = Array(firstDayIndex).fill(null);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
    setSelectedDay(null);
  };

  // Extract transactions matching a day
  const getTransactionsForDay = (day: number) => {
    const paddedMonth = String(currentMonth + 1).padStart(2, '0');
    const paddedDay = String(day).padStart(2, '0');
    const dateQueryStr = `${currentYear}-${paddedMonth}-${paddedDay}`;
    return transactions.filter(tx => tx.date === dateQueryStr);
  };

  const selectedDayTx = selectedDay ? getTransactionsForDay(selectedDay) : [];
  
  const dailyIncomeTotal = selectedDayTx
    .filter(t => t.type === 'Pemasukan')
    .reduce((sum, t) => sum + t.nominal, 0);

  const dailyExpenseTotal = selectedDayTx
    .filter(t => t.type === 'Pengeluaran')
    .reduce((sum, t) => sum + t.nominal, 0);

  return (
    <div className="space-y-6">
      {/* HEADER ROW */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-[#7c5cff]" /> Kalender Pengeluaran & Hasil
        </h1>
        <p className="text-xs text-[#9aa4bf]">Evaluasi pengeluaran Anda dari kacamata kalender harian untuk melacak hari hemat</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* MONTH VISUAL GRID COLUMN */}
        <div className="lg:col-span-7 bg-white/[0.02] border border-white/[0.06] p-6 rounded-[28px] shadow-xl">
          {/* Controls bar */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-extrabold text-[#00d4ff] font-mono uppercase tracking-wider">
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={handlePrevMonth}
                className="p-1 px-1.5 rounded-lg bg-white/[0.03] hover:bg-white/15 text-white cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-1 px-1.5 rounded-lg bg-white/[0.03] hover:bg-white/15 text-white cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Calendar labels */}
          <div className="grid grid-cols-7 text-center text-[10px] font-mono tracking-wider font-extrabold text-[#9aa4bf] pb-2 border-b border-white/[0.04] mb-3 uppercase">
            <span>Min</span><span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span>
          </div>

          {/* Calendar Grid cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {paddedSlots.map((_, idx) => (
              <div key={`pad-${idx}`} className="h-11 sm:h-14"></div>
            ))}

            {daysArray.map((day) => {
              const dayTx = getTransactionsForDay(day);
              const hasInc = dayTx.some(t => t.type === 'Pemasukan');
              const hasExp = dayTx.some(t => t.type === 'Pengeluaran');
              const isSelected = selectedDay === day;

              return (
                <button
                  key={`day-${day}`}
                  onClick={() => setSelectedDay(day)}
                  className={`h-11 sm:h-14 rounded-2xl flex flex-col justify-between p-1.5 focus:outline-none cursor-pointer relative transition-all ${
                    isSelected ? 'bg-[#7c5cff] text-white shadow-[0_0_15px_rgba(124,92,255,0.4)] border border-[#7c5cff]' : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.05]'
                  }`}
                >
                  <span className={`text-[11px] font-bold ${
                    isSelected ? 'text-white' : 'text-slate-300'
                  }`}>
                    {day}
                  </span>

                  {/* Indicator micro dots */}
                  <div className="flex justify-center gap-1 w-full pb-0.5">
                    {hasInc && (
                      <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#16c784]'}`}></span>
                    )}
                    {hasExp && (
                      <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#ff5c7a]'}`}></span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* COMPREHENSIVE DAY STATS EXPANSION */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          {selectedDay ? (
            <div className="bg-white/[0.02] border border-white/[0.06] p-6 rounded-[28px] shadow-xl grow flex flex-col justify-between">
              <div>
                <div className="pb-3 border-b border-white/[0.04]">
                  <span className="text-[10px] text-[#00d4ff] uppercase tracking-wider font-mono font-bold block">Mutasi Pembukuan Harian</span>
                  <h3 className="text-base font-extrabold text-white mt-1">Tanggal {selectedDay} {monthNames[currentMonth]} {currentYear}</h3>
                </div>

                {/* Day summary counters */}
                <div className="grid grid-cols-2 gap-3 py-4">
                  <div className="p-3 rounded-xl bg-[#16c784]/5 border border-[#16c784]/15">
                    <span className="text-[9px] text-[#9aa4bf] font-mono block">Masuk (+)</span>
                    <span className="text-[13px] font-bold text-[#16c784] mt-0.5 block">{formatCurrency(dailyIncomeTotal)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                    <span className="text-[9px] text-[#9aa4bf] font-mono block">Keluar (-)</span>
                    <span className="text-[13px] font-bold text-[#ff5c7a] mt-0.5 block">{formatCurrency(dailyExpenseTotal)}</span>
                  </div>
                </div>

                {/* Specific ledger logs cards list */}
                <div className="space-y-2 mt-2 max-h-[180px] overflow-y-auto pr-1">
                  {selectedDayTx.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 uppercase font-mono text-[10px]">
                      <Coffee className="h-6 w-6 mx-auto text-slate-700 mb-1" />
                      <span>Hari Yang Tenang</span>
                    </div>
                  ) : (
                    selectedDayTx.map(tx => (
                      <div key={tx.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white leading-tight">{tx.title}</p>
                          <p className="text-[9px] text-[#9aa4bf] mt-0.5">{tx.category} • {tx.source}</p>
                        </div>
                        <span className={`text-xs font-bold ${tx.type === 'Pemasukan' ? 'text-[#16c784]' : 'text-[#ff5c7a]'}`}>
                          {tx.type === 'Pemasukan' ? '+' : '-'}{formatCurrency(tx.nominal)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Day dynamic advice */}
              <div className="mt-5 pt-3 border-t border-white/[0.04] flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#7c5cff]" />
                <span className="text-[10px] text-[#9aa4bf]">
                  {selectedDayTx.length > 3 ? 'Padat aktivitas keuangan harian.' : 'Kas dalam kondisi seimbang aman.'}
                </span>
              </div>
            </div>
          ) : (
            <div className="h-full bg-white/[0.02] border border-dashed border-white/10 rounded-[28px] p-6 flex flex-col items-center justify-center text-center">
              <CalendarIcon className="h-10 w-10 text-slate-700 mb-2" />
              <h3 className="text-xs font-extrabold text-[#9aa4bf] uppercase tracking-wider font-mono">Pilih Tanggal</h3>
              <p className="text-[11px] text-[#9aa4bf] mt-1 max-w-[200px]">Silakan klik tanggal pada grid kalender untuk melihat mutasi aliran kas.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
