/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, TrendingUp, TrendingDown, RefreshCw, Smartphone, 
  Sparkles, DollarSign, Award, ArrowUpRight, Check, X, Info, Sliders
} from 'lucide-react';
import { Asset, formatCurrency } from '../utils/financeHelper';

interface AsetViewProps {
  assets: Asset[];
  onAddAsset: (asset: Omit<Asset, 'id'>) => void;
  onEditAsset: (id: string, asset: Partial<Asset>) => void;
  onDeleteAsset: (id: string) => void;
}

export function AsetView({
  assets,
  onAddAsset,
  onEditAsset,
  onDeleteAsset
}: AsetViewProps) {
  const [localAssets, setLocalAssets] = useState<Asset[]>(assets);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date().toLocaleTimeString());

  // Modal Asset Triggering
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form asset states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategory, setFormCategory] = useState<'Crypto' | 'Gold' | 'Saham' | 'MutualFund' | 'Forex' | 'Properti'>('Crypto');
  const [formUnits, setFormUnits] = useState('');
  const [formBuyPrice, setFormBuyPrice] = useState('');
  const [formMarketPrice, setFormMarketPrice] = useState('');

  // Batch price editor states
  const [showBatchEditor, setShowBatchEditor] = useState(false);
  const [batchPrices, setBatchPrices] = useState<Record<string, string>>({});
  const [activeBatchCategory, setActiveBatchCategory] = useState<string>('All');

  // Single card price inline editor states
  const [activeCardEditId, setActiveCardEditId] = useState<string | null>(null);
  const [cardPriceInput, setCardPriceInput] = useState<string>('');

  // Sychronize prop asset rows inside state when modified
  useEffect(() => {
    setLocalAssets(assets);
  }, [assets]);

  // Synchronize batchPrices state whenever localAssets changes
  useEffect(() => {
    const prices: Record<string, string> = {};
    localAssets.forEach(asset => {
      prices[asset.id] = asset.marketPrice.toString();
    });
    setBatchPrices(prices);
  }, [localAssets]);

  const handleBatchPriceChange = (id: string, value: string) => {
    setBatchPrices(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSaveAllBatchPrices = () => {
    localAssets.forEach(asset => {
      const priceStr = batchPrices[asset.id];
      if (priceStr !== undefined) {
        const priceNum = parseFloat(priceStr);
        if (!isNaN(priceNum) && priceNum !== asset.marketPrice) {
          onEditAsset(asset.id, { marketPrice: priceNum });
        }
      }
    });
    setLastUpdated(new Date().toLocaleTimeString());
    setShowBatchEditor(false);
  };

  const handleStartCardEdit = (id: string, currentMarketPrice: number) => {
    setActiveCardEditId(id);
    setCardPriceInput(currentMarketPrice.toString());
  };

  const handleSaveCardPrice = (id: string) => {
    const priceNum = parseFloat(cardPriceInput);
    if (!isNaN(priceNum)) {
      onEditAsset(id, { marketPrice: priceNum });
    }
    setActiveCardEditId(null);
  };

  // Fetch prices from public geodetic CoinGecko APIs
  const handleFetchPrices = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=idr');
      if (response.ok) {
        const data = await response.json();
        
        // Map fetched values
        const updated = localAssets.map(asset => {
          let price = asset.marketPrice;
          if (asset.code.toLowerCase() === 'btc' && data.bitcoin) {
            price = data.bitcoin.idr;
          } else if (asset.code.toLowerCase() === 'eth' && data.ethereum) {
            price = data.ethereum.idr;
          } else if (asset.code.toLowerCase() === 'sol' && data.solana) {
            price = data.solana.idr;
          }
          return { ...asset, marketPrice: price };
        });
        
        // Sync
        setLocalAssets(updated);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.warn('Network issue fetching CoinGecko prices, using cached values.', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setFormName('');
    setFormCode('');
    setFormCategory('Crypto');
    setFormUnits('');
    setFormBuyPrice('');
    setFormMarketPrice('');
    setShowModal(true);
  };

  const handleOpenEdit = (asset: Asset) => {
    setIsEditMode(true);
    setEditId(asset.id);
    setFormName(asset.name);
    setFormCode(asset.code);
    setFormCategory(asset.category);
    setFormUnits(asset.units.toString());
    setFormBuyPrice(asset.buyPrice.toString());
    setFormMarketPrice(asset.marketPrice.toString());
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCode || !formUnits || !formBuyPrice || !formMarketPrice) return;

    const unitsNum = parseFloat(formUnits);
    const buyNum = parseFloat(formBuyPrice);
    const marketNum = parseFloat(formMarketPrice);

    if (isNaN(unitsNum) || isNaN(buyNum) || isNaN(marketNum)) return;

    const logoSym = formCategory === 'Crypto' ? '₿' : formCategory === 'Gold' ? 'Au' : '📈';

    const assetData = {
      name: formName,
      code: formCode.toUpperCase(),
      category: formCategory,
      units: unitsNum,
      buyPrice: buyNum,
      marketPrice: marketNum,
      logo: logoSym
    };

    if (isEditMode && editId) {
      onEditAsset(editId, assetData);
    } else {
      onAddAsset(assetData);
    }
    setShowModal(false);
  };

  // Calculations for summaries
  const totalBeli = localAssets.reduce((sum, a) => sum + (a.units * a.buyPrice), 0);
  const totalPasar = localAssets.reduce((sum, a) => sum + (a.units * a.marketPrice), 0);
  const profitLoss = totalPasar - totalBeli;
  const roiPct = totalBeli > 0 ? (profitLoss / totalBeli) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            Pelacak Portofolio Aset & Investasi
          </h1>
          <p className="text-xs text-[#9aa4bf]">Kalkulasikan Return on Investment (ROI) portofolio reksa dana, emas, dan crypto Anda secara real-time</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowBatchEditor(!showBatchEditor)}
            className={`p-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer font-bold border transition-all active:scale-95 ${
              showBatchEditor
                ? 'bg-[#7c5cff]/20 text-[#cabafe] border-[#7c5cff]/45'
                : 'bg-white/[0.04] text-white border-white/5 hover:bg-white/[0.08]'
            }`}
            title="Update Harga Pasar Massal Semua Kategori"
          >
            <Sliders className="h-3.5 w-3.5 text-[#7c5cff]" />
            <span>Update Harga Massal</span>
          </button>

          <button
            onClick={handleFetchPrices}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-white/[0.04] text-white hover:bg-white/[0.08] active:scale-95 transition-all text-xs flex items-center gap-1.5 cursor-pointer font-bold border border-white/5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Portofolio ({lastUpdated})</span>
          </button>
          
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-[#7c5cff] text-white font-bold text-xs hover:bg-[#6847ff] active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Tambah Aset
          </button>
        </div>
      </div>

      {/* PANEL UPDATE HARGA PASAR MASSAL */}
      {showBatchEditor && (
        <div className="p-6 rounded-3xl bg-white/[0.02] border border-[#7c5cff]/30 space-y-4 shadow-xl backdrop-blur-md">
          {/* Panel Header */}
          <div className="flex justify-between items-center pb-3 border-b border-white/[0.06]">
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <span className="p-1 px-2 rounded-md bg-[#7c5cff]/10 text-[#cabafe] text-[10px] uppercase font-mono tracking-wider">Fitur Eksklusif</span>
                Update Harga Pasar Hari Ini per Kategori
              </h2>
              <p className="text-[11px] text-[#9aa4bf] mt-0.5">Ubah estimasi harga hari ini untuk mencerminkan fluktuasi pasar dunia nyata</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleSaveAllBatchPrices}
                className="px-3.5 py-1.5 rounded-xl bg-[#7c5cff] hover:bg-[#6847ff] text-white font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" /> Simpan Semua
              </button>
              <button 
                onClick={() => setShowBatchEditor(false)}
                className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#9aa4bf] hover:text-white transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Category Filter Pills in Batch Panel */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'All', label: 'Semua Kategori' },
              { key: 'Crypto', label: '💎 Crypto' },
              { key: 'Gold', label: '✨ Emas (Gold)' },
              { key: 'Saham', label: '📈 Pasar Saham' },
              { key: 'MutualFund', label: '📊 Reksa Dana' },
              { key: 'Forex', label: '💵 Valas (Forex)' },
              { key: 'Properti', label: '🏢 Properti' }
            ].map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveBatchCategory(cat.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeBatchCategory === cat.key
                    ? 'bg-[#7c5cff] text-white shadow-lg shadow-[#7c5cff]/20'
                    : 'bg-white/[0.03] text-[#9aa4bf] hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grid list of editable market prices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-1 max-h-[300px] overflow-y-auto pr-1">
            {localAssets
              .filter(asset => activeBatchCategory === 'All' || asset.category === activeBatchCategory)
              .map((asset) => (
                <div key={asset.id} className="p-3 bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-8 w-8 rounded-xl bg-white/[0.04] flex items-center justify-center text-xs shrink-0">{asset.logo}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{asset.name}</p>
                      <p className="text-[10px] font-mono text-[#9aa4bf] truncate">{asset.code}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[9px] text-[#9aa4bf] font-mono leading-none">Beli: {formatCurrency(asset.buyPrice)}</span>
                    <div className="relative mt-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#9aa4bf]">Rp</span>
                      <input
                        type="number"
                        value={batchPrices[asset.id] !== undefined ? batchPrices[asset.id] : asset.marketPrice}
                        onChange={(e) => handleBatchPriceChange(asset.id, e.target.value)}
                        className="w-24 pl-7 pr-2 py-1 bg-[#0c1020] text-xs text-white rounded-lg border border-white/10 font-mono text-right focus:outline-none focus:border-[#7c5cff]"
                        placeholder="Harga"
                      />
                    </div>
                  </div>
                </div>
              ))}
            {localAssets.filter(asset => activeBatchCategory === 'All' || asset.category === activeBatchCategory).length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-[#9aa4bf]">
                Tidak ada aset di kategori ini. Tambahkan aset baru terlebih dahulu.
              </div>
            )}
          </div>
        </div>
      )}

      {/* METRIC SUMMARIES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[10px] text-[#9aa4bf] font-mono tracking-widest uppercase block">Total Nilai Investasi (Beli)</span>
          <span className="text-xl font-bold text-white mt-1.5 block">{formatCurrency(totalBeli)}</span>
        </div>
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[10px] text-[#9aa4bf] font-mono tracking-widest uppercase block">Estimasi Nilai Pasar Terkini</span>
          <span className="text-xl font-bold text-white mt-1.5 block">{formatCurrency(totalPasar)}</span>
        </div>
        <div className={`p-5 rounded-2xl border ${
          profitLoss >= 0 ? 'bg-emerald-500/5 border-emerald-500/15 text-[#16c784]' : 'bg-red-500/5 border-red-500/15 text-[#ff5c7a]'
        }`}>
          <span className="text-[10px] text-[#9aa4bf] font-mono tracking-widest uppercase block">Total Profit / Loss Unrealized</span>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-xl font-black">{profitLoss >= 0 ? '+' : ''}{formatCurrency(profitLoss)}</span>
            <span className="text-xs font-bold font-mono">({roiPct.toFixed(1)}% ROI)</span>
          </div>
        </div>
      </div>

      {/* ASSETS PORTFOLIO GRID GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {localAssets.map((asset) => {
          const buyTotalVal = asset.units * asset.buyPrice;
          const curTotalVal = asset.units * asset.marketPrice;
          const curProfitLoss = curTotalVal - buyTotalVal;
          const curRoi = asset.buyPrice > 0 ? (curProfitLoss / buyTotalVal) * 100 : 0;

          return (
            <div 
              key={asset.id} 
              className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors relative flex flex-col justify-between overflow-hidden shadow-lg group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="h-9 w-9 bg-white/[0.05] rounded-xl flex items-center justify-center font-bold text-white text-xs">
                    {asset.logo}
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-white tracking-tight">{asset.name}</h3>
                    <p className="text-[9px] font-mono text-[#9aa4bf] uppercase">{asset.code} • {asset.category}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleOpenEdit(asset)}
                    className="p-1 rounded bg-white/[0.05] hover:bg-white/10 text-white cursor-pointer"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button 
                    onClick={() => onDeleteAsset(asset.id)}
                    className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-[#ff5c7a] cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Units & Worth info */}
              <div className="space-y-2 mt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#9aa4bf]">Unit / Jumlah:</span>
                  <span className="font-bold text-white font-mono">{asset.units}</span>
                </div>
                
                <div className="flex justify-between text-xs items-center">
                  <span className="text-[#9aa4bf]">Harga Pasar / Unit:</span>
                  {activeCardEditId === asset.id ? (
                    <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-lg border border-white/10">
                      <span className="text-[10px] text-[#9aa4bf] font-mono">Rp</span>
                      <input
                        type="number"
                        value={cardPriceInput}
                        onChange={(e) => setCardPriceInput(e.target.value)}
                        onBlur={() => {
                          // Allow onMouseDown on button to register before clearing
                          setTimeout(() => {
                            setActiveCardEditId(null);
                          }, 150);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveCardPrice(asset.id);
                          if (e.key === 'Escape') setActiveCardEditId(null);
                        }}
                        className="w-20 px-1 bg-[#0c1020] text-xs font-mono text-white rounded border border-white/10 text-right focus:outline-none focus:border-[#7c5cff]"
                        autoFocus
                      />
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault(); // prevent blur triggering too early
                          handleSaveCardPrice(asset.id);
                        }}
                        className="p-1 rounded bg-[#16c784]/20 text-[#16c784] hover:bg-[#16c784]/30 cursor-pointer flex items-center justify-center shrink-0"
                        title="Simpan"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 group/price">
                      <span className="font-bold text-white font-mono">{formatCurrency(asset.marketPrice)}</span>
                      <button
                        onClick={() => handleStartCardEdit(asset.id, asset.marketPrice)}
                        className="p-1 rounded bg-white/[0.04] text-[#cabafe] hover:bg-[#7c5cff]/20 opacity-100 sm:opacity-0 group-hover/price:opacity-100 transition-opacity cursor-pointer flex items-center shrink-0"
                        title="Edit Cepat Harga"
                      >
                        <Edit2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-[#9aa4bf]">Estimasi Worth:</span>
                  <span className="font-extrabold text-[#00d4ff] font-mono">{formatCurrency(curTotalVal)}</span>
                </div>
                
                <div className="flex justify-between text-[11px] pt-1 border-t border-white/[0.03]">
                  <span className="text-[#9aa4bf]">ROI Realisasi:</span>
                  <span className={`font-bold font-mono ${curProfitLoss >= 0 ? 'text-[#16c784]' : 'text-[#ff5c7a]'}`}>
                    {curProfitLoss >= 0 ? '+' : ''}{curRoi.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAILED MOCK INFO TEXT */}
      <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 flex gap-3 text-xs text-[#9aa4bf]">
        <Info className="h-4 w-4 text-[#00d4ff] shrink-0" />
        <p>Hubungi bursa dwi-fungsi CoinGecko (Gratis) untuk memperbarui harga Bitcoin (BTC), Ethereum (ETH), dan Solana (SOL). Selain crypto, data portofolio menggunakan manual fallback atau cache terakhir.</p>
      </div>

      {/* POPUP MODAL ASSETS */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-[#0c1020] border border-white/[0.08] shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/[0.04]">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{isEditMode ? 'Edit Rincian Aset' : 'Tambah Aset Portfolio'}</h3>
              <button onClick={() => setShowModal(false)} className="text-[#9aa4bf] hover:text-white cursor-pointer">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">Nama Aset</label>
                <input 
                  type="text" 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="E.g., Bitcoin, Emas LM, Saham BBRI"
                  required
                  className="w-full px-3 py-2 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">Kode Aset</label>
                  <input 
                    type="text" 
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="BTC, GOLD, BBRI"
                    required
                    className="w-full px-3 py-2 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">Sub-Kategori</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-2.5 py-2.5 bg-[#0c1020] text-xs text-white border border-white/5 rounded-xl cursor-pointer"
                  >
                    <option value="Crypto">Crypto</option>
                    <option value="Gold">Emas (Gold)</option>
                    <option value="Saham">Pasar Saham</option>
                    <option value="MutualFund">Reksa Dana</option>
                    <option value="Forex">Valas (Forex)</option>
                    <option value="Properti">Properti</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">Jumlah Unit (Token/Keping)</label>
                <input 
                  type="number" 
                  step="any"
                  value={formUnits}
                  onChange={(e) => setFormUnits(e.target.value)}
                  placeholder="0.0"
                  required
                  className="w-full px-3 py-2 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff] font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">Harga Beli Satuan (Rp)</label>
                  <input 
                    type="number" 
                    value={formBuyPrice}
                    onChange={(e) => setFormBuyPrice(e.target.value)}
                    placeholder="E.g., 1000000"
                    required
                    className="w-full px-3 py-2 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#9aa4bf] uppercase font-bold tracking-wider font-mono block">Harga Pasar Satuan (Rp)</label>
                  <input 
                    type="number" 
                    value={formMarketPrice}
                    onChange={(e) => setFormMarketPrice(e.target.value)}
                    placeholder="E.g., 1500000"
                    required
                    className="w-full px-3 py-2 bg-white/[0.04] text-xs text-white rounded-xl border border-white/5 focus:outline-none focus:border-[#7c5cff] font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] text-xs text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-[#7c5cff] hover:bg-[#6847ff] text-xs text-white font-bold cursor-pointer"
                >
                  Simpan Aset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
