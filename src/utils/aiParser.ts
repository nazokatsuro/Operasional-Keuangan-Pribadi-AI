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

// Map keywords to standard categories and type overrides
const CATEGORY_KEYWORDS: Array<{ keywords: string[]; category: string; type: 'Pemasukan' | 'Pengeluaran' }> = [
  // Income categories
  { keywords: ['gaji', 'salary', 'payroll', 'gajian'], category: 'Gaji', type: 'Pemasukan' },
  { keywords: ['freelance', 'proyek', 'side', 'sampingan', 'samping', 'upah'], category: 'Freelance', type: 'Pemasukan' },
  { keywords: ['bonus', 'tip', 'thr', 'insentif'], category: 'Bonus', type: 'Pemasukan' },
  { keywords: ['dividen', 'profit', 'bunga', 'reksadana', 'growth', 'saham', 'invest', 'investasi'], category: 'Investasi', type: 'Pemasukan' },
  { keywords: ['jual', 'penjualan', 'dagang', 'olshop', 'laku'], category: 'Penjualan', type: 'Pemasukan' },
  { keywords: ['gift', 'hadiah', 'angpao', 'saku', 'kado'], category: 'Gift', type: 'Pemasukan' },
  { keywords: ['refund', 'kembalian', 'retur'], category: 'Refund', type: 'Pemasukan' },

  // Expense categories
  { keywords: ['makan', 'minum', 'bakso', 'mie', 'nasgor', 'warteg', 'restoran', 'kopi', 'starbucks', 'ngopi', 'snack', 'jajan', 'lunch', 'dinner', 'sarapan', 'kuliner', 'bubur', 'sate'], category: 'Makan', type: 'Pengeluaran' },
  { keywords: ['grab', 'gojek', 'bensin', 'pertamax', 'pertalite', 'bus', 'kereta', 'mrt', 'lrt', 'go-car', 'taxi', 'taksi', 'parkir', 'toll', 'tol', 'tiket', 'flight', 'pesawat', 'transport', 'ojek'], category: 'Transport', type: 'Pengeluaran' },
  { keywords: ['belanja', 'baju', 'kaos', 'shoes', 'sepatu', 'celana', 'mall', 'tokopedia', 'shopee', 'lazada', 'alfamart', 'indomaret', 'supermarket', 'groceries', 'makeup', 'skincare'], category: 'Belanja', type: 'Pengeluaran' },
  { keywords: ['internet', 'wifi', 'indihome', 'biznet', 'myrepublic', 'kuota', 'pulsa', 'telkomsel', 'xl', 'indosat', 'tri', 'smartfren'], category: 'Internet', type: 'Pengeluaran' },
  { keywords: ['listrik', 'token', 'pln'], category: 'Listrik', type: 'Pengeluaran' },
  { keywords: ['air', 'pdam'], category: 'Air', type: 'Pengeluaran' },
  { keywords: ['langganan', 'spotify', 'netflix', 'youtube', 'disney', 'prime', 'icloud', 'gdrive', 'canva', 'premium', 'sub', 'subscribe'], category: 'Langganan', type: 'Pengeluaran' },
  { keywords: ['hiburan', 'bioskop', 'cinema', 'nonton', 'game', 'topup game', 'steam', 'playstation', 'ps', 'karaoke', 'healing', 'liburan', 'rekreasi', 'pantai', 'wisata'], category: 'Hiburan', type: 'Pengeluaran' },
  { keywords: ['sehat', 'obat', 'dokter', 'klinik', 'rumahsakit', 'rs', 'vitamin', 'bpjs', 'apotek', 'kesehatan'], category: 'Kesehatan', type: 'Pengeluaran' },
  { keywords: ['topup', 'gopay topup', 'dana topup', 'rekening', 'transfer', 'kirim', 'e-wallet'], category: 'Top Up', type: 'Pengeluaran' },
  { keywords: ['sekolah', 'kuliah', 'spp', 'buku', 'kursus', 'pelatihan', 'seminar', 'udemy', 'education', 'pendidikan'], category: 'Pendidikan', type: 'Pengeluaran' },
  { keywords: ['pajak', 'tax', 'stnk', 'pbb'], category: 'Pajak', type: 'Pengeluaran' },
];

/**
 * Parses shorthand financial text like:
 * "mkn bakso 25rb dana" or "gaji 5jt bca"
 */
export function parseFinanceText(input: string): ParsedTransaction {
  const cleanInput = input.trim().toLowerCase();
  
  const result: ParsedTransaction = {
    title: '',
    nominal: 0,
    type: 'Pengeluaran',
    category: 'Lainnya',
    source: 'Cash',
    date: new Date().toISOString().split('T')[0],
    parsedOk: false,
  };

  if (!cleanInput) return result;

  // Pre-process thousands dots (e.g. 300.000 or 1.500.000) so they become clean numeric strings (300000, 1500000).
  // But keep decimal points if they are like 2.5jt (not followed by exactly 3 digits or series of dot sequences).
  let processedInput = cleanInput;
  processedInput = processedInput.replace(/\b(\d{1,3})(?:\.(\d{3}))+\b/g, (match) => {
    return match.replace(/\./g, '');
  });

  // 1. EXTRACT NOMINAL
  // Matches expressions like '25rb', '25k', '5jt', '5juta', '2m', '250.000', '25000'
  const nominalRegex = /(?:^|\s)(\d+(?:\.\d+)?)\s*(rb|ribu|k|jt|juta|m)?(?:\s|$)/i;
  const matchNominal = processedInput.match(nominalRegex);

  if (matchNominal) {
    const rawVal = parseFloat(matchNominal[1]);
    const format = (matchNominal[2] || '').toLowerCase();
    
    let multiplier = 1;
    if (format === 'rb' || format === 'ribu' || format === 'k') {
      multiplier = 1000;
    } else if (format === 'jt' || format === 'juta') {
      multiplier = 1000000;
    } else if (format === 'm') {
      multiplier = 1000000000;
    }
    
    result.nominal = rawVal * multiplier;
    result.parsedOk = true;
  }

  // 2. DETECT SUMBER UANG / SOURCE
  let detectedSource = '';

  // 2a. Check explicit patterns with "ke <sumber_uang>" or "masuk ke <sumber_uang>"
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

  // 2b. Fallback: Scan SOURCE_MAP keys in processedInput if not matching the "ke" prefix
  if (!detectedSource) {
    for (const [key, val] of Object.entries(SOURCE_MAP)) {
      if (processedInput.includes(key)) {
        detectedSource = val;
        break;
      }
    }
  }

  if (detectedSource) {
    result.source = detectedSource;
  }

  // 3. DETECT CATEGORY AND DIRECTION TYPE
  let detectedCategory = '';
  let detectedType: 'Pemasukan' | 'Pengeluaran' | null = null;

  for (const entry of CATEGORY_KEYWORDS) {
    for (const keyword of entry.keywords) {
      if (processedInput.includes(keyword)) {
        detectedCategory = entry.category;
        detectedType = entry.type;
        break;
      }
    }
    if (detectedCategory) break;
  }

  if (detectedCategory) {
    result.category = detectedCategory;
    result.type = detectedType || 'Pengeluaran';
  } else {
    // Default categorizations based on direct nouns in Indonesian context
    result.category = result.type === 'Pemasukan' ? 'Lainnya Pemasukan' : 'Lainnya';
  }

  // Explicit check for "uang masuk", "pemasukan", "masuk ke" to trigger "Pemasukan"
  const isPemasukanExplicit = processedInput.includes('uang masuk') || 
                              processedInput.includes('masuk ke') || 
                              processedInput.includes('pemasukan') || 
                              processedInput.includes('tf masuk') || 
                              processedInput.includes('transfer masuk');
  
  if (isPemasukanExplicit) {
    result.type = 'Pemasukan';
    if (result.category === 'Lainnya') {
      result.category = 'Lainnya Pemasukan';
    }
  }

  // 4. CLEAN TITLE EXTRACTION
  // Remove matched nominal token, source token, and common keywords to leave a tidy title
  let tempTitle = processedInput;

  // Remove the nominal match
  if (matchNominal) {
    tempTitle = tempTitle.replace(matchNominal[0], ' ');
  }

  // Remove source matches and their prepositions
  if (detectedSource) {
    for (const key of Object.keys(SOURCE_MAP)) {
      if (processedInput.includes(key)) {
        // Remove "ke <key>", "masuk ke <key>", or simply "<key>"
        tempTitle = tempTitle.replace(new RegExp(`(?:uang\\s+)?(?:masuk\\s+)?ke\\s+${key}`, 'gi'), ' ');
        tempTitle = tempTitle.replace(new RegExp(`\\b${key}\\b`, 'gi'), ' ');
        break;
      }
    }
  }

  // Clean trigger phrases and prepositions to get a humble, beautiful user title
  tempTitle = tempTitle
    .replace(/\buang\s+masuk\s+ke\b/gi, ' ')
    .replace(/\bmasuk\s+ke\b/gi, ' ')
    .replace(/\buang\s+masuk\b/gi, ' ')
    .replace(/\bpemasukan\s+ke\b/gi, ' ')
    .replace(/\bpemasukan\b/gi, ' ')
    .replace(/\bke\b/gi, ' ')
    .replace(/\bmasuk\b/gi, ' ');

  // Clean spelling indicators, trim spacing, capitalize correctly
  tempTitle = tempTitle
    .replace(/\s+/g, ' ')
    .trim();

  // If title is empty, use a smart fallback
  if (!tempTitle) {
    if (result.type === 'Pemasukan') {
      result.title = 'Uang Masuk';
    } else {
      result.title = result.category;
    }
  } else {
    // Capitalize each word
    result.title = tempTitle
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Fallback category direction if the category is 'Lainnya' and title suggests income
  if (result.category === 'Lainnya') {
    const incomeClues = ['gaji', 'dapat', 'bonus', 'untung', 'pemasukan', 'cair', 'tf masuk', 'transfer masuk', 'uang masuk'];
    const matchesIncomeClue = incomeClues.some(clue => processedInput.includes(clue));
    if (matchesIncomeClue) {
      result.type = 'Pemasukan';
      result.category = 'Lainnya Pemasukan';
    }
  }

  return result;
}
