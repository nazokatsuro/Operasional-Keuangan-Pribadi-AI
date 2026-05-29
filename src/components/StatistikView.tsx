/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  BarChart2, TrendingUp, TrendingDown, HelpCircle, Calendar, Sparkles, 
  Percent, ArrowRightLeft, ShieldAlert
} from 'lucide-react';
import Chart from 'chart.js/auto';
import { Transaction, formatCurrency } from '../utils/financeHelper';

interface StatistikViewProps {
  transactions: Transaction[];
}

export function StatistikView({ transactions }: StatistikViewProps) {
  const [timelineMode, setTimelineMode] = useState<'harian' | 'bulanan'>('bulanan');
  const catChartRef = useRef<HTMLCanvasElement | null>(null);
  const flowChartRef = useRef<HTMLCanvasElement | null>(null);

  // Math Calculations
  const allExpenses = transactions.filter(t => t.type === 'Pengeluaran');
  const allIncomes = transactions.filter(t => t.type === 'Pemasukan');

  const totalExpenseSum = allExpenses.reduce((sum, t) => sum + t.nominal, 0);
  const totalIncomeSum = allIncomes.reduce((sum, t) => sum + t.nominal, 0);

  const averageSpending = allExpenses.length > 0 ? totalExpenseSum / allExpenses.length : 0;
  const averageIncomes = allIncomes.length > 0 ? totalIncomeSum / allIncomes.length : 0;

  // Group spends by categories
  const categoryMap = allExpenses.reduce((acc: Record<string, number>, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.nominal;
    return acc;
  }, {});

  const sortedCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1]);

  const topCategoryName = sortedCategories[0]?.[0] || 'Belum Ada';
  const topCategoryVal = sortedCategories[0]?.[1] || 0;
  const topCategoryPct = totalExpenseSum > 0 ? Math.round((topCategoryVal / totalExpenseSum) * 100) : 0;

  useEffect(() => {
    if (!catChartRef.current || !flowChartRef.current) return;
    const catCtx = catChartRef.current.getContext('2d');
    const flowCtx = flowChartRef.current.getContext('2d');
    if (!catCtx || !flowCtx) return;

    // Render Doughnut Chart (Categories)
    const catLabels = sortedCategories.slice(0, 5).map(c => c[0]);
    const catData = sortedCategories.slice(0, 5).map(c => c[1]);
    if (sortedCategories.length > 5) {
      const restSum = sortedCategories.slice(5).reduce((sum, c) => sum + c[1], 0);
      catLabels.push('Lainnya');
      catData.push(restSum);
    }

    const catChart = new Chart(catCtx, {
      type: 'doughnut',
      data: {
        labels: catLabels.length > 0 ? catLabels : ['Belum Ada'],
        datasets: [{
          data: catData.length > 0 ? catData : [1],
          backgroundColor: [
            '#ff5c7a', '#ffb547', '#00d4ff', '#7c5cff', '#16c784', '#64748b'
          ],
          borderColor: 'rgba(15, 23, 42, 0.4)',
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { 
            position: 'right',
            labels: { color: '#ffffff', font: { size: 10 } }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }
        },
        cutout: '60%',
      }
    });

    // Render Inflow vs Outflow over Last 6 Active transactions
    const recTx = transactions.slice(-8);
    const flowLabels = recTx.map(t => t.date.split('-')[2] || t.date);
    const flowIn = recTx.map(t => t.type === 'Pemasukan' ? t.nominal : 0);
    const flowOut = recTx.map(t => t.type === 'Pengeluaran' ? t.nominal : 0);

    const flowChart = new Chart(flowCtx, {
      type: 'line',
      data: {
        labels: flowLabels.length > 0 ? flowLabels : ['Log'],
        datasets: [
          {
            label: 'Aliran Masuk (+)',
            data: flowIn.length > 0 ? flowIn : [0],
            borderColor: '#16c784',
            backgroundColor: 'rgba(22, 199, 132, 0.05)',
            tension: 0.35,
            fill: true,
            borderWidth: 2,
          },
          {
            label: 'Aliran Keluar (-)',
            data: flowOut.length > 0 ? flowOut : [0],
            borderColor: '#ff5c7a',
            backgroundColor: 'rgba(255, 92, 122, 0.05)',
            tension: 0.35,
            fill: true,
            borderWidth: 2,
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#9aa4bf', font: { size: 9 } } },
          y: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#9aa4bf', font: { size: 8 } } }
        }
      }
    });

    return () => {
      catChart.destroy();
      flowChart.destroy();
    };
  }, [transactions, sortedCategories]);

  return (
    <div className="space-y-6">
      {/* HEADER ROW */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-[#7c5cff]" /> Diagnostik Statistik Kas mendalam
          </h1>
          <p className="text-xs text-[#9aa4bf]">Dapatkan insight mengenai proporsi pengeluaran bulanan dan stabilitas tabungan harian Anda</p>
        </div>
        
        {/* Switcer buttons */}
        <div className="flex bg-white/[0.03] border border-white/5 p-1 rounded-xl">
          <button 
            onClick={() => setTimelineMode('harian')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold leading-none cursor-pointer transition-all ${
              timelineMode === 'harian' ? 'bg-[#7c5cff] text-white' : 'text-[#9aa4bf] hover:text-white'
            }`}
          >
            Harian
          </button>
          <button 
            onClick={() => setTimelineMode('bulanan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold leading-none cursor-pointer transition-all ${
              timelineMode === 'bulanan' ? 'bg-[#7c5cff] text-white' : 'text-[#9aa4bf] hover:text-white'
            }`}
          >
            Bulanan
          </button>
        </div>
      </div>

      {/* CORE STAT METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl shadow">
          <span className="text-[9px] text-[#9aa4bf] font-mono uppercase tracking-widest block">Rerata Sekali Transaksi Jajan</span>
          <span className="text-base font-bold text-white mt-1.5 block">{formatCurrency(averageSpending)}</span>
        </div>

        <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl shadow">
          <span className="text-[9px] text-[#9aa4bf] font-mono uppercase tracking-widest block">Proporsi Kategori Terbesar</span>
          <div className="flex items-baseline gap-1 mt-1.5">
            <span className="text-sm font-bold text-[#ff5c7a]">{topCategoryName}</span>
            <span className="text-xs font-mono">({topCategoryPct}%)</span>
          </div>
        </div>

        <div className="p-4 bg-[#16c784]/5 border border-[#16c784]/10 rounded-2xl shadow">
          <span className="text-[9px] text-[#9aa4bf] font-mono uppercase tracking-widest block">Rerata Aliran Inflow</span>
          <span className="text-base font-bold text-[#16c784] mt-1.5 block">{formatCurrency(averageIncomes)}</span>
        </div>

        <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl shadow">
          <span className="text-[9px] text-[#9aa4bf] font-mono uppercase tracking-widest block">Suku Transaksi Terbayar</span>
          <span className="text-base font-bold text-white mt-1.5 block">{transactions.length} Transaksi</span>
        </div>
      </div>

      {/* DETAILED CHARTS BENTO BLOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5.5 rounded-[24px] bg-white/[0.02] border border-white/[0.06] shadow-xl">
          <div className="mb-4">
            <h3 className="text-xs font-extrabold text-[#00d4ff] font-mono uppercase tracking-wider">Arah Sebaran Konsumsi</h3>
            <p className="text-[10px] text-[#9aa4bf]">Diagram alokasi pengeluaran bulanan berdasarkan kriteria kategori</p>
          </div>
          <div className="h-[180px] flex items-center justify-center relative">
            <canvas ref={catChartRef}></canvas>
          </div>
        </div>

        <div className="p-5.5 rounded-[24px] bg-white/[0.02] border border-[#7c5cff]/15 shadow-xl relative overflow-hidden">
          <div className="mb-4">
            <h3 className="text-xs font-extrabold text-[#7c5cff] font-mono uppercase tracking-wider">Rhythm & Volatilitas Kas</h3>
            <p className="text-[10px] text-[#9aa4bf]">Komparasi grafik laju keluar masuk dari total mutasi kas terakhir</p>
          </div>
          <div className="h-[180px] relative">
            <canvas ref={flowChartRef}></canvas>
          </div>
        </div>
      </div>
    </div>
  );
}
