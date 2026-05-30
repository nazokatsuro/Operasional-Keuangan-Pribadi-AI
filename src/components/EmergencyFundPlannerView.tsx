/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle, Info, ChevronRight, TrendingUp, 
  HelpCircle, Sparkles, Plus, Trash2, Settings, Landmark, Landmark as BankIcon, Wallet, Award, Save
} from 'lucide-react';
import Chart from 'chart.js/auto';
import { Transaction, Account, Asset } from '../utils/financeHelper';

export interface EmergencyFundContribution {
  id: string;
  date: string;
  amount: number;
  note: string;
  source: string;
}

export interface EmergencyFundConfig {
  periodMonths: number; // 1, 3, 6, 12
  statusKey: 'lajang' | 'menikah' | 'menikah_anak' | 'custom';
  customMonths: number;
  selectedSources: string[]; // e.g. ["acc-1", "asset-a1"]
  manualMonthlySavings: number;
  contributions: EmergencyFundContribution[];
}

interface EmergencyFundPlannerViewProps {
  transactions: Transaction[];
  accounts: Account[];
  assets: Asset[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onAddNotification: (notif: {
    id: string;
    title: string;
    message: string;
    category: 'Budget Warning' | 'Goal Reminder' | 'Bill Reminder' | 'Debt Reminder' | 'Cashflow Alert' | 'AI Recommendation';
    date: string;
    isRead: boolean;
  }) => void;
  emergencyConfig: EmergencyFundConfig;
  onUpdateEmergencyConfig: (config: EmergencyFundConfig) => void;
}

export function EmergencyFundPlannerView({
  transactions,
  accounts,
  assets,
  onAddTransaction,
  onAddNotification,
  emergencyConfig,
  onUpdateEmergencyConfig
}: EmergencyFundPlannerViewProps) {
  const chartRef = useRef<HTMLCanvasElement | null>(null);

  // Contribution Form Input States
  const [contribAmount, setContribAmount] = useState<string>('');
  const [contribSource, setContribSource] = useState<string>(accounts[0]?.name || 'Cash');
  const [contribNote, setContribNote] = useState<string>('Penyisihan Dana Darurat');
  const [contribDate, setContribDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // General calculator states (sync with prop configuration)
  const isLight = false; // matching premium dark theme

  // --- 1. HISTORICAL EXPENSE CALCULATIONS ---
  const today = new Date();
  
  const getStartDateForPeriod = (months: number) => {
    const d = new Date();
    d.setDate(d.getDate() - (months * 30));
    return d.toISOString().split('T')[0];
  };

  const selectedPeriodMonths = emergencyConfig.periodMonths || 3;
  const startDateThreshold = getStartDateForPeriod(selectedPeriodMonths);

  // Filter transactions of type "Pengeluaran" in the selected period
  const periodExpenses = transactions.filter(t => 
    t.type === 'Pengeluaran' && 
    t.date >= startDateThreshold &&
    t.category !== 'Top Up' && // exclude topups or investment re-allocations for realistic living cost
    t.category !== 'Investasi'
  );

  const totalExpenseOnPeriod = periodExpenses.reduce((sum, t) => sum + t.nominal, 0);
  const calculatedAverageExpense = Math.round(totalExpenseOnPeriod / selectedPeriodMonths);

  // Fallback if no logged transactions to default to something realistic
  const averageMonthlyExpense = calculatedAverageExpense > 0 ? calculatedAverageExpense : 5000000;

  // --- 2. TARGET SIMULATION ---
  const multiplierModes = {
    lajang: { label: 'Lajang / Mandiri', months: 3, desc: 'Butuh 3 bulan pengeluaran standar untuk proteksi diri sendiri.' },
    menikah: { label: 'Menikah (No Kids)', months: 6, desc: 'Butuh 6 bulan pengeluaran standar untuk proteksi keluarga muda.' },
    menikah_anak: { label: 'Menikah + Anak', months: 12, desc: 'Butuh 12 bulan pengeluaran untuk keamanan anak & ketergantungan ganda.' },
    custom: { label: 'Kustom Target', months: emergencyConfig.customMonths || 3, desc: 'Multiplikator bulan yang ditentukan sendiri oleh Anda.' }
  };

  const activeMode = multiplierModes[emergencyConfig.statusKey];
  const targetMultiplier = emergencyConfig.statusKey === 'custom' 
    ? (emergencyConfig.customMonths || 3)
    : activeMode.months;

  const targetAmount = averageMonthlyExpense * targetMultiplier;

  // --- 3. AVAILABLE FUNDS SUM ---
  // Accounts value
  const selectedAccounts = accounts.filter(acc => 
    emergencyConfig.selectedSources.includes(`acc-${acc.id}`)
  );
  const selectedAccountsValue = selectedAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Assets value
  const selectedAssets = assets.filter(as => 
    emergencyConfig.selectedSources.includes(`asset-${as.id}`)
  );
  const selectedAssetsValue = selectedAssets.reduce((sum, as) => sum + (as.units * as.marketPrice), 0);

  // Dedicated Cash contributions (Tabungan khusus)
  const tabunganKhususValue = (emergencyConfig.contributions || []).reduce((sum, c) => sum + c.amount, 0);

  const totalAvailable = selectedAccountsValue + selectedAssetsValue + tabunganKhususValue;
  const progressPercent = targetAmount > 0 ? Math.min(100, Math.round((totalAvailable / targetAmount) * 100)) : 0;
  const remainingNeeded = Math.max(0, targetAmount - totalAvailable);

  // --- 4. SAVINGS RATE & MONTHS TO FORECAST ---
  const savingsRate = emergencyConfig.manualMonthlySavings || 1500000;
  const estimatedMonthsNeeded = savingsRate > 0 ? Math.ceil(remainingNeeded / savingsRate) : 0;

  // --- 5. PROGRESS BAR COLOR THEME ---
  const getProgressColorClass = (pct: number) => {
    if (pct < 30) return { text: 'text-[#ff5c7a]', bg: 'bg-[#ff5c7a]', glow: 'shadow-[0_0_15px_rgba(255,92,122,0.4)]', badge: 'bg-red-500/10 text-red-400 border-red-500/20' };
    if (pct < 70) return { text: 'text-[#ffb547]', bg: 'bg-[#ffb547]', glow: 'shadow-[0_0_15px_rgba(255,181,71,0.4)]', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
    return { text: 'text-[#00ffa3]', bg: 'bg-[#00ffa3]', glow: 'shadow-[0_0_15px_rgba(0,255,163,0.4)]', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
  };

  const progressStyle = getProgressColorClass(progressPercent);

  // --- 6. CHART.JS CHRONOLOGY RENDERER ---
  useEffect(() => {
    if (!chartRef.current) return;
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Simulate standard growth projection over the next 6 months based on contribution rate
    const labels = [];
    const actualLine = [];
    const targetLine = [];

    const currDate = new Date();
    for (let i = 0; i < 6; i++) {
      const forecastMonth = new Date(currDate.getFullYear(), currDate.getMonth() + i, 1);
      const monthLabel = forecastMonth.toLocaleString('id-ID', { month: 'short' });
      labels.push(monthLabel);

      // Current projection
      const projAvailable = Math.min(targetAmount, totalAvailable + (savingsRate * i));
      actualLine.push(projAvailable);
      targetLine.push(targetAmount);
    }

    const growthChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Proyeksi Tabungan (Rp)',
            data: actualLine,
            borderColor: progressPercent >= 70 ? '#00ffa3' : progressPercent >= 30 ? '#ffb547' : '#7c5cff',
            backgroundColor: 'rgba(124, 92, 255, 0.05)',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointBackgroundColor: '#ffffff',
            pointRadius: 4
          },
          {
            label: 'Level Target Ideal (Rp)',
            data: targetLine,
            borderColor: 'rgba(255, 255, 255, 0.25)',
            borderDash: [5, 5],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: '#9aa4bf', font: { size: 9, family: 'sans-serif' } }
          },
          tooltip: {
            backgroundColor: '#0c1020',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            titleFont: { size: 10, weight: 'bold' },
            bodyFont: { size: 12, family: 'monospace' },
            callbacks: {
              label: (item) => `Rp ${(item.parsed.y ?? 0).toLocaleString('id-ID')}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.03)' },
            ticks: { color: '#9aa4bf', font: { size: 9, weight: 'bold' } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.03)' },
            ticks: { 
              color: '#9aa4bf', 
              font: { size: 9, family: 'monospace' },
              callback: (value) => {
                if (Number(value) >= 1000000) return (Number(value) / 1000000).toFixed(1) + ' Jt';
                return value;
              }
            }
          }
        }
      }
    });

    return () => {
      growthChart.destroy();
    };
  }, [totalAvailable, targetAmount, savingsRate, progressPercent]);

  // --- 7. CONTRIBUTION SUBMIT HANDLING ---
  const handleAddContribution = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(contribAmount.replace(/[^0-9]/g, ''));
    if (!amountVal || amountVal <= 0) return;

    // Create a new contribution log
    const newContrib: EmergencyFundContribution = {
      id: `contrib-${Date.now()}`,
      date: contribDate,
      amount: amountVal,
      note: contribNote,
      source: contribSource
    };

    // Keep parent app state synchronized also by adding a transaction representing this contribution
    onAddTransaction({
      title: `${contribNote} (${contribSource})`,
      nominal: amountVal,
      type: 'Pengeluaran',
      category: 'Top Up', // standard Top Up category
      source: contribSource,
      date: contribDate,
      note: 'Alokasi khusus tabungan dana darurat'
    });

    // Update emergency configuration with new array
    const updatedContribs = [newContrib, ...(emergencyConfig.contributions || [])];
    const newTotalAvailable = totalAvailable + amountVal;
    const newProgressPercent = targetAmount > 0 ? Math.min(100, Math.round((newTotalAvailable / targetAmount) * 100)) : 0;

    const newConfig: EmergencyFundConfig = {
      ...emergencyConfig,
      contributions: updatedContribs
    };

    onUpdateEmergencyConfig(newConfig);

    // Smart notification logic triggers when threshold passed
    triggerMilestoneNotifications(newProgressPercent, amountVal);

    // Reset inputs
    setContribAmount('');
    setContribNote('Penyisihan Dana Darurat');
  };

  const triggerMilestoneNotifications = (newPct: number, addedAmt: number) => {
    const formattedAmt = `Rp ${addedAmt.toLocaleString('id-ID')}`;
    let title = 'Pusat Keamanan Keuangan';
    let message = '';
    
    if (newPct >= 100) {
      title = '✓ Dana Darurat Terpenuhi';
      message = `Selamat! Tambahan kontribusi saku ${formattedAmt} telah membantu dana darurat Anda terpenuhi 100% dari target aman finansial!`;
    } else if (newPct >= 50) {
      title = '🌗 Setengah Target Selamat';
      message = `Mantap! Kontribusi ${formattedAmt} membawa Anda aman lebih jauh yakni mencapai setengah (50%+) target dana darurat ideal.`;
    } else {
      title = '🛡 Kontribusi Dana Darurat';
      message = `Penyisihan baru sebesar ${formattedAmt} berhasil didepositokan. Level keamanan dana darurat kini berada di ${newPct}%.`;
    }

    onAddNotification({
      id: `emergency-notif-${Date.now()}`,
      title,
      message,
      category: 'Goal Reminder',
      date: new Date().toISOString().split('T')[0],
      isRead: false
    });
  };

  const handleRemoveContribution = (id: string, refundAmount: number, source: string) => {
    const updatedContribs = (emergencyConfig.contributions || []).filter(c => c.id !== id);
    const newConfig = {
      ...emergencyConfig,
      contributions: updatedContribs
    };

    // Log negative transaction adjustment representation
    onAddTransaction({
      title: `Pembatalan Penyisihan Dana Darurat`,
      nominal: refundAmount,
      type: 'Pemasukan',
      category: 'Refund',
      source: source,
      date: new Date().toISOString().split('T')[0],
      note: 'Penyesuaian ulang log kontribusi yang dibatalkan'
    });

    onUpdateEmergencyConfig(newConfig);
  };

  const handleToggleSource = (sourceKey: string) => {
    const activeSources = [...emergencyConfig.selectedSources];
    const index = activeSources.indexOf(sourceKey);
    if (index === -1) {
      activeSources.push(sourceKey);
    } else {
      // Don't let empty sources leave at least one source if possible, or just standard filter
      activeSources.splice(index, 1);
    }
    
    onUpdateEmergencyConfig({
      ...emergencyConfig,
      selectedSources: activeSources
    });
  };

  const handleSelectAllSources = () => {
    const allKeys = [
      ...accounts.map(a => `acc-${a.id}`),
      ...assets.map(as => `asset-${as.id}`)
    ];
    onUpdateEmergencyConfig({
      ...emergencyConfig,
      selectedSources: allKeys
    });
  };

  const handleClearSources = () => {
    onUpdateEmergencyConfig({
      ...emergencyConfig,
      selectedSources: []
    });
  };

  const handlePeriodChange = (months: number) => {
    onUpdateEmergencyConfig({
      ...emergencyConfig,
      periodMonths: months
    });
  };

  const handleStatusChange = (status: 'lajang' | 'menikah' | 'menikah_anak' | 'custom') => {
    onUpdateEmergencyConfig({
      ...emergencyConfig,
      statusKey: status
    });
  };

  const handleCustomMonthsChange = (val: number) => {
    onUpdateEmergencyConfig({
      ...emergencyConfig,
      customMonths: val
    });
  };

  const handleManualSavingsChange = (val: number) => {
    onUpdateEmergencyConfig({
      ...emergencyConfig,
      manualMonthlySavings: val
    });
  };

  return (
    <div className="space-y-6 text-white text-left">
      {/* HEADER SECTION WITH ADVANCED PREMIUM GLASS COVER */}
      <div className="relative bg-[#0c1020]/90 backdrop-blur-md border border-white/[0.08] p-6 rounded-[28px] overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1.5 z-10 flex-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#7c5cff]/15 border border-[#7c5cff]/30 text-[#00d2ff] text-[10px] uppercase font-mono font-black tracking-widest rounded-md">Smart Suite</span>
            <span className="text-[#9aa4bf]/60 font-mono text-[10px]">• Real-Time Analytics</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[#00ffa3] drop-shadow-[0_0_10px_rgba(0,255,163,0.3)]" /> 
            Dana Darurat Cerdas <span className="text-xs text-[#9aa4bf] font-medium font-mono text-slate-400">v2.1</span>
          </h1>
          <p className="text-xs text-[#9aa4bf] max-w-xl leading-relaxed">
            Asisten kalkulatormu untuk menghitung safety net ideal secara rasional berdasarkan pengeluaran mutasi historis asli Anda.
          </p>
        </div>

        <div className="z-10 flex items-center gap-2 bg-[#121832] border border-white/[0.06] p-2 rounded-2xl shrink-0">
          <BankIcon className="h-5 w-5 text-[#ffb547]" />
          <div className="text-right pr-1">
            <p className="text-[9px] uppercase font-mono font-bold text-slate-400 tracking-wider">Total Dana Siap</p>
            <p className="text-xs font-black font-mono text-white">Rp {totalAvailable.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      {/* RETAIL MAIN COMPARTMENTS: COLUMNS FOR CALCULATOR AND FORECASTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COMPARTMENT (COL-SPAN-8) */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Bento Block 1: Analisis Pengeluaran Historis */}
          <div className="bg-[#0c1020]/90 border border-white/[0.06] p-5.5 rounded-[24px] shadow-lg space-y-4">
            <div className="flex justify-between items-center pb-2.5 border-b border-white/[0.04]">
              <div>
                <h3 className="text-xs font-black font-mono text-[#9aa4bf] uppercase tracking-wider">1. Analisis Pengeluaran Historis</h3>
                <p className="text-[11px] text-[#9aa4bf] mt-0.5">Sistem memetakan rata-rata pengeluaran aktual Anda</p>
              </div>

              {/* Selection for period analysis */}
              <div className="flex bg-[#121832] p-1 rounded-xl border border-white/[0.06] shadow-inner gap-1">
                {[1, 3, 6, 12].map(m => (
                  <button
                    key={m}
                    onClick={() => handlePeriodChange(m)}
                    className={`px-2 py-1 text-[9px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                      selectedPeriodMonths === m 
                        ? 'bg-[#7c5cff] text-white shadow' 
                        : 'text-[#9aa4bf]/60 hover:text-white'
                    }`}
                  >
                    {m} Bln
                  </button>
                ))}
              </div>
            </div>

            {/* Metric visualization row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
              <div className="bg-[#121832]/60 border border-white/[0.04] p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-[8.5px] uppercase font-mono font-bold text-slate-400 tracking-wider">Sensus Trx {selectedPeriodMonths} Bln Terakhir</span>
                <p className="text-base font-black font-mono mt-2 text-[#00d2ff]">{periodExpenses.length} Pengeluaran</p>
                <span className="text-[9.5px] text-[#9aa4bf] mt-1">Excludes top-ups</span>
              </div>

              <div className="bg-[#121832]/60 border border-white/[0.04] p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-[8.5px] uppercase font-mono font-bold text-slate-400 tracking-wider">Total Kas Keluar</span>
                <p className="text-base font-black font-mono mt-2 text-white">Rp {totalExpenseOnPeriod.toLocaleString('id-ID')}</p>
                <span className="text-[9.5px] text-[#9aa4bf] mt-1">Selama periode dipilih</span>
              </div>

              <div className="bg-[#12152a] ring-1 ring-[#7c5cff]/30 p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute right-2 bottom-2 font-black text-6xl text-[#7c5cff]/5 pointer-events-none font-mono">Rp</div>
                <span className="text-[8.5px] uppercase font-mono font-bold text-[#7c5cff] tracking-wider">Rata-rata Pengeluaran</span>
                <p className="text-base font-black font-mono mt-2 text-[#00ffa3]">Rp {averageMonthlyExpense.toLocaleString('id-ID')}</p>
                <span className="text-[9.5px] text-[#9aa4bf] mt-1">Per bulan (Standar Hidup)</span>
              </div>
            </div>
            
            {calculatedAverageExpense === 0 && (
              <div className="mt-2 text-xs bg-[#ffb547]/5 border border-[#ffb547]/15 p-3 rounded-xl flex items-center gap-2 text-[#ffb547]">
                <Info className="h-4 w-4 shrink-0" />
                <p>Belum ada data transaksi pengeluaran pada {selectedPeriodMonths} bulan terakhir. Mengaktifkan estimasi standar default senilai Rp 5 juta/bulan.</p>
              </div>
            )}
          </div>

          {/* Bento Block 2: Target Dana Darurat Simulator */}
          <div className="bg-[#0c1020]/90 border border-white/[0.06] p-5.5 rounded-[24px] shadow-lg space-y-4">
            <div>
              <h3 className="text-xs font-black font-mono text-[#9aa4bf] uppercase tracking-wider">2. Simulator Multiplikator Keamanan</h3>
              <p className="text-[11px] text-[#9aa4bf] mt-0.5">Pilih profil risiko finansial berdasarkan status tanggungan Anda</p>
            </div>

            {/* Quick status tabs selection */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {(Object.keys(multiplierModes) as Array<'lajang' | 'menikah' | 'menikah_anak' | 'custom'>).map(statusKeyObj => {
                const item = multiplierModes[statusKeyObj];
                const active = emergencyConfig.statusKey === statusKeyObj;
                return (
                  <button
                    key={statusKeyObj}
                    onClick={() => handleStatusChange(statusKeyObj)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer ${
                      active 
                        ? 'bg-[#7c5cff]/25 border-[#7c5cff] ring-1 ring-[#7c5cff]' 
                        : 'bg-[#121832]/65 border-white/[0.05] hover:border-white/10'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase text-[#9aa4bf] font-mono tracking-wider">{item.label}</span>
                    <div className="mt-1 flex items-baseline gap-0.5">
                      <span className="text-xl font-mono font-black text-white">{item.months}</span>
                      <span className="text-[10px] text-[#9aa4bf]">Bln</span>
                    </div>
                    <span className="text-[9px] text-[#9aa4bf]/60 truncate max-w-full font-medium leading-none">{statusKeyObj === 'lajang' ? 'Individu' : statusKeyObj === 'menikah' ? 'Keluarga' : statusKeyObj === 'custom' ? 'Adjustable' : 'Anak & Dependen'}</span>
                  </button>
                );
              })}
            </div>

            {/* Description note */}
            <div className="p-3 bg-white/[0.015] border border-white/[0.04] rounded-xl flex items-start gap-2.5 text-[11px] text-[#9aa4bf]">
              <Sparkles className="h-4 w-4 text-[#ffb547] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white uppercase font-mono text-[9px] tracking-widest">{activeMode.label}: </span>
                <span className="leading-relaxed">{activeMode.desc}</span>
              </div>
            </div>

            {/* Custom Multiplier slider for Custom option */}
            {emergencyConfig.statusKey === 'custom' && (
              <div className="bg-[#121832]/65 p-3.5 rounded-2xl border border-white/[0.04] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-[#9aa4bf] font-mono">Tentukan Jumlah Bulan Proteksi</label>
                  <span className="font-mono font-black text-[#00ffa3]">{emergencyConfig.customMonths || 3} Bulan</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="24"
                  step="1"
                  value={emergencyConfig.customMonths || 3}
                  onChange={(e) => handleCustomMonthsChange(parseInt(e.target.value))}
                  className="w-full accent-[#7c5cff] cursor-pointer"
                />
                <div className="flex justify-between text-[8px] font-mono text-[#9aa4bf]/40">
                  <span>2 Bln (Darurat Ringan)</span>
                  <span>12 Bln (Standar)</span>
                  <span>24 Bln (Kokoh / Krisis Panjang)</span>
                </div>
              </div>
            )}
          </div>

          {/* Bento Block 3: Progress & Forecast Grid Tracker */}
          <div className="bg-[#0c1020]/90 border border-white/[0.06] p-5.5 rounded-[24px] shadow-lg space-y-4">
            <div>
              <h3 className="text-xs font-black font-mono text-[#9aa4bf] uppercase tracking-wider">3. Hasil Perhitungan & Grafik Proyeksi</h3>
              <p className="text-[11px] text-[#9aa4bf] mt-0.5">Tinjauan komparasi target simpanan darurat dan sisa waktu pencapaian</p>
            </div>

            {/* High-end Progress Tracker Card */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-4.5 bg-gradient-to-br from-[#121832] to-[#0d1226] border border-white/[0.05] rounded-2xl relative overflow-hidden">
              
              {/* Left col: Circular progress state */}
              <div className="md:col-span-4 flex flex-col items-center justify-center py-2 shrink-0 border-b md:border-b-0 md:border-r border-white/[0.04]">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  
                  {/* Progress Ring Background */}
                  <svg className="absolute w-full h-full transform -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="46"
                      className="stroke-white/[0.04] fill-none"
                      strokeWidth="8"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="46"
                      className={`fill-none transition-all duration-700 ease-out ${progressStyle.text}`}
                      strokeWidth="8"
                      strokeDasharray="289"
                      strokeDashoffset={289 - (289 * progressPercent) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  
                  {/* Inside content */}
                  <div className="text-center z-10">
                    <p className="text-2xl font-mono font-black tracking-tight">{progressPercent}%</p>
                    <p className="text-[8px] uppercase tracking-widest font-mono text-[#9aa4bf] mt-0.5 font-bold">TERKUMPUL</p>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1 mt-3 px-2 py-0.5 border text-[9px] font-mono font-black uppercase rounded-md tracking-wider ${progressStyle.badge}`}>
                  {progressPercent < 30 ? 'Bahaya' : progressPercent < 70 ? 'Waspada' : 'Aman Finansial'}
                </span>
              </div>

              {/* Right col: Raw metric labels */}
              <div className="md:col-span-8 flex flex-col justify-between space-y-3 pl-0 md:pl-2">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] text-[#9aa4bf]">Target Dana Darurat:</p>
                      <p className="text-sm font-black font-mono text-white mt-0.5">Rp {targetAmount.toLocaleString('id-ID')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#9aa4bf]">Dana Tersedia saat ini:</p>
                      <p className="text-sm font-black font-mono text-[#00ffa3] mt-0.5">Rp {totalAvailable.toLocaleString('id-ID')}</p>
                    </div>
                  </div>

                  {/* High quality progress bar */}
                  <div className="w-full h-2 rounded-full bg-white/[0.03] border border-white/[0.04] overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${progressStyle.bg} ${progressStyle.glow}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Sisa & Estimasi Tercapai info */}
                <div className="pt-2 border-t border-white/[0.03] flex justify-between items-center text-[11px] text-[#9aa4bf]">
                  <div>
                    <span className="font-medium text-slate-400">Sisa Kebutuhan:</span>
                    <span className="font-mono font-bold text-[#ff5c7a] ml-1.5">Rp {remainingNeeded.toLocaleString('id-ID')}</span>
                  </div>
                  {progressPercent >= 100 ? (
                    <span className="text-[#00ffa3] font-black font-mono text-[9px] uppercase tracking-widest bg-[#00ffa3]/10 border border-[#00ffa3]/20 px-2 py-0.5 rounded-lg flex items-center gap-1">✓ Lunas</span>
                  ) : (
                    <span className="text-slate-400 font-mono text-[10px]">Tingkat Aman: {targetMultiplier}X Bulanan</span>
                  )}
                </div>
              </div>

            </div>

            {/* Growth graph section */}
            <div className="space-y-2.5">
              <label className="text-[9.5px] font-mono font-bold uppercase text-slate-400 tracking-wider">Grafik Proyeksi Pertumbuhan (6 Bulan)</label>
              <div className="h-[210px] w-full bg-[#121832]/20 border border-white/[0.04] p-3 rounded-2xl relative">
                <canvas ref={chartRef}></canvas>
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COMPARTMENT (COL-SPAN-4) - CONTROLS & LOGS */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* AI Financial Insight Pane */}
          <div className="bg-gradient-to-br from-[#12152d]/90 to-[#0c0d1b]/90 border border-[#7c5cff]/20 p-5 rounded-[24px] shadow-xl relative overflow-hidden text-left space-y-3.5 ring-1 ring-[#7c5cff]/10">
            <div className="absolute right-0 top-0 h-20 w-20 bg-[#7c5cff]/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-[#00d2ff] font-mono tracking-widest font-black uppercase flex items-center gap-1">
                <Sparkles className="h-4.5 w-4.5 text-[#ffb547]" /> AI FINANCIAL ADVISORY
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ffa3]"></span>
            </div>

            {/* advisory comment generator */}
            <div className="text-[11.5px] leading-relaxed text-[#c3cada] space-y-2.5">
              {progressPercent < 30 ? (
                <p>
                  ⚠️ <b className="text-white">Sangat Rentan:</b> Tingkat keamanan finansial Anda <span className="text-[#ff5c7a] font-bold">masih rendah</span>. Anda baru memiliki <span className="text-white font-bold">{progressPercent}%</span> dari target dana darurat ideal. 
                  Dengan rata-rata pengeluaran <b className="text-white">Rp {averageMonthlyExpense.toLocaleString('id-ID')}</b> per bulan dan status keluarga <b className="text-white">"{activeMode.label}"</b>, Anda disarankan untuk agresif menyisihkan keuangan minimal sebesar <b className="text-white">Rp {targetAmount.toLocaleString('id-ID')}</b>.
                </p>
              ) : progressPercent < 100 ? (
                <p>
                  🌗 <b className="text-white">Setengah Aman:</b> Anda berada di zona waspada aktif. Tingkat keterisian dana darurat Anda berada di <b className="text-[#ffb547]">{progressPercent}%</b>. 
                  Pertahankan kebiasaan menabung <b className="text-white">Rp {savingsRate.toLocaleString('id-ID')}/bulan</b> saat ini. Sisa target Anda kurang <b className="text-white">Rp {remainingNeeded.toLocaleString('id-ID')}</b> lagi untuk menyentuh rekor pertahanan ideal.
                </p>
              ) : (
                <p>
                  🎉 <b className="text-white">Aman Terproteksi:</b> Selamat, dana darurat Anda telah <span className="text-[#00ffa3] font-bold">memenuhi standar keamanan finansial ideal</span> selama <b className="text-white">{targetMultiplier} bulan</b>! 
                  Anda siap menahan kejut ekonomi mendadak (resesi, pemutusan hubungan kerja, tagihan kesehatan tak terduga). Saldo portofolio darurat Anda senilai <b className="text-[#00ffa3]">Rp {totalAvailable.toLocaleString('id-ID')}</b> sanggup bernapas tanpa cemas.
                </p>
              )}
              
              {remainingNeeded > 0 && savingsRate > 0 && (
                <p className="border-t border-white/[0.04] pt-2 text-[10.5px] text-[#9aa4bf]/90 italic">
                  "Jika pola menabung saat ini dipertahankan, dana darurat diperkirakan tercapai dalam <span className="text-[#ffb547] font-bold font-mono text-xs">{estimatedMonthsNeeded} bulan</span> lagi."
                </p>
              )}
            </div>
          </div>

          {/* Savings Rate Config widget */}
          <div className="bg-[#0c1020]/90 border border-white/[0.06] p-4.5 rounded-[20px] space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-black uppercase text-[#9aa4bf] font-mono text-[9px] tracking-wider">Rata-rata Menabung Bulanan</span>
              <span className="font-mono text-[10.5px] font-bold text-white">Rp {savingsRate.toLocaleString('id-ID')}/bln</span>
            </div>
            <input
              type="range"
              min="200000"
              max="15000000"
              step="100000"
              value={savingsRate}
              onChange={(e) => handleManualSavingsChange(parseInt(e.target.value))}
              className="w-full accent-[#00ffa3] cursor-pointer"
            />
            <p className="text-[10px] text-[#9aa4bf] leading-tight">Pengaturan ini digunakan untuk mensimulasikan estimasi bulan ketercapaian secara presisi.</p>
          </div>

          {/* Choose Sources Checkboxes */}
          <div className="bg-[#0c1020]/90 border border-white/[0.06] p-4.5 rounded-[20px] space-y-3.5 text-left">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-[10px] font-bold text-[#9aa4bf] uppercase font-mono tracking-wider">Sumber Alokasi Saldo</h4>
                <p className="text-[9.5px] text-[#9aa4bf]/60 mt-0.5">Pilih rekening & dompet penampung dana darurat</p>
              </div>

              <div className="flex items-center gap-1.5">
                <button 
                  onClick={handleSelectAllSources}
                  className="text-[9px] font-mono hover:text-[#00ffa3] text-slate-400 uppercase font-bold cursor-pointer"
                >
                  ALL
                </button>
                <span className="text-white/10 text-[9px]">|</span>
                <button 
                  onClick={handleClearSources}
                  className="text-[9px] font-mono hover:text-[#ff5c7a] text-slate-400 uppercase font-bold cursor-pointer"
                >
                  CLEAR
                </button>
              </div>
            </div>

            {/* Checkbox logs list */}
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
              
              {/* Core physical cash or debit accounts */}
              {accounts.map(acc => {
                const isChecked = emergencyConfig.selectedSources.includes(`acc-${acc.id}`);
                return (
                  <div 
                    key={acc.id}
                    onClick={() => handleToggleSource(`acc-${acc.id}`)}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all border cursor-pointer ${
                      isChecked 
                        ? 'bg-[#121832] border-[#7c5cff]/30 text-white' 
                        : 'bg-white/[0.01] border-white/[0.03] text-slate-400 hover:border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="rounded accent-[#7c5cff] h-3 w-3"
                      />
                      <span className="text-xs font-bold leading-none">{acc.name}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold leading-none text-white/90">Rp {acc.balance.toLocaleString('id-ID')}</span>
                  </div>
                );
              })}

              {/* Liquid digital or gold assets */}
              {assets.map(as => {
                const isChecked = emergencyConfig.selectedSources.includes(`asset-${as.id}`);
                const totalAssetValLocal = Math.round(as.units * as.marketPrice);
                return (
                  <div 
                    key={as.id}
                    onClick={() => handleToggleSource(`asset-${as.id}`)}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all border cursor-pointer ${
                      isChecked 
                        ? 'bg-[#121832] border-[#00d2ff]/30 text-white' 
                        : 'bg-white/[0.015] border-white/[0.03] text-slate-400 hover:border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="rounded accent-[#00d2ff] h-3 w-3"
                      />
                      <span className="text-xs font-bold leading-none">{as.name} ({as.code})</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold leading-none text-[#ffb547]">Rp {totalAssetValLocal.toLocaleString('id-ID')}</span>
                  </div>
                );
              })}

            </div>
          </div>

          {/* Tabungan Khusus & Contributions log form */}
          <div className="bg-[#0c1020]/90 border border-white/[0.06] p-4.5 rounded-[20px] space-y-3.5 text-left">
            <div>
              <h4 className="text-[10px] font-bold text-[#9aa4bf] uppercase font-mono tracking-wider">Penyisihan Tabungan Manual</h4>
              <p className="text-[9.5px] text-[#9aa4bf]/60 mt-0.5">Depositokan langsung dana berlebih sebagai kontribusi tabungan khusus</p>
            </div>

            <form onSubmit={handleAddContribution} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-mono font-bold text-slate-400 tracking-wider">Nominal Sisihan</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs font-mono font-bold text-slate-400 leading-none">Rp</span>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 1.000.000"
                    value={contribAmount}
                    onChange={(e) => {
                      const numeric = e.target.value.replace(/[^0-9]/g, '');
                      setContribAmount(numeric ? parseInt(numeric).toLocaleString('id-ID') : '');
                    }}
                    className="w-full bg-[#121832] border border-white/[0.06] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono font-bold focus:outline-none focus:border-[#7c5cff]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono font-bold text-slate-400 tracking-wider">Sumber Rekening</label>
                  <select
                    value={contribSource}
                    onChange={(e) => setContribSource(e.target.value)}
                    className="w-full bg-[#121832] border border-white/[0.06] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7c5cff] cursor-pointer"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.name} className="bg-[#0b1020] text-white">{acc.name}</option>
                    ))}
                    <option value="Cash" className="bg-[#0b1020] text-white">Cash (Dompet)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono font-bold text-slate-400 tracking-wider font-bold">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={contribDate}
                    onChange={(e) => setContribDate(e.target.value)}
                    className="w-full bg-[#121832] border border-white/[0.06] rounded-xl px-2.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-[#7c5cff] font-sans font-bold cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-mono font-bold text-slate-400 tracking-wider">Keterangan / Memo</label>
                <input
                  type="text"
                  placeholder="Isi untuk pengingat..."
                  value={contribNote}
                  onChange={(e) => setContribNote(e.target.value)}
                  className="w-full bg-[#121832] border border-white/[0.06] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#7c5cff]"
                />
              </div>

              <button
                type="submit"
                className="w-full h-8 px-4 py-1 flex items-center justify-center gap-1 bg-gradient-to-r from-[#7c5cff] to-[#00ffa3] hover:from-[#6b4fe0] hover:to-[#00e08f] font-black text-[10.5px] font-mono tracking-wider text-black rounded-xl cursor-pointer"
              >
                <Plus className="h-4 w-4 shrink-0" />
                SIMPAN KONTRIBUSI
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* FOOTER TIMELINE TABLE FOR HISTORY CONTRIBUTION LOGS */}
      <div className="bg-[#0c1020]/90 border border-white/[0.06] p-5 rounded-[24px] shadow-lg  space-y-3 text-left">
        <div className="flex justify-between items-center pb-2.5 border-b border-white/[0.04]">
          <div>
            <h3 className="text-xs font-black font-mono text-[#9aa4bf] uppercase tracking-wider">Riwayat Kontribusi Tabungan Khusus (Saku Khusus)</h3>
            <p className="text-[11px] text-[#9aa4bf] mt-0.5">Datar kontribusi tunai manual yang dipisahkan dari alokasi dana normal</p>
          </div>
          <span className="px-2.5 py-0.5 bg-gradient-to-r from-[#7c5cff]/10 to-[#00ffa3]/10 text-white rounded-lg text-[9px] font-mono border border-white/[0.05]">
            Akumulasi Khusus: Rp {tabunganKhususValue.toLocaleString('id-ID')}
          </span>
        </div>

        <div className="overflow-x-auto">
          {(!emergencyConfig.contributions || emergencyConfig.contributions.length === 0) ? (
            <div className="text-center py-7 text-xs text-[#9aa4bf]/60 italic">
              Belum ada riwayat penyisihan tabungan khusus yang tersimpan. Cobalah sisihkan uang jajan Anda hari ini!
            </div>
          ) : (
            <table className="w-full text-xs font-sans text-left">
              <thead>
                <tr className="border-b border-white/[0.04] text-[#9aa4bf]/60 font-mono text-[9px] uppercase tracking-wider">
                  <th className="pb-2 font-bold">Tanggal</th>
                  <th className="pb-2 font-bold">Memo / Tabungan</th>
                  <th className="pb-2 font-bold font-mono">Sumber Rekening</th>
                  <th className="pb-2 font-bold text-right font-mono">Nominal</th>
                  <th className="pb-2 text-center font-mono">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {emergencyConfig.contributions.map((c) => (
                  <tr key={c.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                    <td className="py-2.5 font-mono text-[11px] text-slate-300">{c.date}</td>
                    <td className="py-2.5 font-bold text-white">{c.note}</td>
                    <td className="py-2.5 font-mono text-slate-400 text-[11px]">{c.source}</td>
                    <td className="py-2.5 font-mono font-black text-[#00ffa3] text-right">Rp {c.amount.toLocaleString('id-ID')}</td>
                    <td className="py-2.5 text-center">
                      <button
                        onClick={() => handleRemoveContribution(c.id, c.amount, c.source)}
                        className="p-1 text-slate-500 hover:text-[#ff5c7a] rounded-lg transition-colors cursor-pointer"
                        title="Hapus Kontribusi"
                      >
                        <Trash2 className="h-4 w-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
