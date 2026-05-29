/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  Briefcase, TrendingUp, TrendingDown, ArrowUpRight, DollarSign, Wallet, 
  Target, Award, HeartPulse, Sparkles, ChevronRight, Utensils, Car, ShoppingBag, 
  Wifi, HelpCircle, ShieldCheck, Smartphone, Info, Download, FileText,
  Activity, Trash2, Play, Check, CheckCircle2, ArrowDownRight, RefreshCw, Layers, Edit3, X, Zap,
  Calendar
} from 'lucide-react';
import Chart from 'chart.js/auto';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  Transaction, Account, Asset, Debt, 
  formatCurrency, calculateFinancialHealth 
} from '../utils/financeHelper';
import { parseFinanceText, ParsedTransaction, preprocessInputToLines } from '../utils/aiParser';

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
  
  const formatIDRWithSpace = (value: number) => {
    if (value === undefined || isNaN(value)) return 'Rp 0';
    const isNegative = value < 0;
    const absValue = Math.abs(value);
    const formatted = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(absValue);
    return `${isNegative ? '-' : ''}Rp ${formatted}`;
  };
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // AI Assistant Panel Inline States
  const [aiText, setAiText] = useState('');
  const [parsedList, setParsedList] = useState<Array<ParsedTransaction & { rawText: string; id: number }>>([]);
  const [showCommitToast, setShowCommitToast] = useState(false);
  const [committedCount, setCommittedCount] = useState(0);

  // Date filter states
  const [filterYear, setFilterYear] = useState<string>('2026');
  const [filterMonth, setFilterMonth] = useState<string>('05');
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

  const incomeCount = filteredTransactions.filter(t => t.type === 'Pemasukan').length;
  const averageIncome = incomeCount > 0 ? Math.round(totalIncome / incomeCount) : 0;

  const financialHealth = calculateFinancialHealth(filteredTransactions, debts, accounts);

  // Spendings by Category
  const categorySummary = filteredTransactions
    .filter(t => t.type === 'Pengeluaran')
    .reduce((acc: Record<string, number>, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.nominal;
      return acc;
    }, {});

  const sortedExpenseCategories = Object.entries(categorySummary)
    .sort((a, b) => b[1] - a[1]);

  const largestExpenseCategory = sortedExpenseCategories[0] || ['Tidak ada', 0];

  // Sync Input Parsing
  useEffect(() => {
    if (!aiText) {
      setParsedList([]);
      return;
    }

    const lines = preprocessInputToLines(aiText);
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
    const lines = preprocessInputToLines(aiText);
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
      labels: ['Pemasukan', 'Pengeluaran', 'Liquid Aset', 'Hutang'],
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

          // Show static text filter and hide selects
          const liveFilter = clonedDoc.getElementById('dashboard-filter-interactive');
          if (liveFilter) {
            liveFilter.style.display = 'none';
          }
          const staticFilter = clonedDoc.getElementById('dashboard-filter-static');
          if (staticFilter) {
            staticFilter.style.display = 'inline-flex';
          }

          // Hide detailed analytics, trend charts, and bottom logs to match screenshot exactly
          const detailSection = clonedDoc.getElementById('dashboard-detail-analytics');
          if (detailSection) {
            detailSection.style.display = 'none';
          }

          // Ensure no truncate classes get ugly dots during export
          const truncs = clonedDoc.querySelectorAll('.truncate');
          truncs.forEach((el) => {
            el.classList.remove('truncate');
          });

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

          // Show static text filter and hide selects
          const liveFilter = clonedDoc.getElementById('dashboard-filter-interactive');
          if (liveFilter) {
            liveFilter.style.display = 'none';
          }
          const staticFilter = clonedDoc.getElementById('dashboard-filter-static');
          if (staticFilter) {
            staticFilter.style.display = 'inline-flex';
          }

          // Hide detailed analytics, trend charts, and bottom logs to match screenshot exactly
          const detailSection = clonedDoc.getElementById('dashboard-detail-analytics');
          if (detailSection) {
            detailSection.style.display = 'none';
          }

          // Ensure no truncate classes get ugly dots during export
          const truncs = clonedDoc.querySelectorAll('.truncate');
          truncs.forEach((el) => {
            el.classList.remove('truncate');
          });

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
      {/* 1. VISUAL ACTION EXPORT TOOLBAR */}
      <div className="flex justify-between items-center py-1 bg-transparent border-b border-white/[0.04]" id="export-toolbar">
        <div className="text-xs text-[#9aa4bf] font-medium flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#16c784] animate-pulse"></span>
          Dasbor Interaktif Aktif
        </div>
        <div className="flex items-center gap-2 bg-[#11182D]/40 p-1 rounded-2xl border border-white/[0.05] backdrop-blur-sm">
          <span className="text-[10px] text-[#9aa4bf] font-mono font-bold px-2 inline-flex items-center gap-1">
            <FileText className="h-3 w-3 text-[#7c5cff]" /> ARSIP VISUAL:
          </span>
          <button
            onClick={handleExportPNG}
            disabled={isCapturing}
            className="px-3 py-1.5 rounded-xl bg-white/[0.03] text-[10px] text-[#9aa4bf] hover:text-white border border-white/[0.06] flex items-center gap-1 font-bold transition-all active:scale-95 duration-200 cursor-pointer disabled:opacity-30"
          >
            <Download className="h-3 w-3 text-[#00d2ff]" />
            <span>{isCapturing ? 'Mempersiapkan...' : 'Ekspor PNG'}</span>
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

      {/* 3. REPORT EXPORT BOUNDARY CONTAINER */}
      <div 
        ref={dashboardRef} 
        id="export-target-container" 
        className="space-y-6 rounded-[32px] p-6 sm:p-7 bg-[#060816] border border-white/[0.04] overflow-visible shadow-2xl relative"
      >
        {/* Glowing background highlights for overall canvas atmosphere */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#7c5cff]/5 to-[#16c784]/2 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-500/[0.02] rounded-full blur-[120px] pointer-events-none"></div>

        {/* HERO TITLE HEADER WITH MONTH DROPDOWN (Mockup Exact Alignment) */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-white/[0.05] pb-5 relative z-10" id="dashboard-filter-bar">
          <div className="space-y-1 text-left">
            <div className="text-[10px] text-[#16c784] font-bold uppercase tracking-widest font-mono">FINTECH WORKSPACE</div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
              Laporan Keuangan {userProfile.name || 'Naufal'}
            </h1>
            <p className="text-xs text-[#9aa4bf] mt-0.5">
              Selamat datang kembali, <span className="text-[#16c784] font-bold">{userProfile.name || 'Naufal Pratama'}</span>
            </p>
          </div>

          {/* Month selector styled matching the mockup option */}
          <div className="flex items-center self-start sm:self-center h-11 shrink-0">
            {/* 1. Interactive container shown on live screen, but hidden during export */}
            <div id="dashboard-filter-interactive" className="flex items-center gap-2 bg-[#0c1020] border border-white/[0.08] px-3.5 py-2.5 rounded-xl font-mono text-xs text-white">
              <Calendar className="h-4 w-4 text-[#16c784]" />
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-transparent font-sans font-bold text-white focus:outline-none cursor-pointer pr-1"
              >
                <option value="Semua" className="bg-[#0c1020]">Semua Bulan</option>
                {monthsList.map(m => (
                  <option key={m.value} value={m.value} className="bg-[#0c1020] text-white">{m.label}</option>
                ))}
              </select>
              <span className="text-[#9aa4bf]/40 mx-0.5">|</span>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="bg-transparent font-sans font-bold text-white focus:outline-none cursor-pointer"
              >
                <option value="Semua" className="bg-[#0c1020]">Semua Tahun</option>
                {availableYears.map(y => (
                  <option key={y} value={y} className="bg-[#0c1020] text-white">{y}</option>
                ))}
              </select>
            </div>

            {/* 2. Static clean text representation strictly for clean export (no shape/borders) */}
            <div id="dashboard-filter-static" className="hidden items-center gap-2 font-sans font-bold text-xs sm:text-sm text-white">
              <Calendar className="h-4 w-4 text-[#16c784] shrink-0" />
              <span>{filterMonth === 'Semua' ? 'Semua Bulan' : monthsList.find(m => m.value === filterMonth)?.label || filterMonth}</span>
              <span className="text-white/60 mx-1.5">|</span>
              <span>{filterYear === 'Semua' ? 'Semua Tahun' : filterYear}</span>
            </div>
          </div>
        </div>

        {/* ROW 1: THE THREE MAIN BENTO CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="metric-cards">
          
          {/* Card 1: TOTAL SALDO AKTIF */}
          <div className="bg-[#0c1020]/90 backdrop-blur-md border border-white/[0.06] p-5.5 rounded-[24px] shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[195px] text-left group">
            {/* Watermark Logo */}
            <Wallet className="w-18 h-18 text-white/[0.02] absolute -bottom-2 -right-2 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
            
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#9aa4bf] font-mono font-bold tracking-widest uppercase">TOTAL SALDO AKTIF</span>
                <span className="p-1.5 rounded-lg bg-[#16c784]/15 text-[#16c784]">
                  <Wallet className="h-3.5 w-3.5" />
                </span>
              </div>
              <h2 className="text-2xl sm:text-[27px] font-black text-white tracking-tight mt-2.5">
                {formatIDRWithSpace(totalLiquid)}
              </h2>
              <p className="text-[10.5px] text-[#9aa4bf]/80 mt-1">
                Akumulasi saldo riil di seluruh {accounts.length} rekening & dompet
              </p>
            </div>

            {/* List of accounts styled into pills */}
            <div className="grid grid-cols-2 gap-1.5 mt-3 pt-3 border-t border-white/[0.04]">
              {accounts.slice(0, 4).map((acc, index) => {
                const dotColors = ['bg-[#00ffa3]', 'bg-[#ffb547]', 'bg-[#00d4ff]', 'bg-[#7c5cff]'];
                const dotColor = dotColors[index % dotColors.length];
                const formattedPillBal = formatIDRWithSpace(acc.balance);
                const extraCount = accounts.length - 4;
                return (
                  <div key={acc.id} className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.04] px-2 py-1 rounded-lg text-[10px] text-[#9aa4bf] min-w-0">
                    <span className={`w-1 h-1 rounded-full ${dotColor} shrink-0`} />
                    <span className="truncate max-w-[65px] whitespace-nowrap font-medium text-white/85">{acc.name}</span>
                    <span className="font-mono text-white/80 font-bold ml-auto text-[9px]">{formattedPillBal}</span>
                    {index === 3 && extraCount > 0 && (
                      <span className="text-[#16c784] font-black shrink-0 text-[8.5px] ml-0.5">+{extraCount}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 2: PEMASUKAN BULAN INI */}
          <div className="bg-[#0c1020]/90 backdrop-blur-md border border-white/[0.06] p-5.5 rounded-[24px] shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[195px] text-left group">
            <TrendingUp className="w-18 h-18 text-white/[0.02] absolute -bottom-2 -right-2 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
            
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#9aa4bf] font-mono font-bold tracking-widest uppercase">PEMASUKAN BULAN INI</span>
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <h2 className="text-2xl sm:text-[27px] font-black text-[#00d4ff] tracking-tight mt-2.5">
                {formatIDRWithSpace(totalIncome)}
              </h2>
              <p className="text-[10.5px] text-[#9aa4bf]/80 mt-1">
                ↗ Pemasukan periode {getSelectedPeriodLabel()}
              </p>
            </div>

            {/* Outflow comparison footer row */}
            <div className="mt-4 pt-3.5 border-t border-white/[0.04] flex justify-between items-center text-[11px] text-[#9aa4bf]">
              <span>Rerata transaksi masuk:</span>
              <span className="font-mono font-bold text-white">{formatIDRWithSpace(averageIncome)}</span>
            </div>
          </div>

          {/* Card 3: PENGELUARAN BULAN INI */}
          <div className="bg-[#0c1020]/90 backdrop-blur-md border border-white/[0.06] p-5.5 rounded-[24px] shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[195px] text-left group">
            <TrendingDown className="w-18 h-18 text-white/[0.02] absolute -bottom-2 -right-2 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
            
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#9aa4bf] font-mono font-bold tracking-widest uppercase">PENGELUARAN BULAN INI</span>
                <span className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
                  <ArrowDownRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <h2 className="text-2xl sm:text-[27px] font-black text-[#ff5c7a] tracking-tight mt-2.5">
                {formatIDRWithSpace(totalExpense)}
              </h2>
              <p className="text-[10.5px] text-[#9aa4bf]/80 mt-1">
                ↘ {totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0}% dari pemasukan
              </p>
            </div>

            {/* Outflow comparison footer row */}
            <div className="mt-4 pt-3.5 border-t border-white/[0.04] flex justify-between items-center text-[11px] text-[#9aa4bf]">
              <span>Selisih (Net Cashflow):</span>
              <span className={`font-mono font-bold ${totalIncome - totalExpense >= 0 ? 'text-[#16c784]' : 'text-[#ff5c7a]'}`}>
                {totalIncome - totalExpense >= 0 ? '+' : ''}{formatIDRWithSpace(totalIncome - totalExpense)}
              </span>
            </div>
          </div>

        </div>

        {/* ROW 2: THREE SMALL THIN STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card A: KEKAYAAN ASET */}
          <div className="bg-[#0c1020]/50 border border-white/[0.05] p-4 rounded-2xl flex items-center gap-3.5">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-[#16c784] shrink-0">
              <TrendingUp className="h-4.5 w-4.5" />
            </span>
            <div className="text-left min-w-0">
              <p className="text-[9px] text-[#9aa4bf] font-mono font-bold tracking-widest uppercase truncate">KEKAYAAN ASET BERHARGA</p>
              <p className="text-sm sm:text-base font-black text-white mt-1 truncate">{formatIDRWithSpace(totalAssetVal)}</p>
            </div>
          </div>

          {/* Card B: PIUTANG AKTIF */}
          <div className="bg-[#0c1020]/50 border border-white/[0.05] p-4 rounded-2xl flex items-center gap-3.5">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
              <ArrowUpRight className="h-4.5 w-4.5" />
            </span>
            <div className="text-left min-w-0">
              <p className="text-[9px] text-[#9aa4bf] font-mono font-bold tracking-widest uppercase truncate">TOTAL TAGIHAN PIUTANG (AKTIF)</p>
              <p className="text-sm sm:text-base font-black text-white mt-1 truncate">{formatIDRWithSpace(totalPiutangVal)}</p>
            </div>
          </div>

          {/* Card C: HUTANG PRIBADI */}
          <div className="bg-[#0c1020]/50 border border-white/[0.05] p-4 rounded-2xl flex items-center gap-3.5">
            <span className="p-2 rounded-xl bg-red-500/10 text-red-00 shrink-0">
              <ArrowDownRight className="h-4.5 w-4.5 text-red-400" />
            </span>
            <div className="text-left min-w-0">
              <p className="text-[9px] text-[#9aa4bf] font-mono font-bold tracking-widest uppercase truncate">TAGIHAN HUTANG PRIBADI</p>
              <p className="text-sm sm:text-base font-black text-[#ff5c7a] mt-1 truncate">{formatIDRWithSpace(totalDebtVal)}</p>
            </div>
          </div>

        </div>

        {/* ROW 3: FULL WIDTH NET WORTH BAR */}
        <div className="bg-gradient-to-r from-[#11182d]/80 via-[#10152a]/80 to-[#0a0c16]/80 border border-[#16c784]/20 p-5 rounded-[22px] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative">
          <div className="absolute top-0 left-0 w-32 h-full bg-[#16c784]/[0.015] pointer-events-none blur-md rounded-[22px]"></div>
          
          <div className="flex items-center gap-3.5 text-left">
            <span className="p-3 rounded-xl bg-[#16c784]/15 text-[#16c784] flex items-center justify-center shrink-0">
              <DollarSign className="h-5.5 w-5.5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-white">Rumusan Estimasi Kekayaan Bersih (Net Worth)</h3>
              <p className="text-[11px] text-[#9aa4bf] mt-0.5 leading-relaxed">
                Diformulasikan dari Total Saldo Aktif + Portofolio Aset + Piutang Tagih - Beban Hutang.
              </p>
            </div>
          </div>

          <div className="text-left md:text-right shrink-0">
            <p className="text-[9px] text-[#16c784] font-mono font-bold tracking-widest uppercase">NET WORTH SAAT INI</p>
            <p className={`text-xl sm:text-2xl font-black mt-1 ${netNetBalance >= 0 ? 'text-[#16c784]' : 'text-[#ff5c7a]'}`}>
              {netNetBalance >= 0 ? '+' : ''}{formatIDRWithSpace(netNetBalance)}
            </p>
          </div>
        </div>

        {/* EXPANSIVE HISTORICAL CHARTS & DETAILED ANALYTICS (Placed beautifully below) */}
        <div className="pt-4 border-t border-white/[0.05] space-y-5" id="dashboard-detail-analytics">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="h-4 w-4 text-[#7c5cff]" />
            <h3 className="text-xs font-black text-[#9aa4bf] tracking-widest uppercase font-mono">Detail Analisis & Trend Historis</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="bento-grid">
            {/* Visualisasi Line Chart */}
            <div className="lg:col-span-8 bg-[#0c1020]/90 backdrop-blur-md border border-white/[0.06] p-5 rounded-3xl shadow-lg flex flex-col justify-between" id="chart-card-col">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/[0.04]">
                <div className="text-left">
                  <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-[#00d2ff]" /> {
                      filterMonth === 'Semua' && filterYear === 'Semua' 
                        ? 'Ikhtisar Keuangan Umum' 
                        : `Ikhtisar Keuangan ${filterMonth === 'Semua' ? '' : monthsList.find(m => m.value === filterMonth)?.label || ''} ${filterYear === 'Semua' ? '' : filterYear}`.trim()
                    }
                  </h2>
                  <p className="text-[11px] text-[#9aa4bf]">Grafik komparasi arus kas masuk (pemasukan) dan keluar (pengeluaran)</p>
                </div>
                <span className="px-2.5 py-0.5 bg-white/[0.04] text-[#9aa4bf] rounded-lg text-[9px] font-mono border border-white/[0.05]">Bulan Ini</span>
              </div>
              
              <div className="h-[224px] w-full relative">
                <canvas ref={chartRef}></canvas>
              </div>
            </div>

            {/* Sektor Konsumsi & Alokasi Modal */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-4" id="networth-card-col">
              {/* Sektor Konsumsi info card */}
              <div className="bg-gradient-to-b from-[#11162d]/60 to-[#060814]/60 border border-white/[0.06] p-4.5 rounded-2xl flex flex-col justify-between h-[150px] text-left">
                <div className="flex justify-between items-center mb-2 pb-1 border-b border-white/[0.03]">
                  <span className="text-[9px] font-mono font-bold text-[#ff5c7a] uppercase tracking-wider">daftar pengeluaran terbanyak</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff5c7a]"></span>
                </div>
                <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                  {sortedExpenseCategories.length > 0 ? (
                    sortedExpenseCategories.map(([category, amt], idx) => (
                      <div key={category} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[9px] font-bold text-[#ff5c7a]/60">#{idx + 1}</span>
                          <span className="font-bold text-white truncate max-w-[120px]">{category}</span>
                        </div>
                        <span className="font-mono text-[#ff5c7a] font-bold text-[11px] shrink-0">
                          {formatIDRWithSpace(amt)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-xs text-[#9aa4bf] py-5">Belum ada pengeluaran</div>
                  )}
                </div>
              </div>

              {/* Alokasi Sumber Dana / Rekening */}
              <div className="bg-[#0b1020]/80 border border-white/[0.06] p-4.5 rounded-2xl shadow-md flex flex-col justify-between min-h-[178px] text-left">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="h-4 w-4 text-[#00ffa3]" />
                    <h4 className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">Alokasi Simpanan Rekening</h4>
                  </div>
                  <button 
                    onClick={() => onNavigate('accounts')}
                    className="text-[9px] text-[#7c5cff] hover:text-[#00ffa3] font-mono font-bold uppercase transition-colors mr-0.5 cursor-pointer"
                  >
                    Kelola &rarr;
                  </button>
                </div>
                
                <div className="space-y-3 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                  {accounts.map((acc) => {
                    const percent = totalLiquid > 0 ? (acc.balance / totalLiquid) * 100 : 0;
                    return (
                      <div key={acc.id} className="space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 bg-gradient-to-r ${acc.color || 'from-blue-600 to-blue-900'}`} />
                            <span className="font-bold text-white truncate max-w-[110px]">{acc.name}</span>
                          </div>
                          <span className="font-mono text-[#00ffa3] font-bold text-[9.5px]">{formatIDRWithSpace(acc.balance)}</span>
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

          {/* 4 Transaksi Terkini */}
          <div className="space-y-3 text-left">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xs font-black text-white tracking-widest uppercase font-mono text-[#9aa4bf]">4 Transaksi Terkini</h2>
                <p className="text-[11px] text-[#9aa4bf] mt-0.5">Rangkuman log mutasi masuk dan keluar terbaru</p>
              </div>
              
              <button 
                onClick={() => onNavigate('transactions')}
                className="flex items-center gap-1 text-[11px] text-[#7c5cff] hover:text-[#00d2ff] font-extrabold transition-colors cursor-pointer"
              >
                Semua Transaksi <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5" id="recent-transactions-list">
              {recentTx.length === 0 ? (
                <div className="text-center py-7 bg-white/[0.01] border border-dashed border-white/[0.05] rounded-2xl">
                  <p className="text-xs text-[#9aa4bf]">Belum ada data transaksi tercatat harian.</p>
                </div>
              ) : (
                recentTx.map((tx) => (
                  <div 
                    key={tx.id}
                    className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#11182d]/40 border border-white/[0.05] hover:bg-[#11182d]/70 transition-all hover:border-[#7c5cff]/20 gap-3 min-w-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`p-2 rounded-xl text-white flex items-center justify-center shrink-0 ${
                        tx.type === 'Pemasukan' ? 'bg-[#00ffa3]/10 text-[#00ffa3]' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {tx.type === 'Pemasukan' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 text-left flex-1">
                        <h4 className="text-xs font-bold text-white truncate leading-relaxed">{tx.title}</h4>
                        <p className="text-[10px] text-[#9aa4bf] mt-0.5 truncate leading-relaxed">{tx.category} • {tx.source} • {tx.date}</p>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <p className={`text-xs font-black font-mono leading-relaxed whitespace-nowrap ${
                        tx.type === 'Pemasukan' ? 'text-[#00ffa3]' : 'text-[#ff5c7a]'
                      }`}>
                        {tx.type === 'Pemasukan' ? '+' : '-'}{formatIDRWithSpace(tx.nominal).replace(/^-/, '')}
                      </p>
                      {tx.isRecurring && (
                        <span className="inline-flex items-center h-4 mt-1 text-[8px] font-mono font-semibold bg-[#7c5cff]/15 text-[#7c5cff] px-1.5 rounded border border-[#7c5cff]/10">Rutin</span>
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
