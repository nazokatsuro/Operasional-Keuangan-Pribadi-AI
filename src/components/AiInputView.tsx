/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, ArrowRight, CornerDownLeft, Info, HelpCircle, 
  Check, Play, FileText, CheckCircle2, Trash2, ListChecks, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import { parseFinanceText, ParsedTransaction } from '../utils/aiParser';
import { Account, formatCurrency } from '../utils/financeHelper';

interface AiInputViewProps {
  accounts: Account[];
  onCommitTransaction: (tx: ParsedTransaction) => void;
  compact?: boolean;
}

export function AiInputView({ accounts, onCommitTransaction, compact }: AiInputViewProps) {
  // Multiline state handling
  const [inputText, setInputText] = useState('');
  const [parsedList, setParsedList] = useState<Array<ParsedTransaction & { rawText: string; id: number }>>([]);
  const [showAnimation, setShowAnimation] = useState(false);
  const [committedCount, setCommittedCount] = useState(0);

  // Quick multi-line templates 
  const examplesBulk = [
    {
      label: '🚀 Demo Cetak Bulk (Makan + Gaji + Langganan)',
      text: 'makan bakso 25rb jago\ngaji 7.5jt bca\nspotify 55rb dana'
    },
    {
      label: '🛒 Skenario Belanja Bulanan',
      text: 'belanja baju 150rb cash\ntopup gopay 100rb bca\nngopi starbucks 65rb mandiri'
    },
    {
      label: '💸 Skenario Dana Masuk & Tagihan',
      text: 'bonus thr 3.2jt bca\nlistrik token 200rb jago\nair pdam 45rb cash'
    }
  ];

  // Individual single chips
  const examplesSingle = [
    { text: 'mkn bakso 25rb dana', label: 'Bakso' },
    { text: 'gaji 5jt bca', label: 'Gaji' },
    { text: 'spotify 55rb jago', label: 'Spotify' },
    { text: 'topup dana 100k jago', label: 'E-Wallet' },
    { text: 'ngopi 28rb cash', label: 'Ngopi' }
  ];

  useEffect(() => {
    if (!inputText) {
      setParsedList([]);
      return;
    }

    // Split input text by newlines and filter out blank lines
    const lines = inputText.split('\n');
    const parsedItems = lines.map((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return null;
      
      const parsedItem = parseFinanceText(trimmedLine);
      return {
        ...parsedItem,
        rawText: trimmedLine,
        id: index
      };
    }).filter(item => item !== null) as Array<ParsedTransaction & { rawText: string; id: number }>;

    setParsedList(parsedItems);
  }, [inputText]);

  const handleApplyTemplate = (text: string) => {
    setInputText(text);
  };

  const handleClear = () => {
    setInputText('');
    setParsedList([]);
  };

  const handleCommitAll = () => {
    const validItems = parsedList.filter(item => item.nominal > 0);
    if (validItems.length === 0) return;

    // Loop through each valid financial transaction and append to user transactions
    validItems.forEach((tx) => {
      onCommitTransaction(tx);
    });

    setCommittedCount(validItems.length);
    setInputText('');
    setParsedList([]);
    setShowAnimation(true);
    
    setTimeout(() => {
      setShowAnimation(false);
    }, 4000);
  };

  // Remove a single line from the multi-line input string
  const handleRemoveLine = (indexToRemove: number) => {
    const lines = inputText.split('\n');
    const cleanedLines = lines.filter((_, idx) => idx !== indexToRemove);
    setInputText(cleanedLines.join('\n'));
  };

  const totalValidNominal = parsedList
    .filter(item => item.nominal > 0)
    .reduce((sum, item) => sum + (item.type === 'Pemasukan' ? item.nominal : -item.nominal), 0);

  return (
    <div className="space-y-6">
      {/* HEADER HERO AREA */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-[#7c5cff] animate-pulse" /> AI Smart Multi-Input Parser
        </h1>
        <p className="text-xs text-[#9aa4bf]">
          Masukkan beberapa baris transaksi sekaligus. AI lokal akan menerjemahkan nominal, kategori, tipe, dan sumber dana secara otomatis secara real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: MULTILINE TEXTAREA INPUT */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white/[0.02] border border-white/[0.06] p-5 rounded-[22px] shadow-xl relative flex flex-col h-full justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-[#7c5cff]" /> Input Masa (Multi-Baris)
                </label>
                <div className="flex gap-2">
                  <button 
                    onClick={handleClear}
                    disabled={!inputText}
                    className="text-[10px] text-[#ff5c7a] bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-lg font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Kosongkan
                  </button>
                  <span className="text-[10px] font-mono bg-[#7c5cff]/10 text-[#7c5cff] px-2 py-1 rounded-lg font-bold">
                    Local Real-time
                  </span>
                </div>
              </div>

              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={10}
                placeholder="Tuliskan transaksi per baris, contoh:&#10;makan bakso 25rb jago&#10;gaji bulanan 7.5jt bca&#10;spotify premium 55rb dana"
                className="w-full mt-2 p-4 bg-[#080d1e] text-xs sm:text-sm text-slate-100 font-mono rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff] leading-relaxed resize-none"
              />

              <div className="flex gap-2 items-start mt-3 text-[10px] text-[#9aa4bf] bg-white/[0.02] p-3 rounded-xl border border-white/5">
                <Info className="h-4 w-4 text-[#00d4ff] shrink-0 mt-0.5" />
                <span>
                  Satu baris mewakili satu transaksi. Contoh: <strong className="text-white">"makan bakso 25rb jago"</strong> dibaca Makan, Rp 25.000, tipe Pengeluaran, akun Bank Jago.
                </span>
              </div>
            </div>

            {/* QUICK MULTI-LINE SCENARIOS */}
            <div className="space-y-2 mt-4 pt-4 border-t border-white/[0.04]">
              <h4 className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono mb-2">Template Skenario Beruntun (Bulk)</h4>
              <div className="grid grid-cols-1 gap-2">
                {examplesBulk.map((ex, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleApplyTemplate(ex.text)}
                    className="p-2.5 text-left text-[11px] text-slate-300 bg-white/[0.03] hover:text-white hover:bg-white/[0.07] border border-white/5 rounded-xl transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <span className="font-bold">{ex.label}</span>
                    <span className="text-[9px] text-[#00d4ff] font-mono group-hover:translate-x-1 transition-transform">Gunakan &rarr;</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REAL-TIME PARSED SUMMARY & OPERATIONS LIST */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[#0e1329]/40 border border-white/[0.06] rounded-[24px] p-5 shadow-2xl relative flex flex-col h-full justify-between">
            <div>
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4.5 w-4.5 text-[#00d4ff]" />
                  <span className="text-xs uppercase font-extrabold tracking-wider text-white">Hasil Parsing Detektor ({parsedList.length} Baris)</span>
                </div>
                {parsedList.length > 0 && (
                  <span className="text-[10px] font-mono bg-white/[0.04] px-2 py-0.5 rounded text-amber-300">
                    Net: {totalValidNominal >= 0 ? '+' : ''}{formatCurrency(totalValidNominal)}
                  </span>
                )}
              </div>

              {parsedList.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <HelpCircle className="h-10 w-10 text-slate-600 mb-2.5 animate-pulse" />
                  <h3 className="text-xs font-bold text-[#9aa4bf] uppercase tracking-wider font-mono">Menunggu Input Anda</h3>
                  <p className="text-[11px] text-[#9aa4bf] mt-1 max-w-[240px]">
                    Ketik transaksi Anda di kolom sebelah kiri atau pilih satu skenario demo untuk melihat keajaiban parser AI local harian.
                  </p>
                  
                  {/* Single Line Quick Helpers */}
                  <div className="mt-6 flex flex-wrap gap-1.5 justify-center max-w-sm">
                    {examplesSingle.map((single, id) => (
                      <button
                        key={id}
                        onClick={() => handleApplyTemplate(single.text)}
                        className="px-2.5 py-1 text-[10px] text-[#9aa4bf] bg-white/[0.02] border border-white/5 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Play className="h-2 w-2 text-violet-400" />
                        <span>{single.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {parsedList.map((item, idx) => {
                    const isError = item.nominal <= 0;
                    return (
                      <div 
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isError 
                            ? 'bg-red-500/5 border-red-500/10 opacity-70' 
                            : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          {/* Indicator dot */}
                          <div className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                            isError ? 'bg-red-400' : item.type === 'Pemasukan' ? 'bg-[#16c784]' : 'bg-[#7c5cff]'
                          }`} />
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {item.type === 'Pemasukan' ? (
                                <ArrowUpRight className="h-3 w-3 text-[#16c784] shrink-0" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3 text-red-400 shrink-0" />
                              )}
                              <span className="text-[11px] font-extrabold text-white truncate">{item.title}</span>
                            </div>
                            <p className="text-[10px] text-[#9aa4bf] truncate mt-0.5">
                              Asal: <span className="text-white font-mono">{item.source}</span> • Kategori: {item.category}
                            </p>
                            <p className="text-[9px] text-[#556080] font-mono italic truncate mt-0.5">
                              "{item.rawText}"
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 ml-4">
                          <div className="text-right">
                            {isError ? (
                              <span className="text-[10px] text-red-400 font-mono">Gagal membaca nominal</span>
                            ) : (
                              <p className={`text-xs font-black font-mono ${
                                item.type === 'Pemasukan' ? 'text-[#16c784]' : 'text-white'
                              }`}>
                                {item.type === 'Pemasukan' ? '+' : '-'}{formatCurrency(item.nominal)}
                              </p>
                            )}
                          </div>
                          
                          <button 
                            onClick={() => handleRemoveLine(item.id)}
                            className="text-slate-500 hover:text-[#ff5c7a] p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                            title="Hapus baris ini"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ACTION BUTTON TO COMMIT BULK */}
            {parsedList.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/[0.05]">
                <button
                  onClick={handleCommitAll}
                  disabled={parsedList.filter(p => p.nominal > 0).length === 0}
                  className="w-full py-3.5 rounded-xl bg-[#7c5cff] hover:bg-[#6847ff] disabled:bg-white/5 disabled:text-slate-600 disabled:cursor-not-allowed hover:shadow-[0_0_25px_rgba(124,92,255,0.4)] text-white font-extrabold text-xs active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-4.5 w-4.5 text-white" />
                  <span>Simpan Semua ({parsedList.filter(p => p.nominal > 0).length} Transaksi Valid) &rarr;</span>
                </button>
              </div>
            )}
          </div>

          {/* Toast/Success Popover Feedbacks */}
          {showAnimation && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-[#16c784]/20 flex items-center gap-3 animate-bounce">
              <CheckCircle2 className="h-6 w-6 text-[#16c784] shrink-0" />
              <div>
                <h4 className="text-xs font-black text-white">Berhasil Dibukukan!</h4>
                <p className="text-[10px] text-[#9aa4bf]">
                  Sebanyak <strong>{committedCount} transaksi</strong> berhasil diproses, dialokasikan pos mutasinya secara instant ke saldo akun finansial Anda.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
