/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, ArrowRight, CornerDownLeft, Info, HelpCircle, 
  Check, Play, FileText, CheckCircle2, Trash2, ListChecks, ArrowDownRight, ArrowUpRight,
  AlertTriangle, RefreshCw
} from 'lucide-react';
import { parseFinanceText, ParsedTransaction, preprocessInputToLines } from '../utils/aiParser';
import { Account, formatCurrency } from '../utils/financeHelper';

interface AiInputViewProps {
  accounts: Account[];
  onCommitTransaction: (tx: ParsedTransaction) => void;
  compact?: boolean;
  geminiOnline?: boolean;
}

export function AiInputView({ accounts, onCommitTransaction, compact, geminiOnline: propGeminiOnline }: AiInputViewProps) {
  // Multiline state handling
  const [inputText, setInputText] = useState('');
  const [parsedList, setParsedList] = useState<Array<ParsedTransaction & { rawText: string; id: number }>>([]);
  const [showAnimation, setShowAnimation] = useState(false);
  const [committedCount, setCommittedCount] = useState(0);

  // Dynamic engine state: 'gemini' as the default/primary mode, 'local' as backup
  const [engine, setEngine] = useState<'gemini' | 'local'>('gemini');
  const [geminiOnline, setGeminiOnline] = useState<boolean>(() => {
    return propGeminiOnline !== undefined ? propGeminiOnline : true;
  });
  const [autoFallback, setAutoFallback] = useState<boolean>(() => {
    const saved = localStorage.getItem('LKP_AI_AUTOFALLBACK');
    return saved !== null ? saved === 'true' : true;
  });
  const [isGptParsing, setIsGptParsing] = useState(false);
  const [gptError, setGptError] = useState<string | null>(null);

  // Sync propGeminiOnline changes to local state
  useEffect(() => {
    if (propGeminiOnline !== undefined) {
      setGeminiOnline(propGeminiOnline);
      if (!propGeminiOnline && autoFallback) {
        setEngine('local');
      }
    }
  }, [propGeminiOnline, autoFallback]);

  // Fetch initial API status on mount
  useEffect(() => {
    const checkGeminiConfig = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          const data = await response.json();
          if (data.geminiConfigured === false) {
            console.warn('[AI] Gemini API Key has not been configured on the server yet.');
            setGeminiOnline(false);
            if (autoFallback) {
              setEngine('local');
            }
          } else {
            setGeminiOnline(true);
          }
        }
      } catch (err) {
        console.error('[AI] Health probe check failed:', err);
      }
    };
    if (propGeminiOnline === undefined) {
      checkGeminiConfig();
    }
  }, [autoFallback, propGeminiOnline]);

  const handleAutoFallbackChange = (checked: boolean) => {
    setAutoFallback(checked);
    localStorage.setItem('LKP_AI_AUTOFALLBACK', String(checked));
  };

  // In-memory clarification overrides
  const [clarificationOverrides, setClarificationOverrides] = useState<Record<number, Partial<ParsedTransaction>>>({});

  // Reset overrides when input changes to prevent mismatch index leakage
  useEffect(() => {
    setClarificationOverrides({});
  }, [inputText]);

  // Quick multi-line templates 
  const examplesBulk = [
    {
      label: '👕 Skenario Garmen & Apparel (Produksi + Logistik + Penjualan)',
      text: 'beli kain bahan jersey 2,5jt bca\ndp pelanggan jahit 1.5jt bca\nongkir kirim paket j&t 50rb dana\niklan fb ads baju olahraga 350k spay'
    },
    {
      label: '⚡ Skenario Multi-Transaksi Satu Baris (Slang & Waktu)',
      text: 'kemarin sore saya isi bensin 100rb, makan 25rb, sama bayar parkir/toll 15rb cash'
    },
    {
      label: '🛒 Skenario Belanja Bulanan & Slang Sehari-hari',
      text: 'ngopi starbucks 65rb mandiri\ntopup saldo gopay 150rb bca\nbayar listriik token prabayar 200k dana'
    }
  ];

  // Individual single chips
  const examplesSingle = [
    { text: 'mkn bakso 25rb jago', label: 'Bakso' },
    { text: 'kemarin beli kain jersey 1.2jt bca', label: 'Beli Kain' },
    { text: 'order masuk dropship 350k dana', label: 'Orderan' },
    { text: 'tok listrik pln prabayar 200rb', label: 'Token Listrik' },
    { text: 'ongkir ekspedisi sicepat 22rb cash', label: 'Ongkir Paket' }
  ];

  // Reset parsed list when text input becomes empty
  useEffect(() => {
    if (!inputText) {
      setParsedList([]);
    }
  }, [inputText]);

  // Fallback Local Parser executes instantly and robustly in-browser
  const handleLocalParseDirectly = (textToParse: string) => {
    if (!textToParse.trim()) return;
    const lines = preprocessInputToLines(textToParse);
    const parsedItems = lines.map((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return null;
      
      const parsedItem = parseFinanceText(trimmedLine);
      const overrides = clarificationOverrides[index] || {};

      return {
        ...parsedItem,
        ...overrides,
        rawText: trimmedLine,
        needClarification: overrides.needClarification !== undefined ? overrides.needClarification : parsedItem.needClarification,
        id: index
      };
    }).filter(item => item !== null) as Array<ParsedTransaction & { rawText: string; id: number }>;

    setParsedList(parsedItems);

    const isTried = localStorage.getItem('LKP_AI_SMART_TRIED') === 'true';
    if (!isTried) {
      localStorage.setItem('LKP_AI_SMART_TRIED', 'true');
      window.dispatchEvent(new Event('storage'));
    }
  };

  // Server-side ChatGPT cloud parser for batch/paragraph input texts
  const handleChatGptParse = async () => {
    if (!inputText.trim()) return;
    setIsGptParsing(true);
    setGptError(null);
    setParsedList([]);

    const requestUrl = '/api/ai-parse-bulk';
    console.log(`[AI-FETCH] Calling URL: ${requestUrl} with body:`, { text: inputText });

    try {
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      const statusCode = response.status;
      const contentType = response.headers.get('content-type');
      console.log(`[AI-RESPONSE] URL: ${requestUrl}, Status: ${statusCode}, Content-Type: ${contentType}`);

      const rawText = await response.text();
      console.log(`[AI-RESPONSE-BODY] URL: ${requestUrl}, Raw Body:`, rawText);

      // Validate status code
      if (!response.ok) {
        setGeminiOnline(false);
        try {
          const parsedErr = JSON.parse(rawText);
          const errorMsg = parsedErr.message || parsedErr.error || `API Error: ${statusCode}`;
          throw new Error(errorMsg);
        } catch {
          throw new Error(`API Error: ${statusCode}`);
        }
      }

      // Check content-type
      if (!contentType?.includes('application/json')) {
        setGeminiOnline(false);
        throw new Error('Server tidak mengembalikan JSON valid');
      }

      let result;
      try {
        result = JSON.parse(rawText);
      } catch (jsonErr: any) {
        setGeminiOnline(false);
        console.error(`[AI-PARSE-ERROR] Gagal mengurai JSON respon: ${jsonErr.message}`);
        throw new Error(`Gagal melakukan parsing JSON dari server (Status: ${statusCode}): ${jsonErr.message}`);
      }

      if (result.success && result.data && Array.isArray(result.data.transactions)) {
        const transactions = result.data.transactions;
        const mappedList = transactions.map((item: any, index: number) => {
          const matchedType = item.tipe && item.tipe.toLowerCase() === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran';
          
          // Match category safely with standard lists or fallback
          let matchedCategory = 'Lainnya';
          if (item.kategori) {
            const catLower = item.kategori.toLowerCase();
            const categoriesList = matchedType === 'Pemasukan' 
              ? ['Gaji', 'Freelance', 'Bonus', 'Investasi', 'Penjualan', 'Refund', 'Lainnya Pemasukan']
              : ['Makan', 'Transport', 'Belanja', 'Internet', 'Listrik', 'Air', 'Langganan', 'Hiburan', 'Kesehatan', 'Top Up', 'Pendidikan', 'Pajak', 'Produksi', 'Logistik', 'Marketing', 'Pinjaman', 'Lainnya'];
            const match = categoriesList.find(c => c.toLowerCase() === catLower);
            if (match) {
              matchedCategory = match;
            } else {
              matchedCategory = matchedType === 'Pemasukan' ? 'Lainnya Pemasukan' : 'Lainnya';
            }
          }

          // Match wallet/source safely or set fallback to Cash or first available account
          let matchedSource = accounts[0]?.name || 'Cash';
          if (item.wallet) {
            const walletLower = item.wallet.toLowerCase();
            const match = accounts.find(a => a.name.toLowerCase() === walletLower);
            if (match) {
              matchedSource = match.name;
            }
          }

          return {
            type: matchedType,
            nominal: item.nominal || 0,
            category: matchedCategory,
            source: matchedSource,
            title: item.deskripsi || item.rawText || 'Transaksi parsed',
            date: new Date().toISOString().split('T')[0], // current date
            rawText: item.rawText || '',
            needClarification: false,
            id: index
          };
        });
        setParsedList(mappedList);
        setGeminiOnline(true);
        
        // Also register smart tried flag
        const isTried = localStorage.getItem('LKP_AI_SMART_TRIED') === 'true';
        if (!isTried) {
          localStorage.setItem('LKP_AI_SMART_TRIED', 'true');
          // Dispatches a state update to trigger Navbar sync
          window.dispatchEvent(new Event('storage'));
        }
      } else {
        setGeminiOnline(false);
        setGptError(result.message || result.error || 'Gagal memproses kalimat menggunakan Gemini.');
        if (autoFallback) {
          setEngine('local');
          handleLocalParseDirectly(inputText);
        }
      }
    } catch (e: any) {
      setGeminiOnline(false);
      setGptError('Gagal menghubungi server Gemini: ' + e.message);
      if (autoFallback) {
        setEngine('local');
        handleLocalParseDirectly(inputText);
      }
    } finally {
      setIsGptParsing(false);
    }
  };

  const handleApplyTemplate = (text: string) => {
    setInputText(text);
  };

  const handleClear = () => {
    setInputText('');
    setParsedList([]);
    setClarificationOverrides({});
    setGptError(null);
  };

  const handleClarifyValue = (id: number, key: keyof ParsedTransaction, value: any) => {
    setClarificationOverrides(prev => {
      const currentOverrides = prev[id] || {};
      const newOverrides = { 
        ...currentOverrides, 
        [key]: value 
      };

      // Auto clear needClarification if category is explicitly set
      if (key === 'category' || key === 'type') {
        newOverrides.needClarification = false;
      }

      return {
        ...prev,
        [id]: newOverrides
      };
    });
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
    setClarificationOverrides({});
    setShowAnimation(true);
    
    setTimeout(() => {
      setShowAnimation(false);
    }, 4000);
  };

  // Remove a single line from the multi-line input string
  const handleRemoveLine = (indexToRemove: number) => {
    const lines = preprocessInputToLines(inputText);
    const cleanedLines = lines.filter((_, idx) => idx !== indexToRemove);
    setInputText(cleanedLines.join('\n'));
  };

  const totalValidNominal = parsedList
    .filter(item => item.nominal > 0)
    .reduce((sum, item) => sum + (item.type === 'Pemasukan' ? item.nominal : -item.nominal), 0);

  return (
    <div className="space-y-6">
      {/* HEADER HERO AREA & ENGINE CHOOSER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-white/5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#7c5cff]" /> AI Smart Multi-Input Parser
          </h1>
          <p className="text-xs text-[#9aa4bf] mt-0.5">
            Parser cerdas yang mendukung bahasa sehari-hari, singkatan gaul, multi-baris, dan otomatisasi pembukuan instan.
          </p>
        </div>
        
        {/* Simplified Status Indicator with Ping animation for Active status and Offline local mode badge */}
        <div className="flex flex-wrap items-center gap-2 select-none font-mono">
          {geminiOnline ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-black">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>🟢 Gemini Online</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-black">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span>
                <span>🔴 Gemini Offline</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-black animate-pulse">
                <span>⚡ Mode Lokal Aktif</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: MULTILINE TEXTAREA INPUT */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white/[0.02] border border-white/[0.06] p-5 rounded-[22px] shadow-xl relative flex flex-col h-full justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-[#7c5cff]" /> Input Chat/Catatan Bebas
                </label>
                <div className="flex gap-2">
                  <button 
                    onClick={handleClear}
                    disabled={!inputText}
                    className="text-[10px] text-[#ff5c7a] bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-lg font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Kosongkan
                  </button>
                  {/* Badge Mode Aktif */}
                  {engine === 'gemini' ? (
                    <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1 font-mono">
                      <span>🤖 Mode Aktif: Google Gemini AI</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1 font-mono">
                      <span>⚡ Mode Aktif: Parser Lokal</span>
                    </span>
                  )}
                </div>
              </div>

              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={11}
                placeholder="Tulis pembukuan bebas di sini. Contoh:&#10;Kemarin makan ramen 120k dibayar pakai OVO&#10;Masuk gaji bulanan 8.5 juta rupiah ke rekening BCA&#10;Beli bahan pakaian 1.2jt mandiri"
                className="w-full mt-2 p-4 bg-[#080d1e] text-xs sm:text-sm text-slate-100 font-mono rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff] leading-relaxed resize-none"
              />

              {/* Gemini Unavailable Alert Banner and Local backup buttons */}
              {!geminiOnline && (
                <div className="mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-extrabold text-amber-400">⚠️ Gemini AI sedang tidak tersedia</p>
                      <p className="text-[10px] text-[#9aa4bf]">Gemini mengalami kegagalan (galat jaringan, kuota, atau kunci belum disetel).</p>
                    </div>
                  </div>
                  {engine !== 'local' && (
                    <button
                      type="button"
                      onClick={() => {
                        setEngine('local');
                        handleLocalParseDirectly(inputText);
                      }}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 focus:outline-none font-bold text-[#0e1329] text-[10px] uppercase rounded-lg transition-colors cursor-pointer"
                    >
                      💡 Gunakan Parser Lokal Sebagai Cadangan
                    </button>
                  )}
                </div>
              )}

              {/* Action trigger button */}
              <div className="mt-3">
                {engine === 'gemini' ? (
                  <button
                    type="button"
                    disabled={isGptParsing || !inputText.trim()}
                    onClick={handleChatGptParse}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-[#10b981] hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-800 disabled:to-slate-950 disabled:text-slate-500 text-xs font-black uppercase text-white rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-98"
                  >
                    {isGptParsing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-white" />
                        <span>Menganalisis dengan Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-white animate-bounce" />
                        <span>Ekstrak Pembukuan Melalui Gemini AI &rarr;</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!inputText.trim()}
                    onClick={() => handleLocalParseDirectly(inputText)}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-800 disabled:to-slate-950 disabled:text-emerald-500/40 text-xs font-black uppercase text-[#0e1329] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 active:scale-98"
                  >
                    <CornerDownLeft className="h-4 w-4 animate-pulse" />
                    <span>Ekstrak Pembukuan Melalui Parser Lokal &rarr;</span>
                  </button>
                )}
              </div>

              {/* Automatic Fallback preference checkbox and manual restore button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.01] border border-white/5 p-3 rounded-xl mt-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-[#9aa4bf] hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={autoFallback}
                    onChange={(e) => handleAutoFallbackChange(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-white/10 bg-slate-900 text-[#7c5cff] focus:ring-[#7c5cff]"
                  />
                  <span className="text-[11px] font-semibold">Alihkan otomatis ke Parser Lokal saat Gemini gagal</span>
                </label>

                {engine === 'local' && (
                  <button
                    type="button"
                    onClick={() => {
                      setEngine('gemini');
                      setGeminiOnline(true);
                      setGptError(null);
                    }}
                    className="px-2.5 py-1 bg-[#7c5cff]/10 hover:bg-[#7c5cff]/20 text-[#7c5cff] border border-[#7c5cff]/30 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1 self-start sm:self-center"
                  >
                    <span>Kembali ke Gemini AI</span>
                  </button>
                )}
              </div>

              {gptError && (
                <div className="mt-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-extrabold text-red-400">Gagal Memproses Transaksi</p>
                    <p className="leading-relaxed text-[11px] opacity-90">{gptError}</p>
                  </div>
                </div>
              )}
            </div>

            {/* QUICK MULTI-LINE SCENARIOS */}
            <div className="space-y-2 mt-4 pt-4 border-t border-white/[0.04]">
              <h4 className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono mb-2">Pilih Demo Pelatihan (UMKM Apparel & Slang)</h4>
              <div className="grid grid-cols-1 gap-2">
                {examplesBulk.map((ex, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleApplyTemplate(ex.text)}
                    className="p-2.5 text-left text-[11px] text-slate-300 bg-white/[0.03] hover:text-white hover:bg-[#7c5cff]/10 border border-white/5 rounded-xl transition-colors cursor-pointer flex items-center justify-between group text-xs font-medium"
                  >
                    <span className="font-bold pr-2">{ex.label}</span>
                    <span className="text-[9px] text-[#00d4ff] font-mono group-hover:translate-x-1 transition-transform shrink-0">Coba &rarr;</span>
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
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-b-white/[0.05]">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4.5 w-4.5 text-[#00d4ff]" />
                  <span className="text-xs uppercase font-extrabold tracking-wider text-white">Parser Cerdas ({parsedList.length} Transaksi Terdeteksi)</span>
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
                  <p className="text-[11px] text-[#9aa4bf] mt-1 max-w-[280px]">
                    Ketik catatan keuangan harian atau pesan kas/reseller Anda di sebelah kiri secara bebas.
                  </p>
                  
                  {/* Single Line Quick Helpers */}
                  <div className="mt-6 flex flex-wrap gap-1.5 justify-center max-w-sm">
                    {examplesSingle.map((single, id) => (
                      <button
                        key={id}
                        onClick={() => handleApplyTemplate(single.text)}
                        className="px-2.5 py-1 text-[10px] text-[#9aa4bf] bg-white/[0.02] border border-white/5 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-mono"
                      >
                        <Play className="h-2 w-2 text-violet-400" />
                        <span>{single.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {parsedList.map((item, idx) => {
                    const isError = item.nominal <= 0;
                    return (
                      <div 
                        key={item.id}
                        className={`flex flex-col p-3 rounded-xl border transition-all ${
                          isError 
                            ? 'bg-red-500/5 border-red-500/10 opacity-70' 
                            : item.needClarification
                            ? 'bg-amber-500/5 border-amber-500/30'
                            : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
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
                                Akun: <span className="text-white font-mono font-bold">{item.source}</span> • Kategori: <span className="text-[#00d4ff] font-bold">{item.category}</span>
                              </p>
                              {item.date && (
                                <p className="text-[9px] text-[#556080] font-mono mt-0.5">
                                  Tanggal: {item.date}
                                </p>
                              )}
                              <p className="text-[9px] text-slate-500 font-mono italic truncate mt-0.5">
                                "{item.rawText}"
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 ml-4 shrink-0">
                            <div className="text-right">
                              {isError ? (
                                <span className="text-[10px] text-red-400 font-mono">Input nominal typo?</span>
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
                              title="Hapus transaksi ini"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Interactive UI Block for Ambiguous Inputs (Clarification Prompts) */}
                        {item.needClarification && (
                          <div className="mt-3.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs shadow-inner">
                            <div className="flex items-start gap-1.5 text-amber-300 font-bold mb-2">
                              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                              <span>{item.clarificationMessage}</span>
                            </div>
                            <div className="flex flex-col gap-2">
                              {/* Direction Switcher Toggle */}
                              <div className="flex items-center justify-between text-[10px] pb-1.5 border-b border-white/5">
                                <span className="text-[#9aa4bf] font-mono leading-none">Arus Kas:</span>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => handleClarifyValue(item.id, 'type', 'Pengeluaran')}
                                    className={`px-2 py-0.5 rounded text-[9px] font-extrabold transition-colors cursor-pointer ${
                                      item.type === 'Pengeluaran'
                                        ? 'bg-[#7c5cff] text-white'
                                        : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
                                    }`}
                                  >
                                    Pengeluaran
                                  </button>
                                  <button
                                    onClick={() => handleClarifyValue(item.id, 'type', 'Pemasukan')}
                                    className={`px-2 py-0.5 rounded text-[9px] font-extrabold transition-colors cursor-pointer ${
                                      item.type === 'Pemasukan'
                                        ? 'bg-[#16c784] text-white'
                                        : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
                                    }`}
                                  >
                                    Pemasukan
                                  </button>
                                </div>
                              </div>
                              {/* Quick Category Chips recommendation list */}
                              <div className="flex flex-wrap gap-1">
                                {item.type === 'Pengeluaran' ? (
                                  ['Makan', 'Transport', 'Belanja', 'Internet', 'Listrik', 'Produksi', 'Logistik', 'Marketing', 'Pinjaman'].map(cat => (
                                    <button
                                      key={cat}
                                      onClick={() => handleClarifyValue(item.id, 'category', cat)}
                                      className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/35 hover:text-white text-amber-200 text-[10px] rounded-lg font-mono transition-colors cursor-pointer"
                                    >
                                      {cat}
                                    </button>
                                  ))
                                ) : (
                                  ['Penjualan', 'Gaji', 'Bonus', 'Freelance', 'Refund', 'Lainnya Pemasukan'].map(cat => (
                                    <button
                                      key={cat}
                                      onClick={() => handleClarifyValue(item.id, 'category', cat)}
                                      className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 hover:text-white text-emerald-200 text-[10px] rounded-lg font-mono transition-colors cursor-pointer"
                                    >
                                      {cat}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        )}
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
                  disabled={parsedList.filter(p => p.nominal > 0 && !p.needClarification).length === 0}
                  className="w-full py-4 rounded-xl bg-[#7c5cff] hover:bg-[#6847ff] disabled:bg-white/5 disabled:text-slate-600 disabled:cursor-not-allowed hover:shadow-[0_0_25px_rgba(124,92,255,0.4)] text-white font-extrabold text-xs active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-4.5 w-4.5 text-white" />
                  <span>Simpan Semua ({parsedList.filter(p => p.nominal > 0 && !p.needClarification).length} Transaksi Siap) &rarr;</span>
                </button>
                {parsedList.some(p => p.needClarification) && (
                  <p className="text-center text-[10px] text-amber-400/80 mt-2 font-mono">
                    ⚠️ Beberapa transaksi masih membutuhkan klarifikasi detail sebelum bisa disimpan.
                  </p>
                )}
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
