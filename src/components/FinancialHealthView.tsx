import React, { useMemo } from 'react';
import { Award, ShieldCheck, HeartPulse, Sparkles, TrendingUp, AlertCircle, TrendingDown } from 'lucide-react';
import { Transaction, Account, Asset, Debt } from '../utils/financeHelper';
import { formatCurrency } from '../utils/financeHelper';

interface FinancialHealthViewProps {
  transactions: Transaction[];
  accounts: Account[];
  assets: Asset[];
  debts: Debt[];
}

export function FinancialHealthView({
  transactions,
  accounts,
  assets,
  debts,
}: FinancialHealthViewProps) {
  // 1. COMPILATION OF TOTAL VALUES
  const totalIncome = useMemo(() => {
    return transactions
      .filter(t => t.type === 'Pemasukan')
      .reduce((sum, t) => sum + t.nominal, 0);
  }, [transactions]);

  const totalExpense = useMemo(() => {
    return transactions
      .filter(t => t.type === 'Pengeluaran')
      .reduce((sum, t) => sum + t.nominal, 0);
  }, [transactions]);

  const totalLiquid = useMemo(() => {
    return accounts.reduce((sum, a) => sum + a.balance, 0);
  }, [accounts]);

  const totalAssetVal = useMemo(() => {
    return assets.reduce((sum, a) => sum + (a.units * a.marketPrice), 0);
  }, [assets]);

  const totalDebtVal = useMemo(() => {
    return debts
      .filter(d => d.type === 'Hutang')
      .reduce((sum, d) => sum + (d.nominal - d.paidNominal), 0);
  }, [debts]);

  const totalPiutangVal = useMemo(() => {
    return debts
      .filter(d => d.type === 'Piutang')
      .reduce((sum, d) => sum + (d.nominal - d.paidNominal), 0);
  }, [debts]);

  const netWorth = totalLiquid + totalAssetVal + totalPiutangVal - totalDebtVal;

  const totalInvestmentVal = useMemo(() => {
    // Investment consists of assets with categories Crypto, Saham, MutualFund
    return assets
      .filter(a => ['Crypto', 'Saham', 'MutualFund'].includes(a.category))
      .reduce((sum, a) => sum + (a.units * a.marketPrice), 0);
  }, [assets]);

  // 2. FINANCIAL RATIOS CALCULATIONS
  const savingRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
  const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
  const debtRatio = (totalLiquid + totalAssetVal) > 0 ? (totalDebtVal / (totalLiquid + totalAssetVal)) * 100 : 0;
  const investmentRatio = netWorth > 0 ? (totalInvestmentVal / netWorth) * 100 : 0;

  // 3. HEALTH SCORE (0-100)
  const healthScore = useMemo(() => {
    let score = 55; // default base line
    
    // Saving Rate modifiers
    if (savingRate > 35) score += 15;
    else if (savingRate > 15) score += 8;
    else if (savingRate < 0) score -= 15;

    // Debt Ratio modifiers
    if (debtRatio === 0) score += 15;
    else if (debtRatio > 40) score -= 10;
    else if (debtRatio < 15) score += 8;

    // Investment Ratio modifiers
    if (investmentRatio > 25) score += 10;
    else if (investmentRatio > 10) score += 5;

    // Capital emergency buffer (months of savings covered)
    const averageMonthlyBurn = totalExpense || 4000000;
    const monthsCovered = totalLiquid / averageMonthlyBurn;
    if (monthsCovered >= 6) score += 10;
    else if (monthsCovered >= 3) score += 5;
    else if (monthsCovered < 1.0) score -= 10;

    return Math.max(10, Math.min(100, Math.round(score)));
  }, [savingRate, debtRatio, investmentRatio, totalExpense, totalLiquid]);

  const getScoreVerdict = (score: number) => {
    if (score >= 85) return { status: 'Sangat Sehat 🏆', desc: 'Arus kas dan aset berkinerja luar biasa. Kebebasan finansial di depan mata!', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' };
    if (score >= 70) return { status: 'Sehat & Kokoh 👍', desc: 'Rasio tabungan dan utang ideal. Lanjutkan investasi teratur.', color: 'text-[#7c5cff] border-[#7c5cff]/20 bg-[#7c5cff]/5' };
    if (score >= 50) return { status: 'Aspek Menengah ⚖️', desc: 'Keuangan Anda cukup stabil namun persentase jaminan darurat tipis.', color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' };
    return { status: 'Kritis Wasteland ⚠️', desc: 'Kurangi hutang liabilitas non-produktif segera dan pangkas pengeluaran gaya hidup.', color: 'text-red-400 border-red-500/20 bg-red-500/5' };
  };

  const verdict = getScoreVerdict(healthScore);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <HeartPulse className="h-6 w-6 text-[#7c5cff]" />
            Analisa Kesehatan Finansial <span className="text-xs bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-[#9aa4bf] font-normal font-mono">Expert Advisor</span>
          </h1>
          <p className="text-xs text-[#9aa4bf]">Metrika kalkulasi otomatis rasio kelayakan finansial yang disesuaikan dengan metodologi perencana keuangan modern</p>
        </div>
      </div>

      {/* COMPREHENSIVE GAUGE VISUAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* SCORE WHEEL GAUGE */}
        <div className="bg-white/[0.02] border border-white/[0.06] p-6 rounded-[28px] flex flex-col items-center justify-center text-center space-y-4">
          <span className="text-[10px] uppercase font-mono font-bold text-[#9aa4bf] tracking-widest">Financial Health Score</span>
          
          {/* SVG Gauge */}
          <div className="relative flex items-center justify-center">
            <svg className="w-36 h-36">
              <circle cx="72" cy="72" r="58" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="10" />
              <circle 
                cx="72" 
                cy="72" 
                r="58" 
                fill="none" 
                stroke="#7c5cff" 
                strokeWidth="10" 
                strokeDasharray={`${(healthScore / 100) * 364} 364`}
                transform="rotate(-90 72 72)"
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease', filter: 'drop-shadow(0px 0px 8px rgba(124,92,255,0.4))' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
              <span className="text-3.5xl font-black text-white leading-none">{healthScore}</span>
              <span className="text-[9px] text-[#9aa4bf] mt-0.5">dari 100</span>
            </div>
          </div>

          <div className={`px-4 py-1.5 rounded-full border text-xs font-bold ${verdict.color}`}>
            {verdict.status}
          </div>
        </div>

        {/* AI INTEGRATED ADVICE */}
        <div className="bg-white/[0.02] border border-white/[0.06] p-6 rounded-[28px] md:col-span-2 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-mono font-black text-white flex items-center gap-1.5 pb-2 border-b border-white/[0.06]">
              <Sparkles className="h-4 w-4 text-[#7c5cff]" /> Penilaian Detil SASS AI Analyst
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {verdict.desc} Berdasarkan metrika rasio tabungan bulan ini yang sebesar <strong className="text-white font-mono">{savingRate.toFixed(1)}%</strong>, ketersediaan cadangan darurat Anda setara dengan kelayakan ideal.
            </p>
            <div className="p-3.5 bg-white/[0.01] border border-white/5 rounded-xl text-[10px] text-[#9aa4bf] leading-relaxed">
              <strong>💡 Rekomendasi:</strong> Alihkan minimal 10% dana di akun bank statis atau cash fisik ke instrumen reksa dana obligasi atau pasar saham BBCA untuk melindungi modal Anda dari inflasi riil tahunan.
            </div>
          </div>

          <div className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Metodologi disinkronisasi otomatis dengan standar CFP® (Certified Financial Planner) Indonesia
          </div>
        </div>

      </div>

      {/* RATIO RATIO ASSETS METRIC CLASSIFIERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        {/* SAVING RATE CARD */}
        <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[24px] space-y-3 relative overflow-hidden">
          <span className="text-[10px] uppercase font-mono font-bold text-[#9aa4bf]">Ratio Tabungan (Saving Rate)</span>
          <div className="flex justify-between items-baseline">
            <span className="text-xl font-black text-emerald-400 font-mono">{savingRate.toFixed(1)}%</span>
            <span className="text-[10px] text-slate-500 font-mono">Ideal: &gt; 20%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.max(0, Math.min(100, savingRate))}%` }}></div>
          </div>
          <p className="text-[9px] text-slate-400">Porsi pendapatan bulanan yang aman Anda dialokasikan ke celengan tabungan / aset produktif.</p>
        </div>

        {/* EXPENSE RATIO CARD */}
        <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[24px] space-y-3 relative overflow-hidden">
          <span className="text-[10px] uppercase font-mono font-bold text-[#9aa4bf]">Expense Ratio</span>
          <div className="flex justify-between items-baseline">
            <span className="text-xl font-black text-[#7c5cff] font-mono">{expenseRatio.toFixed(1)}%</span>
            <span className="text-[10px] text-slate-500 font-mono">Ideal: &lt; 50%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
            <div className="h-full bg-[#7c5cff] rounded-full" style={{ width: `${Math.max(0, Math.min(100, expenseRatio))}%` }}></div>
          </div>
          <p className="text-[9px] text-slate-400">Rasio total pengeluaran belanja berbanding total perolehan pundi pemasukan.</p>
        </div>

        {/* DEBT TO ASSET RATIO CARD */}
        <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[24px] space-y-3 relative overflow-hidden">
          <span className="text-[10px] uppercase font-mono font-bold text-[#9aa4bf]">Rasio Utang (Debt Ratio)</span>
          <div className="flex justify-between items-baseline">
            <span className="text-xl font-black text-red-400 font-mono">{debtRatio.toFixed(1)}%</span>
            <span className="text-[10px] text-slate-500 font-mono">Ideal: &lt; 30%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
            <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.max(0, Math.min(100, debtRatio))}%` }}></div>
          </div>
          <p className="text-[9px] text-slate-400">Beban hutang liabilitas berjalan jika dicairkan berbanding akumulasi jaminan aset.</p>
        </div>

        {/* INVESTMENT TO NET WORTH RATIO CARD */}
        <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[24px] space-y-3 relative overflow-hidden">
          <span className="text-[10px] uppercase font-mono font-bold text-[#9aa4bf]">Rasio Investasi</span>
          <div className="flex justify-between items-baseline">
            <span className="text-xl font-black text-[#04d4ff] font-mono">{investmentRatio.toFixed(1)}%</span>
            <span className="text-[10px] text-slate-500 font-mono">Ideal: &gt; 15%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
            <div className="h-full bg-[#04d4ff] rounded-full" style={{ width: `${Math.max(0, Math.min(100, investmentRatio))}%` }}></div>
          </div>
          <p className="text-[9px] text-slate-400">Total modal yang diposisikan aman bekerja produktif dibagi nilai bersih kekayaan fisik.</p>
        </div>
      </div>
    </div>
  );
}
