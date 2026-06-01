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
  initialEngine?: 'lokal' | 'chatgpt';
}

export function AiInputView({ accounts, onCommitTransaction, compact, initialEngine }: AiInputViewProps) {
  // Multiline state handling
  const [inputText, setInputText] = useState('');
  const [parsedList, setParsedList] = useState<Array<ParsedTransaction & { rawText: string; id: number }>>([]);
  const [showAnimation, setShowAnimation] = useState(false);
  const [committedCount, setCommittedCount] = useState(0);

  // Engine select state (lokal vs chatgpt)
  const [engine, setEngine] = useState<'lokal' | 'chatgpt'>(() => {
    if (initialEngine) return initialEngine;
    return (localStorage.getItem('LKP_AI_PARSER_ENGINE') as 'lokal' | 'chatgpt') || 'lokal';
  });
  const [isGptParsing, setIsGptParsing] = useState(false);
  const [gptError, setGptError] = useState<string | null>(null);

  useEffect(() => {
    if (initialEngine) {
      setEngine(initialEngine);
    }
  }, [initialEngine]);

  const handleEngineChange = (newEngine: 'lokal' | 'chatgpt') => {
    setEngine(newEngine);
    localStorage.setItem('LKP_AI_PARSER_ENGINE', newEngine);
    setParsedList([]);
    setGptError(null);
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

  // Heuristic offline parser runs on input text when in 'lokal' engine mode
  useEffect(() => {
    if (engine === 'chatgpt') {
      return;
    }
    if (!inputText) {
      setParsedList([]);
      return;
    }

    // Preprocess input text to lines (splits comma/conjunction multi-transactions and propagates date context)
    const lines = preprocessInputToLines(inputText);
    const parsedItems = lines.map((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return null;
      
      const parsedItem = parseFinanceText(trimmedLine);
      const overrides = clarificationOverrides[index] || {};

      return {
        ...parsedItem,
        ...overrides,
        rawText: trimmedLine,
        // Ensure needClarification is also overridden if they clarified
        needClarification: overrides.needClarification !== undefined ? overrides.needClarification : parsedItem.needClarification,
        id: index
      };
    }).filter(item => item !== null) as Array<ParsedTransaction & { rawText: string; id: number }>;

    setParsedList(parsedItems);
  }, [inputText, clarificationOverrides, engine]);

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
        try {
          const parsedErr = JSON.parse(rawText);
          throw new Error(parsedErr.message || parsedErr.error || `API Error: ${statusCode}`);
        } catch {
          throw new Error(`API Error: ${statusCode}`);
        }
      }

      // Check content-type
      if (!contentType?.includes('application/json')) {
        throw new Error('Server tidak mengembalikan JSON valid');
      }

      let result;
      try {
        result = JSON.parse(rawText);
      } catch (jsonErr: any) {
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
        
        // Also register smart tried flag
        const isTried = localStorage.getItem('LKP_AI_SMART_TRIED') === 'true';
        if (!isTried) {
          localStorage.setItem('LKP_AI_SMART_TRIED', 'true');
          // Dispatches a state update to trigger Navbar sync
          window.dispatchEvent(new Event('storage'));
        }
      } else {
        setGptError(result.message || result.error || 'Gagal memproses kalimat menggunakan Gemini.');
      }
    } catch (e: any) {
      setGptError('Gagal menghubungi server: ' + e.message);
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
        
        {/* Engine Selector Segment Controls */}
        <div className="flex bg-[#080d1e] p-1 rounded-xl border border-white/5 self-start sm:self-center">
          <button
            onClick={() => handleEngineChange('lokal')}
            className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              engine === 'lokal'
                ? 'bg-gradient-to-r from-[#7c5cff] to-[#633be6] text-white shadow-md shadow-[#7c5cff]/20'
                : 'text-[#9aa4bf] hover:text-white'
            }`}
          >
            <CheckCircle2 className={`h-3.5 w-3.5 ${engine === 'lokal' ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span>Super-Lokal Offline</span>
          </button>
          <button
            onClick={() => handleEngineChange('chatgpt')}
            className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer relative overflow-visible ${
              engine === 'chatgpt'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-[#9aa4bf] hover:text-white'
            }`}
          >
            <Sparkles className={`h-3.5 w-3.5 ${engine === 'chatgpt' ? 'text-white' : 'text-emerald-400'}`} />
            <span>Google Gemini API</span>
            <span className="absolute -top-2 -right-1 bg-gradient-to-r from-purple-500 to-[#7c5cff] text-white text-[7px] font-extrabold px-1.5 py-0.5 rounded-full shadow border border-purple-400/20 uppercase animate-pulse leading-none">
              HOT
            </span>
          </button>
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
                  <span className="text-[10px] font-mono bg-[#7c5cff]/10 text-[#7c5cff] px-2 py-1 rounded-lg font-bold">
                    {engine === 'chatgpt' ? 'Gemini 3.5-flash' : 'Super-Lokal v1.2'}
                  </span>
                </div>
              </div>

              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={11}
                placeholder={engine === 'chatgpt'
                  ? "Tulis pembukuan bebas di sini. Contoh:\nKemarin makan ramen 120k dibayar pakai OVO\nMasuk gaji bulanan 8.5 juta rupiah ke rekening BCA\nBeli bahan pakaian 1.2jt mandiri"
                  : "Tuliskan catatan transaksi Anda. Contoh:\nkemarin beli kain jersey 2jt bca\nhari ini makan bakso 25rb cash, bensin 100rb, jajan boba 15rb"
                }
                className="w-full mt-2 p-4 bg-[#080d1e] text-xs sm:text-sm text-slate-100 font-mono rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff] leading-relaxed resize-none"
              />

              {engine === 'chatgpt' ? (
                <div className="mt-3">
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
                </div>
              ) : (
                <div className="flex gap-2 items-start mt-3 text-[10px] text-[#9aa4bf] bg-white/[0.02] p-3 rounded-xl border border-white/5">
                  <Info className="h-4 w-4 text-[#00d4ff] shrink-0 mt-0.5" />
                  <span>
                    Parser mendukung pemisahan multi-transaksi otomatis menggunakan tanda koma atau kata connector seperti <strong className="text-white">"dan"</strong> atau <strong className="text-white">"sama"</strong>.
                  </span>
                </div>
              )}

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
