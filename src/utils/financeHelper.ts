/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Transaction {
  id: string;
  title: string;
  nominal: number;
  type: 'Pemasukan' | 'Pengeluaran';
  category: string;
  source: string;
  date: string;
  note?: string;
  attachment?: string; // Data URI mock for attachment slip
  isRecurring?: boolean;
  recurringPeriod?: 'Harian' | 'Mingguan' | 'Bulanan';
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  color: string; // Tailwind bg gradient class
  textColor: string;
  iconName: string;
  accountNumber?: string;
  initialBalance?: number; // Starting balance of the account
}

export interface Asset {
  id: string;
  name: string;
  code: string;
  category: 'Crypto' | 'Gold' | 'Saham' | 'MutualFund' | 'Forex' | 'Properti';
  units: number;
  buyPrice: number;
  marketPrice: number;
  logo: string;
}

export interface Debt {
  id: string;
  personName: string;
  type: 'Hutang' | 'Piutang'; // Hutang = Kita pinjam ke orang. Piutang = Orang pinjam ke kita.
  nominal: number;
  paidNominal: number;
  dueDate: string;
  reminderStatus: boolean;
  installmentsCount: number;
  notes?: string;
}

export interface FinancialHealth {
  score: number;
  status: 'Sangat Sehat' | 'Sehat' | 'Cukup Sehat' | 'Kurang Sehat' | 'Kritis';
  savingsRate: number; // as % of income
  debtRatio: number; // debt payment to income %
  emergencyFundRatio: number; // months covered
}

// 1. DEFAULT ACCOUNTS (Fintech Credit Card style colors & presets)
export const DEFAULT_ACCOUNTS: Account[] = [
  { id: '1', name: 'BCA', balance: 18250000, color: 'from-blue-600 to-blue-900', textColor: '#ffffff', iconName: 'CreditCard', accountNumber: '•••• 8421', initialBalance: 1255000 },
  { id: '2', name: 'Mandiri', balance: 9400000, color: 'from-amber-600 to-amber-900', textColor: '#ffffff', iconName: 'TrendingUp', accountNumber: '•••• 5022', initialBalance: 6900000 },
  { id: '3', name: 'BNI', balance: 3500000, color: 'from-orange-500 to-orange-800', textColor: '#ffffff', iconName: 'Award', accountNumber: '•••• 1982', initialBalance: 3500000 },
  { id: '4', name: 'BRI', balance: 2500000, color: 'from-blue-500 to-blue-700', textColor: '#ffffff', iconName: 'ShieldCheck', accountNumber: '•••• 3091', initialBalance: 2500000 },
  { id: '5', name: 'Seabank', balance: 14700000, color: 'from-orange-600 to-red-600', textColor: '#ffffff', iconName: 'Zap', accountNumber: '•••• 9901', initialBalance: 14950000 },
  { id: '6', name: 'Jago', balance: 5200000, color: 'from-yellow-400 to-yellow-600', textColor: '#1e293b', iconName: 'Smartphone', accountNumber: '•••• 1121', initialBalance: 6736000 },
  { id: '7', name: 'Dana', balance: 1350000, color: 'from-sky-400 to-blue-600', textColor: '#ffffff', iconName: 'Wallet', accountNumber: '0812-••••-8822', initialBalance: 1375000 },
  { id: '8', name: 'OVO', balance: 550000, color: 'from-purple-600 to-indigo-900', textColor: '#ffffff', iconName: 'Sparkles', accountNumber: '0812-••••-5061', initialBalance: 598000 },
  { id: '9', name: 'GoPay', balance: 2100000, color: 'from-emerald-500 to-teal-800', textColor: '#ffffff', iconName: 'Send', accountNumber: '0812-••••-4992', initialBalance: 2369000 },
  { id: '10', name: 'ShopeePay', balance: 750000, color: 'from-orange-500 to-red-500', textColor: '#ffffff', iconName: 'ShoppingBag', accountNumber: '0821-••••-9041', initialBalance: 750000 },
  { id: '11', name: 'Cash', balance: 950000, color: 'from-neutral-600 to-neutral-900', textColor: '#ffffff', iconName: 'DollarSign', accountNumber: 'Dompet Fisik', initialBalance: 1263000 },
];

// 2. DEFAULT CATEGORIES WITH RELEVANT GRADIENTS/COLORS
export const INCOME_CATEGORIES = [
  { name: 'Gaji', color: '#16c784', icon: 'Briefcase' },
  { name: 'Freelance', color: '#00d4ff', icon: 'Code' },
  { name: 'Bonus', color: '#ffb547', icon: 'Gift' },
  { name: 'Investasi', color: '#7c5cff', icon: 'TrendingUp' },
  { name: 'Penjualan', color: '#ff5c7a', icon: 'ShoppingBag' },
  { name: 'Gift', color: '#f59e0b', icon: 'Award' },
  { name: 'Refund', color: '#10b981', icon: 'RotateCcw' },
  { name: 'Pinjaman', color: '#ffd700', icon: 'Handshake' },
  { name: 'Meminjam', color: '#ffd700', icon: 'Handshake' },
  { name: 'Lainnya Pemasukan', color: '#64748b', icon: 'CircleEllipsis' },
];

export const EXPENSE_CATEGORIES = [
  { name: 'Makan', color: '#ff5c7a', icon: 'Utensils' },
  { name: 'Transport', color: '#ffb547', icon: 'Car' },
  { name: 'Belanja', color: '#00d4ff', icon: 'ShoppingBag' },
  { name: 'Internet', color: '#7c5cff', icon: 'Wifi' },
  { name: 'Listrik', color: '#ec4899', icon: 'Zap' },
  { name: 'Air', color: '#3b82f6', icon: 'Droplet' },
  { name: 'Langganan', color: '#10b981', icon: 'Tv' },
  { name: 'Hiburan', color: '#f43f5e', icon: 'Gamepad2' },
  { name: 'Kesehatan', color: '#06b6d4', icon: 'HeartPulse' },
  { name: 'Top Up', color: '#a855f7', icon: 'ArrowUpRight' },
  { name: 'Pendidikan', color: '#eab308', icon: 'GraduationCap' },
  { name: 'Pajak', color: '#ef4444', icon: 'FileText' },
  { name: 'Produksi', color: '#e066ff', icon: 'Scissors' },
  { name: 'Logistik', color: '#ff8c00', icon: 'Truck' },
  { name: 'Marketing', color: '#ff1493', icon: 'Megaphone' },
  { name: 'Pinjaman', color: '#ffd700', icon: 'Handshake' },
  { name: 'Meminjam', color: '#ffd700', icon: 'Handshake' },
  { name: 'Lainnya', color: '#94a3b8', icon: 'CircleEllipsis' },
];

// 3. DEFAULT PRE-POPULATED ASSETS & CORE SPECIFICATIONS
export const DEFAULT_ASSETS: Asset[] = [
  { id: 'a1', name: 'Bitcoin', code: 'BTC', category: 'Crypto', units: 0.1245, buyPrice: 940000000, marketPrice: 1450000000, logo: '₿' },
  { id: 'a2', name: 'Ethereum', code: 'ETH', category: 'Crypto', units: 1.84, buyPrice: 42000000, marketPrice: 58000000, logo: 'Ξ' },
  { id: 'a3', name: 'Solana', code: 'SOL', category: 'Crypto', units: 15.2, buyPrice: 1800000, marketPrice: 2850000, logo: '◎' },
  { id: 'a4', name: 'Emas (Logam Mulia)', code: 'GOLD', category: 'Gold', units: 25, buyPrice: 1150000, marketPrice: 1475000, logo: 'Au' },
  { id: 'a5', name: 'Saham BBCA', code: 'BBCA.JK', category: 'Saham', units: 2500, buyPrice: 8900, marketPrice: 10450, logo: '🏦' },
  { id: 'a6', name: 'Reksa Dana Saham', code: 'RDS-PRIMA', category: 'MutualFund', units: 12400.5, buyPrice: 1500, marketPrice: 1920, logo: '📈' },
  { id: 'a7', name: 'US Dollar', code: 'USD', category: 'Forex', units: 850, buyPrice: 15200, marketPrice: 16180, logo: '$' },
  { id: 'a8', name: 'Apartemen Jakarta', code: 'APT-JKT', category: 'Properti', units: 1, buyPrice: 240000000, marketPrice: 295000000, logo: '🏢' },
];

// 4. DEFAULT PRE-POPULATED DEBTS
export const DEFAULT_DEBTS: Debt[] = [
  { id: 'd1', personName: 'Andi Pratama', type: 'Piutang', nominal: 3500000, paidNominal: 1000000, dueDate: '2026-06-15', reminderStatus: true, installmentsCount: 3, notes: 'Pinjam untuk biaya service laptop, cicil bca' },
  { id: 'd2', personName: 'Aditya Wijaya', type: 'Hutang', nominal: 1800000, paidNominal: 1800000, dueDate: '2026-05-20', reminderStatus: false, installmentsCount: 1, notes: 'Beli barang patungan hobi di Seabank' },
  { id: 'd3', personName: 'Sinta Devina', type: 'Piutang', nominal: 1200000, paidNominal: 0, dueDate: '2026-06-30', reminderStatus: true, installmentsCount: 1, notes: 'Sewa kamera mirrorless akhir pekan' },
  { id: 'd4', personName: 'Rian Hidayat', type: 'Hutang', nominal: 5000000, paidNominal: 2500000, dueDate: '2026-07-10', reminderStatus: true, installmentsCount: 2, notes: 'Pinjam modal renovasi dapur kecil' }
];

// 5. PREMIUM PRE-POPULATED FINTECH TRANSACTIONS FOR BEAUTIFUL DASHBAORD DATA ON FIRST LOAD
export const DEFAULT_TRANSACTIONS: Transaction[] = [
  { id: 't1', title: 'Gaji Bulanan Utama', nominal: 15000000, type: 'Pemasukan', category: 'Gaji', source: 'BCA', date: '2026-05-01', note: 'Gaji pokok bulanan PT Indo Tech' },
  { id: 't2', title: 'Sampingan Web Project', nominal: 4500000, type: 'Pemasukan', category: 'Freelance', source: 'Mandiri', date: '2026-05-05', note: 'Landing page designer team' },
  { id: 't3', title: 'Makan Bakso Lapangan', nominal: 25000, type: 'Pengeluaran', category: 'Makan', source: 'Dana', date: '2026-05-05', note: 'Bakso urat + es jeruk double' },
  { id: 't4', title: 'Beli Sepatu Sneakers', nominal: 1350000, type: 'Pengeluaran', category: 'Belanja', source: 'Jago', date: '2026-05-08', note: 'Beli Adidas Samba original' },
  { id: 't5', title: 'Bensin Pertamax Full', nominal: 250000, type: 'Pengeluaran', category: 'Transport', source: 'Cash', date: '2026-05-10', note: 'Mobil Harian' },
  { id: 't6', title: 'Spotify Premium Family', nominal: 89000, type: 'Pengeluaran', category: 'Langganan', source: 'GoPay', date: '2026-05-12', note: 'Autopay Bulanan', isRecurring: true, recurringPeriod: 'Bulanan' },
  { id: 't7', title: 'Netflix Ultra HD', nominal: 186000, type: 'Pengeluaran', category: 'Langganan', source: 'Jago', date: '2026-05-15', note: 'Paket 4K Layar', isRecurring: true, recurringPeriod: 'Bulanan' },
  { id: 't8', title: 'Bonus Penjualan Sampingan', nominal: 1250000, type: 'Pemasukan', category: 'Bonus', source: 'Seabank', date: '2026-05-16', note: 'Komisi affiliate' },
  { id: 't9', title: 'Ngopi Senja Kopi', nominal: 48000, type: 'Pengeluaran', category: 'Makan', source: 'OVO', date: '2026-05-18', note: 'V60 Gayo + Croissant' },
  { id: 't10', title: 'Makan Malam Sushi Roll', nominal: 320000, type: 'Pengeluaran', category: 'Makan', source: 'BCA', date: '2026-05-20', note: 'Traktir temen ulang tahun' },
  { id: 't11', title: 'Wifi Indihome Bulanan', nominal: 385000, type: 'Pengeluaran', category: 'Internet', source: 'BCA', date: '2026-05-22', note: 'Paket Home 50mbps' },
  { id: 't12', title: 'Investasi Saham Rutin', nominal: 2000000, type: 'Pengeluaran', category: 'Investasi', source: 'Mandiri', date: '2026-05-23', note: 'BBCA DCA' },
  { id: 't13', title: 'Makan Siang Narkop', nominal: 35000, type: 'Pengeluaran', category: 'Makan', source: 'Cash', date: '2026-05-24', note: 'Nasi Rames + Es Teh' },
  { id: 't14', title: 'Token Listrik Pintar', nominal: 500000, type: 'Pengeluaran', category: 'Listrik', source: 'Seabank', date: '2026-05-25', note: 'Beli PLN prabayar' },
  { id: 't15', title: 'Grab Car Bandara', nominal: 180000, type: 'Pengeluaran', category: 'Transport', source: 'GoPay', date: '2026-05-26', note: 'Mudik Akhir Pekan' },
  { id: 't16', title: 'Penjualan Hp Bekas', nominal: 2700000, type: 'Pemasukan', category: 'Penjualan', source: 'BCA', date: '2026-05-27', note: 'Infinix Note series laku COD' },
  { id: 't17', title: 'Makan Sate Madura', nominal: 28000, type: 'Pengeluaran', category: 'Makan', source: 'Cash', date: '2026-05-28', note: 'Sate ayam bumbu kacang' },
  { id: 't18', title: 'Top-up Dana Emergency', nominal: 1000000, type: 'Pengeluaran', category: 'Top Up', source: 'Seabank', date: '2026-05-28', note: 'Dana cadangan jajan' },
];

/**
 * Returns formatted Currency (IDR)
 */
export function formatCurrency(value: number, currency: string = 'IDR'): string {
  if (value === undefined || isNaN(value)) return 'Rp 0';
  
  if (currency === 'IDR') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } else if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  } else {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(value);
  }
}

/**
 * Calculates financial health dynamically
 */
export function calculateFinancialHealth(
  transactions: Transaction[],
  debts: Debt[],
  accounts: Account[]
): FinancialHealth {
  // Compute total monthly income
  const totalIncome = transactions
    .filter(t => t.type === 'Pemasukan')
    .reduce((sum, t) => sum + t.nominal, 0);

  // Compute total monthly expenses  
  const totalExpense = transactions
    .filter(t => t.type === 'Pengeluaran')
    .reduce((sum, t) => sum + t.nominal, 0);

  // Compute actual total liquid net balance
  const totalLiquid = accounts.reduce((sum, a) => sum + a.balance, 0);

  // Compute open debt liability
  const totalDebt = debts
    .filter(d => d.type === 'Hutang')
    .reduce((sum, d) => sum + (d.nominal - d.paidNominal), 0);

  // Emergency Fund Ratio = liquid funds / monthly average expense (assumed 4M if expenses are 0)
  const averageMonthlyExpense = totalExpense || 4000000;
  const emergencyFundMultiplier = Math.round((totalLiquid / averageMonthlyExpense) * 10) / 10;

  // Savings rate percentage
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  // Debt ratio (total remaining debt liability mapped to income)
  const debtRatio = totalIncome > 0 ? Math.round((totalDebt / totalIncome) * 100) : 0;

  // Calculate customized score from various parameters
  // Initial basis: 60 points
  let score = 60;

  // Modifiers:
  if (savingsRate > 30) score += 15;
  else if (savingsRate > 10) score += 5;
  else if (savingsRate < 0) score -= 15; // bleeding money

  if (emergencyFundMultiplier >= 6) score += 15; // 6 months+ buffer
  else if (emergencyFundMultiplier >= 3) score += 8;
  else if (emergencyFundMultiplier < 1) score -= 10; // thin ice

  if (debtRatio === 0) score += 10;
  else if (debtRatio > 50) score -= 15; // heavily leveraged
  else if (debtRatio > 30) score -= 5;

  // Bound score
  score = Math.max(10, Math.min(100, score));

  // Category status map
  let status: FinancialHealth['status'] = 'Cukup Sehat';
  if (score >= 85) status = 'Sangat Sehat';
  else if (score >= 70) status = 'Sehat';
  else if (score >= 50) status = 'Cukup Sehat';
  else if (score >= 30) status = 'Kurang Sehat';
  else status = 'Kritis';

  return {
    score,
    status,
    savingsRate,
    debtRatio,
    emergencyFundRatio: emergencyFundMultiplier,
  };
}

/**
 * Returns formatted localized day names & date elements
 */
export function getFriendlyGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat Pagi';
  if (hour < 15) return 'Selamat Siang';
  if (hour < 19) return 'Selamat Sore';
  return 'Selamat Malam';
}
