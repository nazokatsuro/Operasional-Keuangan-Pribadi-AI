export interface Goal {
  id: string;
  name: string;
  category: 'Dana Darurat' | 'Beli Rumah' | 'Beli Kendaraan' | 'Liburan' | 'Modal Usaha' | 'Pendidikan' | 'Target Custom';
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  color: string; // Hex color or Tailwind accent color
}

export interface RecurringTransaction {
  id: string;
  name: string;
  nominal: number;
  category: string;
  source: string;
  frequency: 'Harian' | 'Mingguan' | 'Bulanan' | 'Tahunan';
  status: 'Aktif' | 'Pause';
}

export interface BillReminder {
  id: string;
  name: string;
  nominal: number;
  dueDate: string;
  category: string;
  reminderPeriod: 'H-7' | 'H-3' | 'H-1' | 'Hari H';
}

export interface Workspace {
  id: string;
  name: string;
  type: 'Personal' | 'Family' | 'Business' | 'Custom';
  icon: string;
}

export interface FinancialNotification {
  id: string;
  title: string;
  message: string;
  category: 'Budget Warning' | 'Goal Reminder' | 'Bill Reminder' | 'Debt Reminder' | 'Cashflow Alert' | 'AI Recommendation';
  date: string;
  isRead: boolean;
}

export interface BankStatementRecord {
  id: string;
  date: string;
  description: string;
  nominal: number;
  type: 'Pemasukan' | 'Pengeluaran';
  tempCategory: string;
  isDuplicate?: boolean;
}
