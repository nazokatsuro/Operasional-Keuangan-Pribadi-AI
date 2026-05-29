/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  Briefcase, TrendingUp, TrendingDown, ArrowUpRight, DollarSign, Wallet, 
  Target, Award, HeartPulse, Sparkles, ChevronRight, Utensils, Car, ShoppingBag, 
  Wifi, HelpCircle, ShieldCheck, Smartphone, Info, Download, FileText,
  Activity, Trash2, Play, Check, CheckCircle2, ArrowDownRight, RefreshCw, Layers, Edit3, X, Zap
} from 'lucide-react';
import Chart from 'chart.js/auto';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  Transaction, Account, Asset, Debt, 
  formatCurrency, calculateFinancialHealth 
} from '../utils/financeHelper';
import { parseFinanceText, ParsedTransaction } from '../utils/aiParser';

interface DashboardViewProps {
  transactions: Transaction[];
  accounts: Account[];
  assets: Asset[];
  debts: Debt[];
  userProfile: { name: string; baseCurrency: string; accentColor: string; avatarUrl?: string; email?: string };
  onNavigate: (tab: string) => void;
  onCommitAI: (tx: ParsedTransaction) => void;
}

export function DashboardView({
  transactions,
  accounts,
  assets,
  debts,
  userProfile,
  onNavigate,
  onCommitAI
}: DashboardViewProps) {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // AI Assistant Panel Inline States
  const [aiText, setAiText] = useState('');
  const [parsedList, setParsedList] = useState<Array<ParsedTransaction & { rawText: string; id: number }>>([]);
  const [showCommitToast, setShowCommitToast] = useState(false);
  const [committedCount, setCommittedCount] = useState(0);

  // Date filter states
  const [filterYear, setFilterYear] = useState<string>('Semua');
  const [filterMonth, setFilterMonth] = useState<string>('Semua');
  const [filterDay, setFilterDay] = useState<string>('Semua');

  const availableYears = Array.from(new Set(
    transactions
      .map(t => t.date ? t.date.split('-')[0] : '')
      .filter(y => y && y.length === 4)
  )).sort((a, b) => b.localeCompare(a));
  
  if (availableYears.length === 0) {
    availableYears.push('2026');
  }

  const monthsList = [
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ].sort((a, b) => a.value.localeCompare(b.value));

  const daysList = Array.from({ length: 31 }, (_, i) => {
    return (i + 1).toString().padStart(2, '0');
  });

  const getSelectedPeriodLabel = () => {
    if (filterDay === 'Semua' && filterMonth === 'Semua' && filterYear === 'Semua') {
      return 'Semua Waktu';
    }
    
    let label = '';
    if (filterDay !== 'Semua') {
      label += `${parseInt(filterDay)} `;
    }
    
    if (filterMonth !== 'Semua') {
      const mObj = monthsList.find(m => m.value === filterMonth);
      label += `${mObj ? mObj.label : filterMonth} `;
    }
    
    if (filterYear !== 'Semua') {
      label += filterYear;
    } else if (label !== '') {
      label += '(Semua Tahun)';
    }
    
    return label.trim();
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (!tx.date) return true;
    const parts = tx.date.split('-');
    if (parts.length < 3) return true;
    const [y, m, d] = parts;
    const matchesYear = filterYear === 'Semua' || y === filterYear;
    const matchesMonth = filterMonth === 'Semua' || m === filterMonth;
    const matchesDay = filterDay === 'Semua' || d === filterDay;
    return matchesYear && matchesMonth && matchesDay;
  });

  // Financial Calculations using filteredTransactions
  const totalLiquid = accounts.reduce((sum, a) => sum + a.balance, 0);
  
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'Pemasukan')
    .reduce((sum, t) => sum + t.nominal, 0);
    
  const totalExpense = filteredTransactions
    .filter(t => t.type === 'Pengeluaran')
    .reduce((sum, t) => sum + t.nominal, 0);

  const totalAssetVal = assets.reduce((sum, a) => sum + (a.units * a.marketPrice), 0);
  
  const totalDebtVal = debts
    .filter(d => d.type === 'Hutang')
    .reduce((sum, d) => sum + (d.nominal - d.paidNominal), 0);
    
  const totalPiutangVal = debts
    .filter(d => d.type === 'Piutang')
    .reduce((sum, d) => sum + (d.nominal - d.paidNominal), 0);

  const netNetBalance = totalLiquid + totalAssetVal + totalPiutangVal - totalDebtVal;

  const financialHealth = calculateFinancialHealth(filteredTransactions, debts, accounts);

  // Spendings by Category
  const categorySummary = filteredTransactions
    .filter(t => t.type === 'Pengeluaran')
    .reduce((acc: Record<string, number>, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.nominal;
      return acc;
    }, {});

  const largestExpenseCategory = Object.entries(categorySummary)
    .sort((a, b) => b[1] - a[1])[0] || ['Tidak ada', 0];

  // Sync Input Parsing
  useEffect(() => {
    if (!aiText) {
      setParsedList([]);
      return;
    }

    const lines = aiText.split('\n');
    const items = lines.map((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return null;
      
      const parsedItem = parseFinanceText(trimmedLine);
      return {
        ...parsedItem,
        rawText: trimmedLine,
        id: index
      };
    }).filter(item => item !== null) as Array<ParsedTransaction & { rawText: string; id: number }>;

    setParsedList(items);
  }, [aiText]);

  // Apply quick AI scripts
  const handleApplyQuickAI = (text: string) => {
    setAiText(text);
  };

  const handleCommitAllAI = () => {
    const valids = parsedList.filter(item => item.nominal > 0);
    if (valids.length === 0) return;

    valids.forEach((tx) => {
      onCommitAI(tx);
    });

    setCommittedCount(valids.length);
    setAiText('');
    setParsedList([]);
    setShowCommitToast(true);
    
    setTimeout(() => {
      setShowCommitToast(false);
    }, 4500);
  };

  // Remove single raw line
  const handleRemoveRawLine = (idToRemove: number) => {
    const lines = aiText.split('\n');
    const cleaned = lines.filter((_, idx) => idx !== idToRemove);
    setAiText(cleaned.join('\n'));
  };

  const totalValidNominal = parsedList
    .filter(item => item.nominal > 0)
    .reduce((sum, item) => sum + (item.type === 'Pemasukan' ? item.nominal : -item.nominal), 0);

  // Chart Rendering
  useEffect(() => {
    if (!chartRef.current) return;
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const cashflowData = {
      labels: ['Pemasukan', 'Pengeluaran', 'Liquid Aset', 'Liabilitas'],
      datasets: [
        {
          label: 'Alokasi Dana (Rp)',
          data: [totalIncome, totalExpense, totalLiquid, totalDebtVal],
          backgroundColor: [
            'rgba(0, 255, 163, 0.75)',
            'rgba(255, 92, 122, 0.75)',
            'rgba(124, 92, 255, 0.75)',
            'rgba(255, 181, 71, 0.75)'
          ],
          borderColor: [
            '#00ffa3',
            '#ff5c7a',
            '#7c5cff',
            '#ffb547'
          ],
          borderWidth: 1.5,
          borderRadius: 12,
          hoverBackgroundColor: [
            'rgba(0, 255, 163, 0.95)',
            'rgba(255, 92, 122, 0.95)',
            'rgba(124, 92, 255, 0.95)',
            'rgba(255, 181, 71, 0.95)'
          ],
        }
      ]
    };

    const myChart = new Chart(ctx, {
      type: 'bar',
      data: cashflowData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(6, 8, 22, 0.95)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.08)',
            padding: 14,
            cornerRadius: 12,
            titleFont: { size: 11, weight: 'bold' },
            bodyFont: { size: 13, family: 'monospace' }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.03)' },
            ticks: { color: '#9aa4bf', font: { size: 10, weight: 'bold' } }
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
      myChart.destroy();
    };
  }, [totalIncome, totalExpense, totalLiquid, totalDebtVal]);

  const recentTx = filteredTransactions.slice(-4).reverse();

  // Color cleaning filters for HTML2Canvas & jsPDF exports (safeguard against modern OKLab/OKLch styles)
  const cleanCSSColors = (cssText: string): string => {
    let updated = cssText;

    const cleanColorMix = (str: string): string => {
      let currentStr = str;
      let idx = currentStr.indexOf('color-mix(');
      while (idx !== -1) {
        let depth = 1;
        let endIdx = -1;
        for (let i = idx + 10; i < currentStr.length; i++) {
          if (currentStr[i] === '(') depth++;
          else if (currentStr[i] === ')') {
            depth--;
            if (depth === 0) {
              endIdx = i;
              break;
            }
          }
        }
        if (endIdx === -1) break;

        const content = currentStr.substring(idx + 10, endIdx); // e.g. "in srgb, rgb(255, 255, 255) 3%, transparent"

        // Parse the percentage
        const pctMatch = content.match(/(\d+(?:\.\d+)?)\s*%/);
        const percentage = pctMatch ? parseFloat(pctMatch[1]) / 100 : 0.5;

        // Try to match standard color functions or values
        const rgbMatch = content.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/i);
        const hexMatch = content.match(/#[0-9a-f]{3,8}/i);

        let replacement = 'transparent';

        if (rgbMatch) {
          const rgbStr = rgbMatch[0];
          const inner = rgbStr.replace(/rgba?\(\s*/i, '').replace(/\s*\)/, '');
          const parts = inner.split(',').map(p => parseFloat(p.trim()));
          const r = parts[0];
          const g = parts[1];
          const b = parts[2];
          const origAlpha = parts[3] !== undefined ? parts[3] : 1;
          const finalAlpha = origAlpha * percentage;
          replacement = `rgba(${r}, ${g}, ${b}, ${finalAlpha})`;
        } else if (hexMatch) {
          const hex = hexMatch[0];
          let r = 255, g = 255, b = 255;
          if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
          } else if (hex.length >= 7) {
            r = parseInt(hex.substring(1, 3), 16);
            g = parseInt(hex.substring(3, 5), 16);
            b = parseInt(hex.substring(5, 7), 16);
          }
          replacement = `rgba(${r}, ${g}, ${b}, ${percentage})`;
        } else {
          // Keyword parsing for uncomputed Tailwind v4 design token fallbacks
          if (content.includes('white') || content.includes('color-white')) {
            replacement = `rgba(255, 255, 255, ${percentage})`;
          } else if (content.includes('blue') || content.includes('blue-500') || content.includes('3b82f6')) {
            replacement = `rgba(59, 130, 246, ${percentage})`;
          } else if (content.includes('green') || content.includes('emerald') || content.includes('00ffa3')) {
            replacement = `rgba(0, 255, 163, ${percentage})`;
          } else if (content.includes('red') || content.includes('ff5c7a') || content.includes('ef4444')) {
            replacement = `rgba(255, 92, 122, ${percentage})`;
          } else if (content.includes('purple') || content.includes('7c5cff')) {
            replacement = `rgba(124, 92, 255, ${percentage})`;
          } else if (content.includes('amber') || content.includes('ffb547')) {
            replacement = `rgba(255, 181, 71, ${percentage})`;
          } else if (content.includes('11182d') || content.includes('slate-900') || content.includes('17, 24, 45')) {
            replacement = `rgba(17, 24, 45, ${percentage})`;
          } else if (content.includes('0c1020') || content.includes('12, 16, 32')) {
            replacement = `rgba(12, 16, 32, ${percentage})`;
          } else if (content.includes('060816') || content.includes('6, 8, 22')) {
            replacement = `rgba(6, 8, 22, ${percentage})`;
          } else if (content.includes('slate-950') || content.includes('020617') || content.includes('2, 6, 23')) {
            replacement = `rgba(2, 6, 23, ${percentage})`;
          } else {
            replacement = `rgba(255, 255, 255, ${percentage})`;
          }
        }

        currentStr = currentStr.substring(0, idx) + replacement + currentStr.substring(endIdx + 1);
        idx = currentStr.indexOf('color-mix(');
      }
      return currentStr;
    };

    updated = cleanColorMix(updated);

    updated = updated.replace(/oklab\s*\(\s*([^)]+)\s*\)/g, (match, content) => {
      try {
        const parts = content.trim().split(/\s*[\s/]\s*/);
        if (parts.length < 3) return match;
        
        const parseValue = (str: string) => {
          if (str.endsWith('%')) {
            return parseFloat(str) / 100;
          }
          return parseFloat(str);
        };

        const oklabL = parseValue(parts[0]);
        const oklaba = parseFloat(parts[1]);
        const oklabb = parseFloat(parts[2]);
        const alphaStr = parts[3];
        const alpha = alphaStr !== undefined ? parseValue(alphaStr) : undefined;

        if (isNaN(oklabL) || isNaN(oklaba) || isNaN(oklabb)) return match;

        let l_ = oklabL + 0.3963377774 * oklaba + 0.2158037573 * oklabb;
        let m_ = oklabL - 0.1055613458 * oklaba - 0.0638541728 * oklabb;
        let s_ = oklabL - 0.0894841775 * oklaba - 1.2914855480 * oklabb;

        let l = Math.max(0, l_ ** 3);
        let m = Math.max(0, m_ ** 3);
        let s = Math.max(0, s_ ** 3);

        let r_lin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
        let g_lin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
        let b_lin = -0.0041960863 * l - 0.7034186147 * m + 1.7076127010 * s;

        const fn = (c: number) => {
          return c >= 0.0031308 ? 1.055 * (c ** (1.0 / 2.4)) - 0.055 : 12.92 * c;
        };

        let rVal = Math.round(Math.max(0, Math.min(1, fn(r_lin))) * 255);
        let gVal = Math.round(Math.max(0, Math.min(1, fn(g_lin))) * 255);
        let bVal = Math.round(Math.max(0, Math.min(1, fn(b_lin))) * 255);

        if (alpha !== undefined && !isNaN(alpha)) {
          return `rgba(${rVal}, ${gVal}, ${bVal}, ${alpha})`;
        } else {
          return `rgb(${rVal}, ${gVal}, ${bVal})`;
        }
      } catch (e) {
        return match;
      }
    });

    updated = updated.replace(/oklch\s*\(\s*([^)]+)\s*\)/g, (match, content) => {
      try {
        const parts = content.trim().split(/\s*[\s/]\s*/);
        if (parts.length < 3) return match;
        
        const parseValue = (str: string) => {
          if (str.endsWith('%')) {
            return parseFloat(str) / 100;
          }
          return parseFloat(str);
        };

        const lchL = parseValue(parts[0]);
        const lchC = parseFloat(parts[1]);
        const H_val = parts[2];
        
        let H = parseFloat(H_val);
         if (H_val.endsWith('deg')) {
          H = parseFloat(H_val);
        } else if (H_val.endsWith('rad')) {
          H = parseFloat(H_val) * 180 / Math.PI;
         } else if (H_val.endsWith('turn')) {
          H = parseFloat(H_val) * 360;
        }
        
        const alphaStr = parts[3];
        const alpha = alphaStr !== undefined ? parseValue(alphaStr) : undefined;

        if (isNaN(lchL) || isNaN(lchC) || isNaN(H)) return match;

        const H_rad = (H * Math.PI) / 180;
        const lch_a = lchC * Math.cos(H_rad);
        const lch_b = lchC * Math.sin(H_rad);

        let l_ = lchL + 0.3963377774 * lch_a + 0.2158037573 * lch_b;
        let m_ = lchL - 0.1055613458 * lch_a - 0.0638541728 * lch_b;
        let s_ = lchL - 0.0894841775 * lch_a - 1.2914855480 * lch_b;

        let l = Math.max(0, l_ ** 3);
        let m = Math.max(0, m_ ** 3);
        let s = Math.max(0, s_ ** 3);

        let r_lin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
        let g_lin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
        let b_lin = -0.0041960863 * l - 0.7034186147 * m + 1.7076127010 * s;

        const fn = (c: number) => {
          return c >= 0.0031308 ? 1.055 * (c ** (1.0 / 2.4)) - 0.055 : 12.92 * c;
        };

        let rVal = Math.round(Math.max(0, Math.min(1, fn(r_lin))) * 255);
        let gVal = Math.round(Math.max(0, Math.min(1, fn(g_lin))) * 255);
        let bVal = Math.round(Math.max(0, Math.min(1, fn(b_lin))) * 255);

        if (alpha !== undefined && !isNaN(alpha)) {
          return `rgba(${rVal}, ${gVal}, ${bVal}, ${alpha})`;
        } else {
          return `rgb(${rVal}, ${gVal}, ${bVal})`;
        }
      } catch (e) {
        return match;
      }
    });

    return updated;
  };

  const patchGetComputedStyle = (win: any): () => void => {
    if (!win) return () => {};
    try {
      const orig = win.getComputedStyle;
      if (!orig) return () => {};
      win.getComputedStyle = function (elt: any, pseudoElt: any) {
        const style = orig.call(win, elt, pseudoElt);
        if (!style) return style;
        return new Proxy(style, {
          get(target, prop) {
            if (prop === 'getPropertyValue') {
              return (propertyName: string) => {
                const val = target.getPropertyValue(propertyName);
                if (typeof val === 'string' && (val.includes('oklab') || val.includes('oklch') || val.includes('color-mix'))) {
                  return cleanCSSColors(val);
                }
                return val;
              };
            }
            const val = Reflect.get(target, prop);
            if (typeof val === 'string' && (val.includes('oklab') || val.includes('oklch') || val.includes('color-mix'))) {
              return cleanCSSColors(val);
            }
            if (typeof val === 'function') {
              return val.bind(target);
            }
            return val;
          }
        });
      };
      return () => {
        win.getComputedStyle = orig;
      };
    } catch (err) {
      console.warn('Failed to patch getComputedStyle', err);
      return () => {};
    }
  };

  const handleExportPNG = async () => {
    if (!dashboardRef.current) return;
    setIsCapturing(true);

    try {
      if (document.fonts) {
        await document.fonts.ready;
      }
    } catch (fontErr) {
      console.warn('Delayed font load ignored:', fontErr);
    }

    const restoreHostWindow = patchGetComputedStyle(window);

    try {
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: '#060816',
        scale: 2.2,
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
          if (clonedDoc.defaultView) {
            patchGetComputedStyle(clonedDoc.defaultView);
          }

          // Define container geometry rules
          const target = clonedDoc.getElementById('export-target-container');
          if (target) {
            target.style.width = '1200px';
            target.style.minWidth = '1200px';
            target.style.padding = '32px';
            target.style.backgroundColor = '#060816';
            target.style.borderRadius = '24px';
            target.style.overflow = 'visible';
          }

          // Hide interactive dropdown selects but keep the beautiful selected period title
          const filterSelectors = clonedDoc.getElementById('dashboard-filter-selectors');
          if (filterSelectors) {
            filterSelectors.style.display = 'none';
          }

          // Metric cards grid: force 6 columns & remove ellipses
          const metricGrid = clonedDoc.getElementById('metric-cards');
          if (metricGrid) {
            metricGrid.className = 'grid grid-cols-6 gap-4';
            const truncs = metricGrid.querySelectorAll('.truncate');
            truncs.forEach((el) => {
              el.classList.remove('truncate');
            });
          }

          // Bento columns: force side-by-side bento layout (12 cols)
          const bentoGrid = clonedDoc.getElementById('bento-grid');
          if (bentoGrid) {
            bentoGrid.className = 'grid grid-cols-12 gap-5';
          }

          const chartCol = clonedDoc.getElementById('chart-card-col');
          if (chartCol) {
            chartCol.className = 'col-span-8 bg-[#0c1020]/90 backdrop-blur-md border border-white/[0.06] p-5 rounded-3xl shadow-lg flex flex-col justify-between';
          }

          const networthCol = clonedDoc.getElementById('networth-card-col');
          if (networthCol) {
            networthCol.className = 'col-span-4 flex flex-col justify-between gap-4';
          }

          // Transactions list: force 2 columns
          const txGrid = clonedDoc.getElementById('recent-transactions-grid');
          if (txGrid) {
            txGrid.className = 'grid grid-cols-2 gap-3.5';
            const truncs = txGrid.querySelectorAll('.truncate');
            truncs.forEach((el) => {
              el.classList.remove('truncate');
              el.className = el.className.replace(/max-w-\[[^\]]+\]/g, ''); 
            });
          }

          // Inject styling and force Inter & JetBrains Mono loaded fonts natively
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
            #export-target-container, #export-target-container * {
              font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
            }
            #export-target-container .font-mono, 
            #export-target-container [class*="font-mono"],
            #export-target-container p[class*="font-mono"] {
              font-family: 'JetBrains Mono', monospace !important;
            }
          `;
          clonedDoc.head.appendChild(style);

          const styleTags = Array.from(clonedDoc.getElementsByTagName('style'));
          styleTags.forEach((tag) => {
            if (tag.textContent) {
              tag.textContent = cleanCSSColors(tag.textContent);
            }
          });

          try {
            Array.from(clonedDoc.styleSheets).forEach((sheet) => {
              try {
                if (!sheet.cssRules) return;
                const rules = Array.from(sheet.cssRules);
                for (let i = rules.length - 1; i >= 0; i--) {
                  const rule = rules[i];
                  const ruleText = rule.cssText;
                  if (ruleText.includes('oklab') || ruleText.includes('oklch') || ruleText.includes('color-mix')) {
                    try {
                      const cleaned = cleanCSSColors(ruleText);
                      sheet.deleteRule(i);
                      sheet.insertRule(cleaned, i);
                    } catch (err) {
                      sheet.deleteRule(i);
                    }
                  }
                }
              } catch (e) {
                // cross origin restrictions bypass
              }
            });
          } catch (err) {
            console.warn('Style cleanup warning in clone:', err);
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'Dashboard-Financial-Premium.png';
      link.href = imgData;
      link.click();
    } catch (e) {
      console.error('Failed capturing dashboard image:', e);
    } finally {
      restoreHostWindow();
      setIsCapturing(false);
    }
  };

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    setIsCapturing(true);

    try {
      if (document.fonts) {
        await document.fonts.ready;
      }
    } catch (fontErr) {
      console.warn('Delayed font load ignored:', fontErr);
    }

    const restoreHostWindow = patchGetComputedStyle(window);

    try {
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: '#060816',
        scale: 2.0,
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
          if (clonedDoc.defaultView) {
            patchGetComputedStyle(clonedDoc.defaultView);
          }

          // Define container geometry rules
          const target = clonedDoc.getElementById('export-target-container');
          if (target) {
            target.style.width = '1200px';
            target.style.minWidth = '1200px';
            target.style.padding = '32px';
            target.style.backgroundColor = '#060816';
            target.style.borderRadius = '24px';
            target.style.overflow = 'visible';
          }

          // Hide interactive dropdown selects but keep the beautiful selected period title
          const filterSelectors = clonedDoc.getElementById('dashboard-filter-selectors');
          if (filterSelectors) {
            filterSelectors.style.display = 'none';
          }

          // Metric cards grid: force 6 columns & remove ellipses
          const metricGrid = clonedDoc.getElementById('metric-cards');
          if (metricGrid) {
            metricGrid.className = 'grid grid-cols-6 gap-4';
            const truncs = metricGrid.querySelectorAll('.truncate');
            truncs.forEach((el) => {
              el.classList.remove('truncate');
            });
          }

          // Bento columns: force side-by-side bento layout (12 cols)
          const bentoGrid = clonedDoc.getElementById('bento-grid');
          if (bentoGrid) {
            bentoGrid.className = 'grid grid-cols-12 gap-5';
          }

          const chartCol = clonedDoc.getElementById('chart-card-col');
          if (chartCol) {
            chartCol.className = 'col-span-8 bg-[#0c1020]/90 backdrop-blur-md border border-white/[0.06] p-5 rounded-3xl shadow-lg flex flex-col justify-between';
          }

          const networthCol = clonedDoc.getElementById('networth-card-col');
          if (networthCol) {
            networthCol.className = 'col-span-4 flex flex-col justify-between gap-4';
          }

          // Transactions list: force 2 columns
          const txGrid = clonedDoc.getElementById('recent-transactions-grid');
          if (txGrid) {
            txGrid.className = 'grid grid-cols-2 gap-3.5';
            const truncs = txGrid.querySelectorAll('.truncate');
            truncs.forEach((el) => {
              el.classList.remove('truncate');
              el.className = el.className.replace(/max-w-\[[^\]]+\]/g, ''); 
            });
          }

          // Inject styling and force Inter & JetBrains Mono loaded fonts natively
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
            #export-target-container, #export-target-container * {
              font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
            }
            #export-target-container .font-mono, 
            #export-target-container [class*="font-mono"],
            #export-target-container p[class*="font-mono"] {
              font-family: 'JetBrains Mono', monospace !important;
            }
          `;
          clonedDoc.head.appendChild(style);

          const styleTags = Array.from(clonedDoc.getElementsByTagName('style'));
          styleTags.forEach((tag) => {
            if (tag.textContent) {
              tag.textContent = cleanCSSColors(tag.textContent);
            }
          });

          try {
            Array.from(clonedDoc.styleSheets).forEach((sheet) => {
              try {
                if (!sheet.cssRules) return;
                const rules = Array.from(sheet.cssRules);
                for (let i = rules.length - 1; i >= 0; i--) {
                  const rule = rules[i];
                  const ruleText = rule.cssText;
                  if (ruleText.includes('oklab') || ruleText.includes('oklch') || ruleText.includes('color-mix')) {
                    try {
                      const cleaned = cleanCSSColors(ruleText);
                      sheet.deleteRule(i);
                      sheet.insertRule(cleaned, i);
                    } catch (err) {
                      sheet.deleteRule(i);
                    }
                  }
                }
              } catch (e) {
                // cross origin bypass
              }
            });
          } catch (err) {
            console.warn('Stylesheet override warning inside pdf generation:', err);
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const orientation = canvasWidth > canvasHeight ? 'l' : 'p';

      const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();

      const ratio = canvasWidth / canvasHeight;
      let width = pdfWidth - 16; 
      let height = width / ratio;

      if (height > (pdfHeight - 16)) {
        height = pdfHeight - 16;
        width = height * ratio;
      }

      const x = (pdfWidth - width) / 2;
      const y = (pdfHeight - height) / 2;

      doc.addImage(imgData, 'PNG', x, y, width, height, undefined, 'FAST');
      doc.save('Laporan-Dashboard-Premium.pdf');
    } catch (e) {
      console.error('PDF compiling crashed:', e);
    } finally {
      restoreHostWindow();
      setIsCapturing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. HERO HEADER AREA - STRICT REDESIGN IN LUXURY FINTECH STYLE */}
      <div className="space-y-5">
        <div 
          className="relative overflow-hidden p-6 sm:p-7 rounded-[26px] bg-[#11182D]/80 backdrop-blur-xl border border-white/[0.08] shadow-[0_25px_60px_rgba(3,4,9,0.5)] group"
          id="dashboard-hero"
        >
          {/* Subtle animated gradient orbs */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-[#7c5cff]/10 to-[#00ffa3]/5 rounded-full blur-[120px] pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
          <div className="absolute -bottom-20 -left-10 w-80 h-80 bg-[#00d2ff]/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-1.5 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#7c5cff]/15 border border-[#7c5cff]/20 rounded-full">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ffa3]/80 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00ffa3]"></span>
                </span>
                <p className="text-[10px] font-bold text-[#00ffa3] tracking-widest uppercase font-mono">FINTECH WEALTH INTELLIGENCE</p>
              </div>
              
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Operasional Keuangan Pribadi AI
              </h1>
              <p className="text-xs sm:text-sm text-[#9aa4bf] max-w-xl font-medium leading-relaxed">
                Tinjau sisa alokasi saldo, portofolio aset global, dan indeks kesejahteraan finansial real-time Anda secara akurat.
              </p>
            </div>

            {/* Health Index Compact Analytics Meter */}
            <div className="flex flex-col items-start md:items-end bg-slate-900/40 backdrop-blur-md rounded-2xl p-4 border border-white/[0.1] min-w-[210px] hover:border-[#00d2ff]/30 transition-all duration-300">
              <span className="text-[9px] text-[#9aa4bf] uppercase font-mono font-bold tracking-widest mb-1">HEALTH CAPITAL RATING</span>
              
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white tracking-tight">{financialHealth.score}</span>
                <span className="text-xs text-[#9aa4bf] font-mono">/100</span>
                <span className={`ml-2 px-2.5 py-0.5 text-[9px] font-extrabold uppercase rounded-full tracking-wider ${
                  financialHealth.score >= 80 ? 'bg-[#00ffa3]/10 text-[#00ffa3] border border-[#00ffa3]/20' : 
                  financialHealth.score >= 60 ? 'bg-amber-500/10 text-[#ffb547] border border-amber-500/20' : 
                  'bg-red-500/10 text-[#ff5c7a] border border-red-500/20'
                }`}>
                  {financialHealth.status}
                </span>
              </div>
              
              {/* Dynamic Progress indicator */}
              <div className="w-full mt-3 bg-white/[0.05] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-[#7c5cff] via-[#00d2ff] to-[#00ffa3] transition-all duration-500" 
                  style={{ width: `${financialHealth.score}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. REPOSITIONED COMPACT EXPORT TOOLBAR */}
        <div className="flex justify-end items-center py-0.5 bg-transparent" id="export-toolbar">
          <div className="flex items-center gap-2 bg-[#11182D]/40 p-1.5 rounded-2xl border border-white/[0.05] backdrop-blur-sm">
            <span className="text-[10px] text-[#9aa4bf] font-mono font-bold px-2 inline-flex items-center gap-1">
              <FileText className="h-3 w-3 text-[#7c5cff]" /> ARSIP VISUAL:
            </span>
            <button
              onClick={handleExportPNG}
              disabled={isCapturing}
              className="px-3 py-1.5 rounded-xl bg-white/[0.03] text-[10px] text-[#9aa4bf] hover:text-white border border-white/[0.06] flex items-center gap-1 font-bold transition-all active:scale-95 duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Download className="h-3 w-3 text-[#00d2ff]" />
              <span>{isCapturing ? 'Menyiapkan...' : 'PNG'}</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isCapturing}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#7c5cff] to-[#6c4be6] text-[10px] text-white hover:shadow-[0_0_12px_rgba(124,92,255,0.3)] flex items-center gap-1 font-bold transition-all active:scale-95 duration-200 cursor-pointer border border-[#7c5cff]/30 disabled:opacity-30"
            >
              <FileText className="h-3 w-3 text-white" />
              <span>{isCapturing ? 'Mencetak...' : 'Cetak PDF'}</span>
            </button>
          </div>
        </div>

        {/* 3. AI SMART INPUT PROMOTION BANNER & SHORTCUT */}
        <div 
          id="ai-smart-input-promo" 
          className="relative overflow-hidden p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-[#11182d]/90 via-[#10152a]/90 to-[#0a0c16]/90 border border-[#7c5cff]/20 shadow-[0_15px_35px_rgba(0,0,0,0.3)] group transition-all duration-300 hover:border-[#7c5cff]/35"
        >
          {/* Subtle animated glowing background elements */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#7c5cff]/5 rounded-full blur-[90px] pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
          <div className="absolute -bottom-20 -left-10 w-60 h-60 bg-[#00ffa3]/3 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 flex-1">
              <div className="p-3.5 rounded-2xl bg-[#7c5cff]/10 text-[#7c5cff] shadow-inner border border-[#7c5cff]/15 flex items-center justify-center shrink-0">
                <Sparkles className="h-6 w-6 text-[#7c5cff] animate-pulse" />
              </div>
              <div className="space-y-1.5 text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#00ffa3]/10 border border-[#00ffa3]/20 rounded-md">
                  <span className="h-1 bg-[#00ffa3] rounded-full"></span>
                  <span className="text-[9px] font-mono font-black tracking-wider text-[#00ffa3] uppercase text-left">Asisten Pintar AI</span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white m-0 p-0 text-left">
                  Pencatatan Multi-Mutasi Cepat dengan AI Smart Input
                </h2>
                <p className="text-xs text-[#9aa4bf] leading-relaxed max-w-2xl font-medium m-0 p-0 text-left">
                  Ketik laporan mutasi Anda dalam bahasa sehari-hari secara alami (misal: "makan pagi 25rb jago" atau "gaji bulanan bca 5jt"). Kecerdasan NLP lokal kami akan secara otomatis memilah nominal, mengalokasikan ke kategori belanja yang tepat, dan memperbarui saldo rekening akun Anda secara instan.
                </p>
              </div>
            </div>

            <div className="flex items-center shrink-0 w-full md:w-auto">
              <button
                id="btn-goto-ai-smart-input"
                onClick={() => onNavigate('ai-parser')}
                className="w-full md:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-[#7c5cff] to-[#00d2ff] hover:from-[#6c4be6] hover:to-[#00b2e6] text-white font-bold text-xs flex items-center justify-center gap-2 group/btn transition-all duration-300 shadow-[0_8px_20px_rgba(124,92,255,0.25)] hover:shadow-[0_8px_25px_rgba(124,92,255,0.4)] active:scale-97 hover:-translate-y-0.5"
              >
                <span>Buka AI Smart Input</span>
                <ChevronRight className="h-4 w-4 text-white group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* REPORT WRAPPER FOR EXPORT ONLY (METRICS + CHARTS + RECENT TRANSACTIONS) */}
        <div ref={dashboardRef} id="export-target-container" className="space-y-6 rounded-[26px] p-6 bg-[#060816] border border-white/[0.04] overflow-visible">
          
          {/* GORGEOUS DYNAMIC FILTER & META INFORMATIONAL BAR */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-[#0c1020]/80 p-4 rounded-2xl border border-white/[0.06] backdrop-blur-md" id="dashboard-filter-bar">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#7c5cff]/10 text-[#7c5cff] flex items-center justify-center">
                <Activity className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Laporan Arus Kas</h3>
                <p className="text-[10px] text-[#00ffa3] font-mono font-bold uppercase mt-1">
                  Periode: {getSelectedPeriodLabel()}
                </p>
              </div>
            </div>

            <div id="dashboard-filter-selectors" className="flex flex-wrap items-center gap-3 sm:gap-4 justify-start md:justify-end">
              {/* Selector Tanggal (Day) */}
              <div className="flex flex-col gap-1 items-start">
                <label className="text-[8px] font-mono text-[#9aa4bf] uppercase font-bold tracking-wider">Tanggal/Hari</label>
                <select
                  value={filterDay}
                  onChange={(e) => setFilterDay(e.target.value)}
                  className="bg-[#060813] text-[11px] font-mono rounded-lg border border-white/[0.08] text-white px-3 py-1.5 focus:outline-none focus:border-[#7c5cff]/60 focus:ring-1 focus:ring-[#7c5cff]/60 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  style={{ backgroundColor: '#060813', color: 'white' }}
                >
                  <option value="Semua" style={{ backgroundColor: '#0c1020', color: 'white' }}>Semua Tanggal</option>
                  {daysList.map((d) => (
                    <option key={d} value={d} style={{ backgroundColor: '#0c1020', color: 'white' }}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Selector Bulan (Month) */}
              <div className="flex flex-col gap-1 items-start">
                <label className="text-[8px] font-mono text-[#9aa4bf] uppercase font-bold tracking-wider">Bulan</label>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="bg-[#060813] text-[11px] font-mono rounded-lg border border-white/[0.08] text-white px-3 py-1.5 focus:outline-none focus:border-[#7c5cff]/60 focus:ring-1 focus:ring-[#7c5cff]/60 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  style={{ backgroundColor: '#060813', color: 'white' }}
                >
                  <option value="Semua" style={{ backgroundColor: '#0c1020', color: 'white' }}>Semua Bulan</option>
                  {monthsList.map((m) => (
                    <option key={m.value} value={m.value} style={{ backgroundColor: '#0c1020', color: 'white' }}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Selector Tahun (Year) */}
              <div className="flex flex-col gap-1 items-start">
                <label className="text-[8px] font-mono text-[#9aa4bf] uppercase font-bold tracking-wider">Tahun</label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="bg-[#060813] text-[11px] font-mono rounded-lg border border-white/[0.08] text-white px-3 py-1.5 focus:outline-none focus:border-[#7c5cff]/60 focus:ring-1 focus:ring-[#7c5cff]/60 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  style={{ backgroundColor: '#060813', color: 'white' }}
                >
                  <option value="Semua" style={{ backgroundColor: '#0c1020', color: 'white' }}>Semua Tahun</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y} style={{ backgroundColor: '#0c1020', color: 'white' }}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Reset Quick Filter Button */}
              {(filterDay !== 'Semua' || filterMonth !== 'Semua' || filterYear !== 'Semua') && (
                <button
                  onClick={() => {
                    setFilterDay('Semua');
                    setFilterMonth('Semua');
                    setFilterYear('Semua');
                  }}
                  className="self-end px-3 py-1.5 text-[10px] text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all font-bold cursor-pointer hover:border-red-500/35"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* 4. PREMIUM DESIGNED SIX METRIC CARDS GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4" id="metric-cards">
          {/* Card 1: Saldo Liquid */}
          <div className="relative overflow-visible bg-gradient-to-b from-white/[0.03] to-white/[0.01] hover:bg-white/[0.05] p-4 pb-6 rounded-[22px] border border-white/[0.06] hover:border-blue-400/35 hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_12px_24px_rgba(59,130,246,0.15)] group min-h-[148px] h-auto flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-105 transition-transform flex items-center justify-center">
                <Wallet className="h-4 w-4" />
              </span>
              <span className="inline-flex items-center h-5 px-2 text-[9px] font-mono font-bold text-blue-300 bg-blue-500/10 rounded tracking-wide uppercase">Liquid</span>
            </div>
            <div className="mt-3 text-left">
              <p className="text-[10px] text-[#9aa4bf]/90 font-bold uppercase tracking-wider leading-relaxed">SALDO BERSIH</p>
              <p className="text-sm sm:text-base font-black text-white tracking-tight mt-1 leading-relaxed truncate">{formatCurrency(totalLiquid)}</p>
              <p className="text-[9px] text-[#9aa4bf] mt-2.5 leading-normal font-mono font-medium">{`Total di seluruh Sumber Uang`}</p>
            </div>
          </div>

          {/* Card 2: Pemasukan */}
          <div className="relative overflow-visible bg-gradient-to-b from-white/[0.03] to-white/[0.01] hover:bg-white/[0.05] p-4 pb-6 rounded-[22px] border border-white/[0.06] hover:border-[#00ffa3]/35 hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_12px_24px_rgba(0,255,163,0.15)] group min-h-[148px] h-auto flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="p-1.5 rounded-lg bg-[#00ffa3]/10 text-[#00ffa3] group-hover:scale-105 transition-transform flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </span>
              <span className="inline-flex items-center h-5 px-2 text-[9px] font-mono font-bold text-[#00ffa3] bg-[#00ffa3]/10 rounded tracking-wide uppercase">Inflow</span>
            </div>
            <div className="mt-3 text-left">
              <p className="text-[10px] text-[#9aa4bf]/90 font-bold uppercase tracking-wider leading-relaxed">PEMASUKAN BULAN INI</p>
              <p className="text-sm sm:text-base font-black text-[#00ffa3] tracking-tight mt-1 leading-relaxed truncate">+{formatCurrency(totalIncome)}</p>
              <p className="text-[9px] text-[#9aa4bf] mt-2.5 leading-normal font-mono font-medium">{`Total transaksi masuk`}</p>
            </div>
          </div>

          {/* Card 3: Pengeluaran */}
          <div className="relative overflow-visible bg-gradient-to-b from-white/[0.03] to-white/[0.01] hover:bg-white/[0.05] p-4 pb-6 rounded-[22px] border border-white/[0.06] hover:border-red-400/35 hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_12px_24px_rgba(239,68,68,0.15)] group min-h-[148px] h-auto flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="p-1.5 rounded-lg bg-red-500/10 text-red-400 group-hover:scale-105 transition-transform flex items-center justify-center">
                <TrendingDown className="h-4 w-4" />
              </span>
              <span className="inline-flex items-center h-5 px-2 text-[9px] font-mono font-bold text-red-300 bg-red-500/10 rounded tracking-wide uppercase">Outflow</span>
            </div>
            <div className="mt-3 text-left">
              <p className="text-[10px] text-[#9aa4bf]/90 font-bold uppercase tracking-wider leading-relaxed">PENGELUARAN BULAN INI</p>
              <p className="text-sm sm:text-base font-black text-[#ff5c7a] tracking-tight mt-1 leading-relaxed truncate">-{formatCurrency(totalExpense)}</p>
              <p className="text-[9px] text-[#9aa4bf] mt-2.5 leading-normal font-mono font-medium">{`Total pengeluaran tercatat`}</p>
            </div>
          </div>

          {/* Card 4: Portofolio Aset */}
          <div className="relative overflow-visible bg-gradient-to-b from-white/[0.03] to-white/[0.01] hover:bg-white/[0.05] p-4 pb-6 rounded-[22px] border border-white/[0.06] hover:border-[#7c5cff]/35 hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_12px_24px_rgba(124,92,255,0.15)] group min-h-[148px] h-auto flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="p-1.5 rounded-lg bg-[#7c5cff]/10 text-[#7c5cff] group-hover:scale-105 transition-transform flex items-center justify-center">
                <Layers className="h-4 w-4 text-[#7c5cff]" />
              </span>
              <span className="inline-flex items-center h-5 px-2 text-[9px] font-mono font-bold text-[#7c5cff] bg-[#7c5cff]/10 rounded tracking-wide uppercase">Asset</span>
            </div>
            <div className="mt-3 text-left">
              <p className="text-[10px] text-[#9aa4bf]/90 font-bold uppercase tracking-wider leading-relaxed">TOTAL ASET</p>
              <p className="text-sm sm:text-base font-black text-white tracking-tight mt-1 leading-relaxed truncate">{formatCurrency(totalAssetVal)}</p>
              <p className="text-[9px] text-[#9aa4bf] mt-2.5 leading-normal font-mono font-medium">{`Investasi & tabungan lainnya`}</p>
            </div>
          </div>

          {/* Card 5: Liabilitas / Hutang */}
          <div className="relative overflow-visible bg-gradient-to-b from-white/[0.03] to-white/[0.01] hover:bg-white/[0.05] p-4 pb-6 rounded-[22px] border border-white/[0.06] hover:border-amber-400/35 hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_12px_24px_rgba(245,158,11,0.15)] group min-h-[148px] h-auto flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-[#ffb547] group-hover:scale-105 transition-transform flex items-center justify-center">
                <HeartPulse className="h-4 w-4" />
              </span>
              <span className="inline-flex items-center h-5 px-2 text-[9px] font-mono font-bold text-amber-300 bg-amber-500/10 rounded tracking-wide uppercase">Debt</span>
            </div>
            <div className="mt-3 text-left">
              <p className="text-[10px] text-[#9aa4bf]/90 font-bold uppercase tracking-wider leading-relaxed">TOTAL HUTANG</p>
              <p className="text-sm sm:text-base font-black text-[#ffb547] tracking-tight mt-1 leading-relaxed truncate">{formatCurrency(totalDebtVal)}</p>
              <p className="text-[9px] text-[#9aa4bf] mt-2.5 leading-normal font-mono font-medium">{`(jumlah hutang belum lunas)`}</p>
            </div>
          </div>

          {/* Card 6: Piutang */}
          <div className="relative overflow-visible bg-gradient-to-b from-white/[0.03] to-white/[0.01] hover:bg-white/[0.05] p-4 pb-6 rounded-[22px] border border-white/[0.06] hover:border-teal-400/35 hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_12px_24px_rgba(20,184,166,0.15)] group min-h-[148px] h-auto flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-300 group-hover:scale-105 transition-transform flex items-center justify-center">
                <Award className="h-4 w-4" />
              </span>
              <span className="inline-flex items-center h-5 px-2 text-[9px] font-mono font-bold text-teal-300 bg-teal-500/10 rounded tracking-wide uppercase">Receivable</span>
            </div>
            <div className="mt-3 text-left">
              <p className="text-[10px] text-[#9aa4bf]/90 font-bold uppercase tracking-wider leading-relaxed">TOTAL PIUTANG</p>
              <p className="text-sm sm:text-base font-black text-white tracking-tight mt-1 leading-relaxed truncate">{formatCurrency(totalPiutangVal)}</p>
              <p className="text-[9px] text-[#9aa4bf] mt-2.5 leading-normal font-mono font-medium">{`(jumlah piutang belum ditagih)`}</p>
            </div>
          </div>
        </div>

        {/* 5. CHARTS & INSIGHT BENTO BOX */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="bento-grid">
          {/* Dynamic Modern Cashflow Chart */}
          <div className="lg:col-span-8 bg-[#0c1020]/90 backdrop-blur-md border border-white/[0.06] p-5 rounded-3xl shadow-lg flex flex-col justify-between" id="chart-card-col">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/[0.04]">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-[#00d2ff]" /> Visualisasi & Trend Finansial
                </h2>
                <p className="text-[11px] text-[#9aa4bf]">Pembagian alokasi aset likuid, modal investasi, dan piutang harian</p>
              </div>
              <span className="px-2.5 py-0.5 bg-white/[0.04] text-[#9aa4bf] rounded-lg text-[9px] font-mono border border-white/[0.05]">Bulan Ini</span>
            </div>
            
            <div className="h-[224px] w-full relative">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>

          {/* Right Column: Net Worth Luxury Panel */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-4" id="networth-card-col">
            
            {/* NET CAPITAL WORTH ADVANCED ANALETICS */}
            <div className="bg-gradient-to-b from-[#11162d]/95 to-[#060814]/95 border border-[#7c5cff]/20 p-5 rounded-3xl flex flex-col justify-between hover:shadow-[0_0_20px_rgba(124,92,255,0.1)] transition-shadow">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold text-[#00d2ff] uppercase tracking-wider">NET CAPITAL WORTH</span>
                  <span className="text-[9px] text-[#9aa4bf] font-mono">Likuid + Investasi - Hutang</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2.5">
                  {formatCurrency(netNetBalance)}
                </h3>
              </div>
              
              <div className="mt-4 pt-3.5 border-t border-white/[0.05] space-y-2">
                <div className="flex justify-between text-[11px] text-[#9aa4bf]">
                  <span>Sektor Konsumsi Tertinggi:</span>
                  <span className="font-bold text-[#ff5c7a] truncate max-w-[130px] text-right">{largestExpenseCategory[0]}</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#9aa4bf]">
                  <span>Saving Ratio Bulanan:</span>
                  <span className="font-bold text-white">{financialHealth.savingsRate}%</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#9aa4bf]">
                  <span>Emergency Fund Ratio:</span>
                  <span className="font-bold text-[#16c784]">{financialHealth.emergencyFundRatio} bulan</span>
                </div>
              </div>
            </div>

            {/* SUMBER UANG DARI MANA SAJA COMPONENT */}
            <div className="bg-[#0b1020]/60 border border-white/[0.06] p-5 rounded-3xl shadow-md flex flex-col justify-between h-full min-h-[175px]">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-1.5">
                  <Wallet className="h-4 w-4 text-[#00ffa3]" />
                  <h4 className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">Sumber Uang Dari Mana Saja</h4>
                </div>
                <button 
                  onClick={() => onNavigate('accounts')}
                  className="text-[9px] text-[#7c5cff] hover:text-[#00ffa3] font-mono font-bold uppercase transition-colors mr-0.5 cursor-pointer"
                >
                  Kelola &rarr;
                </button>
              </div>
              
              <div className="space-y-3.5 max-h-[125px] overflow-y-auto pr-1">
                {accounts.map((acc) => {
                  const percent = totalLiquid > 0 ? (acc.balance / totalLiquid) * 100 : 0;
                  return (
                    <div key={acc.id} className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10.5px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`inline-block w-2 h-2 rounded-full shrink-0 bg-gradient-to-r ${acc.color || 'from-blue-600 to-blue-900'}`} />
                          <span className="font-bold text-white truncate max-w-[110px]">{acc.name}</span>
                          {acc.accountNumber && (
                            <span className="text-[8.5px] text-[#9aa4bf]/60 font-mono tracking-tighter truncate max-w-[80px]">({acc.accountNumber})</span>
                          )}
                        </div>
                        <span className="font-mono font-bold text-[#00ffa3] shrink-0">{formatCurrency(acc.balance)}</span>
                      </div>
                      
                      <div className="w-full bg-white/[0.03] h-1 rounded-full overflow-hidden border border-white/[0.04]">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 bg-gradient-to-r ${acc.color || 'from-[#7c5cff] to-[#00ffa3]'}`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 6. TRANSACTIONS SUMMARY LOG */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-white">4 Transaksi Terkini</h2>
              <p className="text-[11px] text-[#9aa4bf]">Rangkuman log mutasi uang masuk dan keluar terbaru</p>
            </div>
            
            <button 
              onClick={() => onNavigate('transactions')}
              className="flex items-center gap-1 text-[11px] text-[#7c5cff] hover:text-[#00d2ff] font-extrabold transition-colors cursor-pointer"
            >
              Semua Transaksi <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5" id="recent-transactions-grid">
            {recentTx.length === 0 ? (
              <div className="col-span-2 text-center py-7 bg-white/[0.01] border border-dashed border-white/[0.05] rounded-2xl">
                <p className="text-xs text-[#9aa4bf]">Belum ada data transaksi tercatat harian.</p>
              </div>
            ) : (
              recentTx.map((tx) => (
                <div 
                  key={tx.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-[#11182d]/40 border border-white/[0.05] hover:bg-[#11182d]/70 transition-all hover:border-[#7c5cff]/20"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl text-white flex items-center justify-center ${
                      tx.type === 'Pemasukan' ? 'bg-[#00ffa3]/10 text-[#00ffa3]' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {tx.type === 'Pemasukan' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[200px] leading-relaxed">{tx.title}</h4>
                      <p className="text-[10px] text-[#9aa4bf] mt-1.5 truncate leading-relaxed">{tx.category} • {tx.source} • {tx.date}</p>
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <p className={`text-xs font-black font-mono leading-relaxed ${
                      tx.type === 'Pemasukan' ? 'text-[#00ffa3]' : 'text-[#ff5c7a]'
                    }`}>
                      {tx.type === 'Pemasukan' ? '+' : '-'}{formatCurrency(tx.nominal)}
                    </p>
                    {tx.isRecurring && (
                      <span className="inline-flex items-center h-4 mt-1.5 text-[8px] font-mono font-semibold bg-[#7c5cff]/15 text-[#7c5cff] px-1.5 rounded border border-[#7c5cff]/10">Rutin</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
