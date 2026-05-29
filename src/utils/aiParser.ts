/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ParsedTransaction {
  title: string;
  nominal: number;
  type: 'Pemasukan' | 'Pengeluaran';
  category: string;
  source: string;
  date: string;
  parsedOk: boolean;
  needClarification?: boolean;
  clarificationMessage?: string;
  rawText?: string;
}

// Default dictionaries for the parser
const SOURCE_MAP: Record<string, string> = {
  'bca': 'BCA',
  'mandiri': 'Mandiri',
  'bni': 'BNI',
  'bri': 'BRI',
  'seabank': 'Seabank',
  'jago': 'Jago',
  'dana': 'Dana',
  'ovo': 'OVO',
  'gopay': 'GoPay',
  'shopee': 'ShopeePay',
  'shopeepay': 'ShopeePay',
  'spay': 'ShopeePay',
  'cash': 'Cash',
  'tunai': 'Cash',
  'dompet': 'Cash',
};

// Map keywords to standard categories and type overrides (incorporates slang, abbreviations, typos, and apparel business contexts)
const CATEGORY_KEYWORDS: Array<{ keywords: string[]; category: string; type: 'Pemasukan' | 'Pengeluaran' }> = [
  // Income categories
  { 
    keywords: ['gaji', 'salary', 'payroll', 'gajian', 'gaji masuk', 'gajihan', 'bulanan', 'upah bulanan'], 
    category: 'Gaji', 
    type: 'Pemasukan' 
  },
  { 
    keywords: ['freelance', 'proyek', 'side', 'sampingan', 'samping', 'upah', 'fee masuk', 'komisi masuk', 'komisi', 'fee', 'desain', 'bayar desainer', 'mockup', 'desain jersey', 'sample jersey'], 
    category: 'Freelance', 
    type: 'Pemasukan' 
  },
  { 
    keywords: ['bonus', 'tip', 'thr', 'insentif', 'hadiah', 'angpao', 'saku', 'kado', 'giveaway'], 
    category: 'Bonus', 
    type: 'Pemasukan' 
  },
  { 
    keywords: ['dividen', 'profit', 'bunga', 'reksadana', 'growth', 'saham', 'invest', 'investasi', 'wd', 'withdraw', 'cair saham'], 
    category: 'Investasi', 
    type: 'Pemasukan' 
  },
  { 
    keywords: [
      'jual', 'penjualan', 'dagang', 'olshop', 'laku', 'reseller', 'dropship', 
      'order masuk', 'po masuk', 'pre order masuk', 'pembayaran customer', 
      'customer bayar', 'pembayaran customer', 'dp pelanggan', 'pelunasan pelanggan', 
      'orderan', 'preorder', 'pelanggan bayar', 'pembeli bayar', 'lunas', 'pembayaran preorder',
      'terima order', 'reseler', 'dropsip'
    ], 
    category: 'Penjualan', 
    type: 'Pemasukan' 
  },
  { 
    keywords: ['refund', 'kembalian', 'retur', 'cashback', 'kembalian kain', 'retur bahan'], 
    category: 'Refund', 
    type: 'Pemasukan' 
  },

  // Expense categories
  { 
    keywords: [
      'makan', 'minum', 'bakso', 'mie', 'nasgor', 'warteg', 'restoran', 'kopi', 
      'starbucks', 'ngopi', 'snack', 'jajan', 'lunch', 'dinner', 'sarapan', 'kuliner', 
      'bubur', 'sate', 'mkan', 'makn', 'gofood', 'grabfood', 'shopeefood', 'nongkrong',
      'makan siang', 'makan malam', 'cemilan', 'angkringan', 'bento', 'mcd', 'kfc'
    ], 
    category: 'Makan', 
    type: 'Pengeluaran' 
  },
  { 
    keywords: [
      'grab', 'gojek', 'bensin', 'pertamax', 'pertalite', 'bus', 'kereta', 'mrt', 'lrt', 
      'go-car', 'taxi', 'taksi', 'parkir', 'toll', 'tol', 'tiket', 'flight', 'pesawat', 
      'transport', 'ojek', 'bensen', 'benzin', 'pertamx', 'ngisi motor', 'ngisi mobil',
      'bensin full', 'isi bensin'
    ], 
    category: 'Transport', 
    type: 'Pengeluaran' 
  },
  { 
    keywords: [
      'belanja', 'baju', 'kaos', 'shoes', 'sepatu', 'celana', 'mall', 'tokopedia', 
      'shopee', 'lazada', 'alfamart', 'indomaret', 'supermarket', 'groceries', 
      'makeup', 'skincare', 'jastip', 'titip beli', 'beli baju', 'beli jersey'
    ], 
    category: 'Belanja', 
    type: 'Pengeluaran' 
  },
  { 
    keywords: [
      'internet', 'wifi', 'indihome', 'biznet', 'myrepublic', 'kuota', 'pulsa', 
      'telkomsel', 'xl', 'indosat', 'tri', 'smartfren', 'interent', 'pay wifi', 
      'bayar wifi', 'bayar internet', 'paketan'
    ], 
    category: 'Internet', 
    type: 'Pengeluaran' 
  },
  { 
    keywords: [
      'listrik', 'token', 'pln', 'listriik', 'token listrik', 'bayar listrik', 
      'byr listrik', 'bayr listrik', 'pln prabayar'
    ], 
    category: 'Listrik', 
    type: 'Pengeluaran' 
  },
  { 
    keywords: ['air', 'pdam', 'air pdam', 'tagihan air', 'byr air'], 
    category: 'Air', 
    type: 'Pengeluaran' 
  },
  { 
    keywords: ['langganan', 'spotify', 'netflix', 'youtube', 'disney', 'prime', 'icloud', 'gdrive', 'canva', 'premium', 'sub', 'subscribe'], 
    category: 'Langganan', 
    type: 'Pengeluaran' 
  },
  { 
    keywords: ['hiburan', 'bioskop', 'cinema', 'nonton', 'game', 'topup game', 'steam', 'playstation', 'ps', 'karaoke', 'healing', 'liburan', 'rekreasi', 'pantai', 'wisata', 'villa', 'hotel', 'staycation'], 
    category: 'Hiburan', 
    type: 'Pengeluaran' 
  },
  { 
    keywords: ['sehat', 'obat', 'dokter', 'klinik', 'rumahsakit', 'rs', 'vitamin', 'bpjs', 'apotek', 'kesehatan', 'sakit', 'pusing', 'demam', 'masker'], 
    category: 'Kesehatan', 
    type: 'Pengeluaran' 
  },
  { 
    keywords: [
      'topup', 'gopay topup', 'dana topup', 'rekening', 'transfer', 'kirim', 'e-wallet', 
      'isi saldo', 'top up', 'trasnfer', 'tranfer', 'trnasfer', 'trf', 'tf', 'kirim duit', 
      'kirim uang', 'top up saldo', 'isiin saldo'
    ], 
    category: 'Top Up', 
    type: 'Pengeluaran' 
  },
  { 
    keywords: ['sekolah', 'kuliah', 'spp', 'buku', 'kursus', 'pelatihan', 'seminar', 'udemy', 'education', 'pendidikan', 'les', 'bimbel'], 
    category: 'Pendidikan', 
    type: 'Pengeluaran' 
  },
  { 
    keywords: ['pajak', 'tax', 'stnk', 'pbb', 'bea cukai'], 
    category: 'Pajak', 
    type: 'Pengeluaran' 
  },
  
  // Custom business convection categories
  { 
    keywords: [
      'kain', 'kain jersey', 'bahan jaket', 'sublim', 'printing', 'print kain', 
      'press roll', 'jahit', 'obras', 'cutting', 'packing', 'produksi', 'vendor kain', 
      'vendor printing', 'vendor jahit', 'bayar penjahit', 'beli kain', 'beli bahan', 
      'bahan jersey', 'obras kain', 'sublimasi', 'alat jahit', 'jarum jahit', 'alat produksi',
      'beli mesin', 'mesin obras', 'kancing', 'benang'
    ], 
    category: 'Produksi', 
    type: 'Pengeluaran' 
  },
  { 
    keywords: ['ongkir', 'kirim paket', 'ekspedisi', 'jasa kirim', 'pos', 'jne', 'jnt', 'j&t', 'j&t express', 'jnt express', 'sicepat', 'anteraja', 'logistik', 'ongkos kirim', 'paket kirim'], 
    category: 'Logistik', 
    type: 'Pengeluaran' 
  },
  { 
    keywords: [
      'iklan', 'ads', 'facebook ads', 'instagram ads', 'adsense', 'iklan fb', 
      'iklan instagram', 'influencer', 'endorse', 'marketing', 'iklan google', 
      'tiktok ads', 'brosur', 'promosi', 'spanduk'
    ], 
    category: 'Marketing', 
    type: 'Pengeluaran' 
  },
  { 
    keywords: [
      'cicilan', 'angsuran', 'bayar hutang', 'hutang', 'bayar pinjaman', 'pinjaman', 
      'bayr hutang', 'pinjaman keluar', 'angsuran motor', 'pinjam uang'
    ], 
    category: 'Pinjaman', 
    type: 'Pengeluaran' 
  }
];

/**
 * Robustly parses nominal input strings of Indonesian format.
 * Converts words like "lima puluh ribu", "2 setengah juta", "50rb" to 50000.
 */
export function parseNominalText(input: string): { nominal: number; matchedText: string } | null {
  let text = input.toLowerCase().trim();

  // Normalize decimal commas to dots
  text = text.replace(/(\d+),(\d+)/g, '$1.$2');

  // Handle common half representations in Indonesian
  text = text.replace(/\bdua\s+setengah\s+juta\b/g, '2.5 jt');
  text = text.replace(/\bsatu\s+setengah\s+juta\b/g, '1.5 jt');
  text = text.replace(/\bsetengah\s+juta\b/g, '0.5 jt');
  text = text.replace(/\bsetengah\s+miliar\b/g, '0.5 miliar');
  text = text.replace(/\bsetengah\s+milyar\b/g, '0.5 milyar');
  text = text.replace(/\bsetengah\s+ribu\b/g, '500');

  // Replace textual numbers with single digit equivalents
  const wordNumbers: Record<string, string> = {
    'sepuluh': '10', 'sebelas': '11', 'seratus': '100', 'seribu': '1000',
    'satu': '1', 'dua': '2', 'tiga': '3', 'empat': '4', 'lima': '5',
    'enam': '6', 'tujuh': '7', 'delapan': '8', 'sembilan': '9'
  };
  for (const [word, num] of Object.entries(wordNumbers)) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    text = text.replace(regex, num);
  }

  // Handle multiplier words
  text = text.replace(/\b(\d+)\s+puluh\s+ribu\b/g, (_, d) => `${parseInt(d) * 10} ribu`);
  text = text.replace(/\b(\d+)\s+puluh\b/g, (_, d) => `${parseInt(d) * 10}`);
  text = text.replace(/\b(\d+)\s+ratus\s+ribu\b/g, (_, d) => `${parseInt(d) * 100} ribu`);
  text = text.replace(/\b(\d+)\s+ratus\b/g, (_, d) => `${parseInt(d) * 100}`);

  // Combine complex patterns like "2 juta 500 ribu" -> "2500000"
  text = text.replace(/(\d+(?:\.\d+)?)\s*(juta|jt)\s*(\d+(?:\.\d+)?)\s*(ribu|rb)?/g, (_, jt, __, rb) => {
    const jtVal = parseFloat(jt) * 1000000;
    const rbVal = parseFloat(rb || '0') * (rb ? 1000 : 1);
    return (jtVal + rbVal).toString();
  });

  // Shorten suffixes to match easily
  text = text.replace(/\b(miliar|milyar)\b/g, 'm');
  text = text.replace(/\b(juta)\b/g, 'jt');
  text = text.replace(/\b(ribu)\b/g, 'rb');

  // Clean Indonesian thousands dots (e.g. 100.000 or 1.500.000) so they become numeric strings (100000, 1500000).
  text = text.replace(/\b(\d{1,3})(?:\.(\d{3}))+\b/g, (match) => {
    return match.replace(/\./g, '');
  });

  // Match suffixes pattern (e.g., "50rb", "100k", "5jt", "1.5jt", "2m")
  const suffixRegex = /(\d+(?:\.\d+)?)\s*(rb|ribu|k|jt|juta|m)\b/i;
  const matchSuffix = text.match(suffixRegex);
  if (matchSuffix) {
    const val = parseFloat(matchSuffix[1]);
    const suffix = matchSuffix[2].toLowerCase();
    let multiplier = 1;
    if (suffix === 'rb' || suffix === 'ribu' || suffix === 'k') multiplier = 1000;
    else if (suffix === 'jt' || suffix === 'juta') multiplier = 1000000;
    else if (suffix === 'm') multiplier = 1000000000;

    return {
      nominal: Math.round(val * multiplier),
      matchedText: matchSuffix[0]
    };
  }

  // Match plain number of significant size (at least 3 digits to avoid confusion with identifiers/counts)
  const plainRegex = /\b(\d+)\b/;
  const matchPlain = text.match(plainRegex);
  if (matchPlain) {
    const val = parseInt(matchPlain[1]);
    if (val >= 100) {
      return {
        nominal: val,
        matchedText: matchPlain[0]
      };
    }
  }

  return null;
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
function formatDateString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parses natural locale time expressions like "hari ini", "kemarin sore", "minggu lalu" to standard dates
 */
export function parseDateReference(text: string): string {
  const today = new Date();
  const textLower = text.toLowerCase();
  
  if (
    textLower.includes('hari ini') ||
    textLower.includes('barusan') ||
    textLower.includes('baru aja') ||
    textLower.includes('baru saja') ||
    textLower.includes('tadi pagi') ||
    textLower.includes('tadi siang') ||
    textLower.includes('tadi sore') ||
    textLower.includes('tadi malam')
  ) {
    return formatDateString(today);
  }
  
  if (textLower.includes('kemarin')) {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return formatDateString(yesterday);
  }
  
  if (textLower.includes('minggu lalu')) {
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    return formatDateString(lastWeek);
  }
  
  if (textLower.includes('bulan lalu')) {
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    return formatDateString(lastMonth);
  }

  if (textLower.includes('awal bulan')) {
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return formatDateString(startOfMonth);
  }

  if (textLower.includes('akhir bulan')) {
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return formatDateString(endOfMonth);
  }
  
  // Custom date match: tanggal 15 kemarin or tanggal 15
  const tanggalMatch = textLower.match(/tanggal\s+(\d+)/);
  if (tanggalMatch) {
    const targetDay = parseInt(tanggalMatch[1]);
    const targetDate = new Date(today.getFullYear(), today.getMonth(), targetDay);
    if (targetDay > today.getDate() || textLower.includes('kemarin')) {
      if (targetDate > today) {
        targetDate.setMonth(today.getMonth() - 1);
      }
    }
    return formatDateString(targetDate);
  }

  return formatDateString(today);
}

/**
 * Splits a line containing multiple transactions (e.g. separated by commas)
 * and propagates any overarching date context.
 */
export function preprocessInputToLines(text: string): string[] {
  if (!text) return [];
  
  const lines = text.split('\n');
  const finalLines: string[] = [];
  
  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;
    
    // Normalize decimal commas in the line FIRST to prevent splitting on them (e.g. 2,5jt -> 2.5jt)
    line = line.replace(/(\d+),(\d+)/g, '$1.$2');
    
    const dateKeywords = [
      'hari ini', 'kemarin sore', 'kemarin', 'tadi pagi', 'tadi siang', 'tadi sore', 'tadi malam',
      'minggu lalu', 'bulan lalu', 'barusan', 'baru aja', 'baru saja', 'awal bulan', 'akhir bulan'
    ];
    
    let detectedDateContext = '';
    for (const kw of dateKeywords) {
      if (line.toLowerCase().includes(kw)) {
        detectedDateContext = kw;
        break;
      }
    }
    const tglMatch = line.toLowerCase().match(/tanggal\s+\d+(\s+kemarin)?/i);
    if (tglMatch) {
      detectedDateContext = tglMatch[0];
    }
    
    // Split on separators like commas, semicolons, and certain conjunction phrases
    const splitRegex = /,|;|dan\s+|sama\s+|lalu\s+|terus\s+|kemudian\s+/gi;
    const parts = line.split(splitRegex).map(p => p.trim()).filter(p => p.length > 0);
    
    if (parts.length <= 1) {
      finalLines.push(line);
      continue;
    }
    
    const subTransactions: string[] = [];
    let temp = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      // Has nominal digits or multiplier suffix text representation
      const hasNominal = /\d+|ribu|juta|milyar|miliar/i.test(part);
      
      if (hasNominal) {
        if (temp) {
          subTransactions.push(temp.trim());
        }
        temp = part;
      } else {
        if (temp) {
          temp += ' ' + part;
        } else {
          temp = part;
        }
      }
    }
    if (temp) {
      subTransactions.push(temp.trim());
    }
    
    for (const subTx of subTransactions) {
      let cleanSubTx = subTx;
      const hasOwnDate = dateKeywords.some(kw => subTx.toLowerCase().includes(kw)) || /tanggal\s+\d+/i.test(subTx);
      if (!hasOwnDate && detectedDateContext) {
        cleanSubTx = detectedDateContext + ' ' + cleanSubTx;
      }
      finalLines.push(cleanSubTx);
    }
  }
  
  return finalLines;
}

/**
 * Helper to match keywords robustly, ensuring short keywords (<= 3 chars)
 * only match on precise non-word boundary boundaries to avoid false positives (e.g., 'rs' matching 'jersey').
 */
function matchKeyword(text: string, keyword: string): boolean {
  if (keyword.length <= 3) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i');
    return regex.test(text);
  }
  return text.includes(keyword);
}

/**
 * Parses shorthand financial text like:
 * "mkn bakso 25rb jago" or "gaji 5jt bca" or "beli kain 2jt cash"
 */
export function parseFinanceText(input: string): ParsedTransaction {
  const cleanInput = input.trim();
  const processedInput = cleanInput.toLowerCase();
  
  const result: ParsedTransaction = {
    title: '',
    nominal: 0,
    type: 'Pengeluaran',
    category: 'Lainnya',
    source: 'Cash',
    date: formatDateString(new Date()),
    parsedOk: false,
    rawText: cleanInput,
  };

  if (!processedInput) return result;

  // 1. EXTRACT DATE
  result.date = parseDateReference(processedInput);

  // 2. EXTRACT NOMINAL
  const nominalMatch = parseNominalText(processedInput);
  if (nominalMatch) {
    result.nominal = nominalMatch.nominal;
    result.parsedOk = true;
  }

  // 3. DETECT SOURCE OF FUNDS (ACCOUNT)
  let detectedSource = '';

  const keMatch = processedInput.match(/(?:uang\s+masuk|masuk|kirim|ke)\s+ke\s+([a-z0-9\-]+)/i) || processedInput.match(/\bke\s+([a-z0-9\-]+)/i);
  if (keMatch) {
    const candidateSource = keMatch[1].toLowerCase().trim();
    if (SOURCE_MAP[candidateSource]) {
      detectedSource = SOURCE_MAP[candidateSource];
    } else {
      const stopwords = ['bawah', 'atas', 'dalam', 'luar', 'sini', 'sana', 'pagi', 'siang', 'sore', 'malam', 'hari', 'bulan', 'tahun', 'dompet', 'untuk', 'buat', 'beli'];
      const isStopword = stopwords.includes(candidateSource) || ['rb', 'jt', 'k', 'ribu', 'juta', 'm', 'rupiah', 'rp'].includes(candidateSource) || !isNaN(Number(candidateSource));
      if (!isStopword && candidateSource.length >= 2) {
        detectedSource = candidateSource.charAt(0).toUpperCase() + candidateSource.slice(1);
      }
    }
  }

  if (!detectedSource) {
    for (const [key, val] of Object.entries(SOURCE_MAP)) {
      if (matchKeyword(processedInput, key)) {
        detectedSource = val;
        break;
      }
    }
  }

  if (detectedSource) {
    result.source = detectedSource;
  }

  // 4. DETECT CATEGORY AND DIRECTION TYPE
  let detectedCategory = '';
  let detectedType: 'Pemasukan' | 'Pengeluaran' | null = null;

  for (const entry of CATEGORY_KEYWORDS) {
    for (const keyword of entry.keywords) {
      // Direct whole-word and substring match for maximum typo/slang coverage 
      if (matchKeyword(processedInput, keyword)) {
        detectedCategory = entry.category;
        detectedType = entry.type;
        break;
      }
    }
    if (detectedCategory) break;
  }

  // Trigger explicit income words if present
  const isPemasukanExplicit = processedInput.includes('uang masuk') || 
                              processedInput.includes('masuk ke') || 
                              processedInput.includes('pemasukan') || 
                              processedInput.includes('tf masuk') || 
                              processedInput.includes('transfer masuk') ||
                              processedInput.includes('terima duit') ||
                              textHasIncomePrefix(processedInput);

  if (detectedCategory) {
    result.category = detectedCategory;
    result.type = detectedType || 'Pengeluaran';
  } else {
    result.type = isPemasukanExplicit ? 'Pemasukan' : 'Pengeluaran';
    result.category = result.type === 'Pemasukan' ? 'Lainnya Pemasukan' : 'Lainnya';
  }

  if (isPemasukanExplicit) {
    result.type = 'Pemasukan';
    if (result.category === 'Lainnya') {
      result.category = 'Lainnya Pemasukan';
    }
  }

  // 5. EXTRACT CLEAN TITLE
  let tempTitle = processedInput;

  // Remove the matched nominal raw string from the title
  if (nominalMatch) {
    tempTitle = tempTitle.replace(nominalMatch.matchedText, ' ');
  }

  // Remove the matched source and prepositions
  if (detectedSource) {
    for (const key of Object.keys(SOURCE_MAP)) {
      if (processedInput.includes(key)) {
        tempTitle = tempTitle.replace(new RegExp(`(?:uang\\s+)?(?:masuk\\s+)?ke\\s+${key}`, 'gi'), ' ');
        tempTitle = tempTitle.replace(new RegExp(`\\b${key}\\b`, 'gi'), ' ');
        break;
      }
    }
  }

  // Remove date references
  const dateKeywordsForRemoval = [
    'hari ini', 'kemarin sore', 'kemarin', 'tadi pagi', 'tadi siang', 'tadi sore', 'tadi malam',
    'minggu lalu', 'bulan lalu', 'barusan', 'baru aja', 'baru saja', 'awal bulan', 'akhir bulan',
    'tanggal\\s+\\d+(\\s+kemarin)?'
  ];
  for (const kw of dateKeywordsForRemoval) {
    tempTitle = tempTitle.replace(new RegExp(`\\b${kw}\\b`, 'gi'), ' ');
  }
  tempTitle = tempTitle.replace(/tanggal\s+\d+/gi, ' ');

  // Clean redundant conjunctions and prepositions
  const prepositions = [
    'dan', 'sama', 'lalu', 'terus', 'kemudian', 'dari', 'ke', 'buat', 'untuk', 'pemasukan', 
    'pengeluaran', 'nominal', 'rupiah', 'sebesar', 'nilai', 'nilai pasar', 'masuk', 'byr', 'bayar'
  ];
  for (const prep of prepositions) {
    tempTitle = tempTitle.replace(new RegExp(`\\b${prep}\\b`, 'gi'), ' ');
  }

  tempTitle = tempTitle.replace(/\s+/g, ' ').trim();

  // Smart fallen title
  if (!tempTitle) {
    if (result.type === 'Pemasukan') {
      result.title = 'Uang Masuk (' + result.category + ')';
    } else {
      result.title = result.category;
    }
  } else {
    // Capitalize words
    result.title = tempTitle
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // 6. EVALUATE AMBIGUITY & NEED CLARIFICATION
  const justActionWords = ['bayar', 'beli', 'keluar', 'pembayaran', 'pengeluaran', 'masuk', 'terima', 'kirim', 'dapat', 'cair'];
  const hasOnlyAction = tempTitle === '' || justActionWords.includes(tempTitle.toLowerCase());
  
  if (result.type === 'Pengeluaran' && (result.category === 'Lainnya' || result.category === 'Belanja') && hasOnlyAction) {
    result.needClarification = true;
    result.clarificationMessage = 'Pembayaran ini untuk keperluan apa? (pilih: Makan, Transport, Listrik, Belanja, Produksi, dll)';
  } else if (result.type === 'Pemasukan' && result.category === 'Lainnya Pemasukan' && hasOnlyAction) {
    result.needClarification = true;
    result.clarificationMessage = 'Uang masuk ini bersumber dari mana? (pilih: Penjualan, Gaji, Bonus, Freelance, dll)';
  } else if (result.category === 'Lainnya' && !processedInput.includes('ke') && !detectedSource && tempTitle.length <= 4) {
    // Just typed a number, extremely ambiguous
    result.needClarification = true;
    result.clarificationMessage = 'Apakah transaksi ini pengeluaran atau pemasukan, dan untuk pos apa?';
  }

  return result;
}

function textHasIncomePrefix(text: string): boolean {
  const commonIncomePatterns = [
    'dapat transfer', 'duit masuk', 'kiriman masuk', 'cair', 'gajian', 'wd', 'withdraw', 
    'terima transferan', 'terbit kupon', 'pelunasan', 'pembayaran customer', 'dp masuk'
  ];
  return commonIncomePatterns.some(p => text.includes(p));
}
