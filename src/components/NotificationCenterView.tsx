import React from 'react';
import { Bell, ShieldAlert, Sparkles, Check, CheckSquare, Trash2 } from 'lucide-react';
import { FinancialNotification } from '../types';

interface NotificationCenterViewProps {
  notifications: FinancialNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearNotifications: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Budget Warning': 'text-red-400 bg-red-500/10 border-red-500/20',
  'Goal Reminder': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'Bill Reminder': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'Debt Reminder': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  'Cashflow Alert': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  'AI Recommendation': 'text-[#7c5cff] bg-[#7c5cff]/10 border-[#7c5cff]/20',
};

export function NotificationCenterView({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClearNotifications,
}: NotificationCenterViewProps) {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-white/[0.04] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-[#7c5cff]" />
            Pusat Notifikasi Finansial <span className="text-xs bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-[#9aa4bf] font-normal font-mono">Real-time alerts</span>
          </h1>
          <p className="text-xs text-[#9aa4bf]">Dapatkan feedback instan mengenai status ketersediaan anggaran, jadwal tagihan jatuh tempo, dan peluang rekomendasi AI</p>
        </div>

        {notifications.length > 0 && (
          <div className="flex gap-2 text-xs font-mono">
            <button
              onClick={onMarkAllRead}
              className="px-3.5 py-2 bg-white/5 border border-white/12 hover:border-[#7c5cff]/30 rounded-xl hover:bg-white/10 text-white transition-all cursor-pointer flex items-center gap-1.5 font-bold"
            >
              <CheckSquare className="h-4 w-4" />
              <span>Tandai Semua Dibaca</span>
            </button>
            <button
              onClick={onClearNotifications}
              className="px-3.5 py-2 bg-red-500/10 border border-red-500/15 hover:bg-red-500/20 rounded-xl text-red-400 transition-all cursor-pointer flex items-center gap-1.5 font-bold"
            >
              <Trash2 className="h-4 w-4" />
              <span>Bersihkan</span>
            </button>
          </div>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white/[0.01] border border-white/[0.04] rounded-[28px] p-12 text-center space-y-3">
          <div className="text-4xl">🔔</div>
          <h3 className="text-sm font-bold text-white">Tidak Ada Kotak Masuk</h3>
          <p className="text-xs text-[#9aa4bf] max-w-sm mx-auto">Kotak pemberitahuan Anda bersih dari hambatan keuangan. Hebat sekali!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div 
              key={n.id} 
              className={`p-4.5 rounded-2xl border flex items-start justify-between gap-4 transition-all ${
                n.isRead 
                  ? 'bg-white/[0.01] border-white/[0.04] opacity-60' 
                  : 'bg-gradient-to-r from-white/[0.03] to-white/[0.01] border-white/[0.08] hover:border-[#7c5cff]/30 shadow-lg'
              }`}
            >
              <div className="flex gap-3.5">
                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border shrink-0 font-mono self-start ${CATEGORY_COLORS[n.category] || 'bg-white/5 border-white/10'}`}>
                  {n.category}
                </span>

                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-white leading-relaxed">{n.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                  <span className="text-[9px] text-[#9aa4bf] font-mono block pt-1">{n.date}</span>
                </div>
              </div>

              {!n.isRead && (
                <button
                  onClick={() => onMarkRead(n.id)}
                  className="p-1.5 bg-[#7c5cff]/10 hover:bg-[#7c5cff]/20 text-[#7c5cff] rounded-lg border border-[#7c5cff]/20 transition-all cursor-pointer inline-flex items-center"
                  title="Mark as read"
                >
                  <Check className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
