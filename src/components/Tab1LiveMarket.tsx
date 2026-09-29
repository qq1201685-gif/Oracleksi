/**
 * Tab 1: Live 15-Minute Market, Candlestick Chart, Strike Ladder, and Edge Recommendations
 */

import React, { useState } from 'react';
import {
  Search,
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Check,
  RefreshCw,
  Sliders,
  Flame,
} from 'lucide-react';
import {
  KalshiMarketAsset,
  CandleBar,
  TechnicalAnalysisPosture,
  Kalshi15mContract,
  AISynthesisResult,
  AssetCategory,
  UserAppSettings,
  ChartTimeframe,
} from '../types/market.ts';
import { TradingViewChart } from './TradingViewChart.tsx';
import { ExternalFrameWrapper } from './ExternalFrameWrapper.tsx';

interface Tab1LiveMarketProps {
  assets: KalshiMarketAsset[];
  selectedAsset: KalshiMarketAsset;
  onSelectAsset: (asset: KalshiMarketAsset) => void;
  candles: CandleBar[];
  posture: TechnicalAnalysisPosture;
  contracts: Kalshi15mContract[];
  aiSynthesis: AISynthesisResult | null;
  countdownSeconds: number;
  isUpdating: boolean;
  onManualRefresh: () => void;
  settings?: UserAppSettings;
  onUpdateSettings?: (settings: Partial<UserAppSettings>) => void;
  onManualAiSynthesis?: () => void;
  isAiSynthesizing?: boolean;
  currentTimeframe?: ChartTimeframe;
  onSelectTimeframe?: (tf: ChartTimeframe) => void;
}

export const Tab1LiveMarket: React.FC<Tab1LiveMarketProps> = ({
  assets,
  selectedAsset,
  onSelectAsset,
  candles,
  posture,
  contracts,
  aiSynthesis,
  countdownSeconds,
  isUpdating,
  onManualRefresh,
  settings,
  onUpdateSettings,
  onManualAiSynthesis,
  isAiSynthesizing,
  currentTimeframe = '15m',
  onSelectTimeframe,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'all'>('all');
  const [showHurst, setShowHurst] = useState(true);
  const [showEliades, setShowEliades] = useState(true);
  const [showSlimRibbon, setShowSlimRibbon] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Kalshi15mContract | null>(null);
  const [chartViewMode, setChartViewMode] = useState<'quant' | 'tradingview_web' | 'kalshi_web'>('quant');

  // Filter assets
  const filteredAssets = assets.filter((asset) => {
    const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory;
    const matchesSearch =
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.baseSymbol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Identify highest edge contract
  const topEdgeContract = [...contracts].sort((a, b) => Math.abs(b.edgePercent) - Math.abs(a.edgePercent))[0] || contracts[0];

  // Helper for recommendation badge styling
  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case 'BUY_YES':
        return {
          bg: 'bg-emerald-950/90 text-emerald-300 border-emerald-500 shadow-emerald-500/20',
          text: 'BUY YES',
          icon: <ArrowUpRight className="w-4 h-4 text-emerald-400" />,
        };
      case 'BUY_NO':
        return {
          bg: 'bg-rose-950/90 text-rose-300 border-rose-500 shadow-rose-500/20',
          text: 'BUY NO',
          icon: <ArrowDownRight className="w-4 h-4 text-rose-400" />,
        };
      case 'REVERSE_SELL_BUY_NO':
        return {
          bg: 'bg-amber-950/90 text-amber-300 border-amber-500 shadow-amber-500/20',
          text: 'REVERSE / BUY NO',
          icon: <RefreshCw className="w-4 h-4 text-amber-400" />,
        };
      case 'REVERSE_SELL_BUY_YES':
        return {
          bg: 'bg-teal-950/90 text-teal-300 border-teal-500 shadow-teal-500/20',
          text: 'REVERSE / BUY YES',
          icon: <RefreshCw className="w-4 h-4 text-teal-400" />,
        };
      default:
        return {
          bg: 'bg-slate-900 text-slate-400 border-slate-700',
          text: 'WAIT / NO EDGE',
          icon: <Clock className="w-4 h-4 text-slate-400" />,
        };
    }
  };

  const topRecStyle = getRecommendationBadge(topEdgeContract?.recommendation || 'WAIT');

  return (
    <div className="space-y-4">
      {/* Top Asset Search & Category Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search all Kalshi 15m assets (BTC, SPX, Gold, QQQ)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {(['all', 'crypto', 'indices', 'commodities', 'forex'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono capitalize transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Asset Pill Horizontal Selector */}
          <div className="flex items-center gap-2 overflow-x-auto w-full flex-1 pb-1 md:pb-0 scrollbar-thin">
            {filteredAssets.map((asset) => {
              const isSelected = asset.id === selectedAsset.id;
              return (
                <button
                  key={asset.id}
                  onClick={() => onSelectAsset(asset)}
                  className={`flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-mono whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-500/80 text-emerald-400 font-bold shadow-sm shadow-emerald-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span>{asset.ticker}</span>
                  <span className="text-[11px] text-slate-400">${asset.currentPrice.toLocaleString()}</span>
                  <span
                    className={`text-[10px] ${
                      asset.priceChange24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {asset.priceChange24h >= 0 ? '+' : ''}
                    {asset.priceChange24h}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={onManualRefresh}
            disabled={isUpdating}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400 transition-colors shrink-0"
            title="Force Instant 8-11s Tick Recalculation"
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Top Recommendation Edge Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 shadow-md">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs uppercase text-slate-400 tracking-wider">
                  15-MINUTE KALSHI CONTRACT EDGE ENGINE
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  {selectedAsset.name}
                </span>
              </div>
              <div className="text-lg font-bold text-slate-100 flex items-center gap-2 mt-0.5">
                <span>Target Strike:</span>
                <span className="font-mono text-emerald-400">${topEdgeContract?.strikePrice.toLocaleString()}</span>
                <span className="text-xs font-normal text-slate-400 font-mono">
                  ({topEdgeContract?.displacementPoints >= 0 ? '+' : ''}
                  {topEdgeContract?.displacementPoints} pts displacement)
                </span>
              </div>
            </div>
          </div>

          {/* Edge Metrics & Action Badge */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Edge Percentage */}
            <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-center">
              <div className="text-[10px] text-slate-400">MATH EDGE</div>
              <div
                className={`text-sm font-bold ${
                  Math.abs(topEdgeContract?.edgePercent || 0) >= 3.5 ? 'text-emerald-400' : 'text-slate-300'
                }`}
              >
                {topEdgeContract?.edgePercent >= 0 ? '+' : ''}
                {topEdgeContract?.edgePercent}%
              </div>
            </div>

            {/* Expected Value EV */}
            <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-center">
              <div className="text-[10px] text-slate-400">THEORETICAL EV</div>
              <div className="text-sm font-bold text-cyan-400">
                {topEdgeContract?.theoreticalExpectedValueCents >= 0 ? '+' : ''}
                {topEdgeContract?.theoreticalExpectedValueCents}¢/contract
              </div>
            </div>

            {/* Model Confidence */}
            <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-center">
              <div className="text-[10px] text-slate-400">CONFIDENCE</div>
              <div className="text-sm font-bold text-amber-400">
                {topEdgeContract?.confidenceScore}%
              </div>
            </div>

            {/* Status Recommendation Badge */}
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold shadow-lg ${topRecStyle.bg}`}
            >
              {topRecStyle.icon}
              <span className="font-mono">{topRecStyle.text}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Main Live Candlestick Chart (Left/Center) + Strike Contract Ladder (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chart Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg">
            {/* Chart Toolbar & View Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between mb-2.5 px-1 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-200">
                  {selectedAsset.ticker} / USD ({currentTimeframe.toUpperCase()})
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {selectedAsset.exchangeSource}
                </span>
              </div>

              {/* Timeframe Selector Buttons */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px] font-mono">
                {(['30s', '1m', '3m', '5m', '15m', '30m', '1h', '1d'] as ChartTimeframe[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => onSelectTimeframe?.(tf)}
                    className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                      currentTimeframe === tf
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {/* View Switcher: Native Quant vs External Web Terminals */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px] font-mono">
                <button
                  onClick={() => setChartViewMode('quant')}
                  className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                    chartViewMode === 'quant'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Quant Chart
                </button>
                <button
                  onClick={() => setChartViewMode('kalshi_web')}
                  className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                    chartViewMode === 'kalshi_web'
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Kalshi Web
                </button>
                <button
                  onClick={() => setChartViewMode('tradingview_web')}
                  className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                    chartViewMode === 'tradingview_web'
                      ? 'bg-purple-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  TradingView
                </button>
              </div>
            </div>

            {/* Indicator Overlay Toggles (when in Quant mode) */}
            {chartViewMode === 'quant' && (
              <div className="flex items-center justify-end gap-1.5 text-xs font-mono mb-2 flex-wrap">
                <button
                  onClick={() => setShowSlimRibbon(!showSlimRibbon)}
                  className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                    showSlimRibbon
                      ? 'bg-purple-950 text-purple-300 border-purple-700/80 font-bold'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  Slim Ribbon (8/13/21)
                </button>
                <button
                  onClick={() => setShowHurst(!showHurst)}
                  className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                    showHurst
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-700/80 font-bold'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  Hurst Envelope
                </button>
                <button
                  onClick={() => setShowEliades(!showEliades)}
                  className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                    showEliades
                      ? 'bg-amber-950 text-amber-300 border-amber-700/80 font-bold'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  Eliades Offsets
                </button>
              </div>
            )}

            {/* Content Display: Native Lightweight Chart or Safe ExternalFrameWrapper */}
            {chartViewMode === 'quant' && (
              <TradingViewChart
                candles={candles}
                posture={posture}
                assetTicker={selectedAsset.ticker}
                showHurstEnvelopes={showHurst}
                showEliadesTarget={showEliades}
                showSlimRibbon={showSlimRibbon}
              />
            )}

            {chartViewMode === 'kalshi_web' && (
              <ExternalFrameWrapper
                src={`https://kalshi.com/markets/${selectedAsset.kalshiSeriesTicker.toLowerCase()}`}
                title={`Kalshi Live Market Terminal: ${selectedAsset.name}`}
                className="w-full h-[400px]"
                timeoutMs={10000}
              />
            )}

            {chartViewMode === 'tradingview_web' && (
              <ExternalFrameWrapper
                src={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(
                  selectedAsset.baseSymbol === 'BTCUSDT'
                    ? 'BINANCE:BTCUSDT'
                    : selectedAsset.baseSymbol === 'ETHUSDT'
                    ? 'BINANCE:ETHUSDT'
                    : selectedAsset.baseSymbol === 'SOLUSDT'
                    ? 'BINANCE:SOLUSDT'
                    : selectedAsset.baseSymbol === 'XRPUSDT'
                    ? 'BINANCE:XRPUSDT'
                    : selectedAsset.baseSymbol === 'DOGEUSDT'
                    ? 'BINANCE:DOGEUSDT'
                    : selectedAsset.baseSymbol
                )}`}
                title={`TradingView Advanced Terminal: ${selectedAsset.ticker}`}
                className="w-full h-[400px]"
                timeoutMs={10000}
              />
            )}

            {/* Quick Live Point Status Footer */}
            <div className="mt-2.5 pt-2 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">CURRENT PRICE</span>
                <span className="text-slate-100 font-bold">${selectedAsset.currentPrice.toLocaleString()}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">HURST DISPLACED MA</span>
                <span className="text-cyan-400 font-bold">${posture.hurstCycles.displacedMaCenter.toLocaleString()}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">ELIADES PROJECTION</span>
                <span className="text-amber-400 font-bold">
                  ${posture.eliadesOffsets.projectedTargetPrice.toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">DELTA ROC POSTURE</span>
                <span className="text-emerald-400 font-bold truncate block">
                  {posture.momentumDeltaROC.velocityPosture.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Strike Contracts Ladder (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col h-full">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-100 font-mono uppercase">
                  15M Strike Ladder & Probabilities
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                TTE: {Math.floor(topEdgeContract?.timeToExpirationSeconds / 60)}m {topEdgeContract?.timeToExpirationSeconds % 60}s
              </span>
            </div>

            {/* Contract Cards List */}
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[460px] pr-1 scrollbar-thin">
              {contracts.map((contract) => {
                const isTop = contract.ticker === topEdgeContract.ticker;
                const recStyle = getRecommendationBadge(contract.recommendation);
                const isSelected = selectedContract?.ticker === contract.ticker;

                return (
                  <div
                    key={contract.ticker}
                    onClick={() => setSelectedContract(contract)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500 shadow-md ring-1 ring-cyan-500/40'
                        : isTop
                        ? 'bg-slate-950/90 border-emerald-500/60 hover:border-emerald-400'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-100">
                            ${contract.strikePrice.toLocaleString()}
                          </span>
                          <span
                            className={`text-[10px] font-mono ${
                              contract.displacementPoints >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {contract.displacementPoints >= 0 ? '+' : ''}
                            {contract.displacementPoints} pts
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {contract.ticker}
                        </div>
                      </div>

                      {/* Rec Badge */}
                      <div className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${recStyle.bg}`}>
                        {recStyle.text}
                      </div>
                    </div>

                    {/* Prices & Odds Row */}
                    <div className="mt-2 grid grid-cols-4 gap-1.5 text-center font-mono text-[11px] pt-1.5 border-t border-slate-900">
                      <div className="bg-emerald-950/40 p-1 rounded border border-emerald-900/50">
                        <span className="text-[9px] text-emerald-400 block">YES ASK</span>
                        <span className="font-bold text-emerald-300">{contract.yesAsk}¢</span>
                      </div>
                      <div className="bg-rose-950/40 p-1 rounded border border-rose-900/50">
                        <span className="text-[9px] text-rose-400 block">NO ASK</span>
                        <span className="font-bold text-rose-300">{contract.noAsk}¢</span>
                      </div>
                      <div className="bg-slate-900 p-1 rounded border border-slate-800">
                        <span className="text-[9px] text-cyan-400 block">FAIR ODDS</span>
                        <span className="font-bold text-cyan-300">{contract.calculatedFairOdds}%</span>
                      </div>
                      <div className="bg-slate-900 p-1 rounded border border-slate-800">
                        <span className="text-[9px] text-amber-400 block">EDGE</span>
                        <span
                          className={`font-bold ${
                            contract.edgePercent > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {contract.edgePercent > 0 ? '+' : ''}
                          {contract.edgePercent}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 6-Pillar Technical & Quantitative Diagnostic Deck */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
            7-Pillar Quantitative Prediction Engine Diagnostics
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* 1. Technical Analysis Signals & Posture */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 font-mono">1. Posture & Momentum</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400">
                {posture.trendPosture}
              </span>
            </div>
            <div className="space-y-1.5 text-xs font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">RSI (14):</span>
                <span className="font-bold text-slate-200">{posture.rsi} ({posture.rsiPosture})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Slim Ribbon (EMA 8/21):</span>
                <span className="text-slate-200">${posture.emaFast} / ${posture.emaSlow}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">MACD Histogram:</span>
                <span className={posture.macd.hist >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {posture.macd.hist} ({posture.macd.crossover})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">AskSlim Reversal Scout:</span>
                <span className="text-purple-400 font-bold">{posture.askslimPosture.swingPosture}</span>
              </div>
            </div>
          </div>

          {/* 2. Momentum & Delta Rate of Change */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 font-mono">2. Delta ROC Velocity</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400">
                {posture.momentumDeltaROC.velocityPosture}
              </span>
            </div>
            <div className="space-y-1.5 text-xs font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">1-Bar Velocity (dP/dt):</span>
                <span className="font-bold text-slate-200">{posture.momentumDeltaROC.roc1}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">2nd Derivative Accel (d²P/dt²):</span>
                <span className={posture.momentumDeltaROC.rocAcceleration >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {posture.momentumDeltaROC.rocAcceleration}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Volume-Weighted ROC:</span>
                <span className="text-cyan-400">{posture.momentumDeltaROC.volumeWeightedROC}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">3-Bar Lookback ROC:</span>
                <span className="text-slate-200">{posture.momentumDeltaROC.roc3}%</span>
              </div>
            </div>
          </div>

          {/* 3. Advanced Cycle Analysis & Projections */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 font-mono">3. Hurst & Eliades Offsets</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400">
                {posture.hurstCycles.cyclePhase.toUpperCase()}
              </span>
            </div>
            <div className="space-y-1.5 text-xs font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Hurst Exponent (H):</span>
                <span className="font-bold text-slate-200">
                  {posture.hurstCycles.hurstExponent} ({posture.hurstCycles.hurstExponent > 0.5 ? 'Trending' : 'Mean-Reverting'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Eliades Target Projection:</span>
                <span className="text-amber-400 font-bold">
                  ${posture.eliadesOffsets.projectedTargetPrice} ({posture.eliadesOffsets.projectedTargetDirection})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Crossover Confirmed:</span>
                <span className={posture.eliadesOffsets.crossoverConfirmed ? 'text-emerald-400' : 'text-slate-400'}>
                  {posture.eliadesOffsets.crossoverConfirmed ? 'YES (Triggered)' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sardine Pattern:</span>
                <span className="text-slate-200">{posture.sardinePattern.patternName}</span>
              </div>
            </div>
          </div>

          {/* 4. Contract Displacement & Moneyness */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 font-mono">4. Strike Target Displacement</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-400">
                ATM LADDER
              </span>
            </div>
            <div className="space-y-1.5 text-xs font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">ATM Target Strike:</span>
                <span className="font-bold text-slate-200">${topEdgeContract?.strikePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Displacement:</span>
                <span className={topEdgeContract?.displacementPoints >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {topEdgeContract?.displacementPoints >= 0 ? '+' : ''}
                  {topEdgeContract?.displacementPoints} pts ({topEdgeContract?.displacementPercent}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Calculated Odds Drift:</span>
                <span className="text-cyan-400">
                  {topEdgeContract?.calculatedFairOdds - topEdgeContract?.impliedProbability >= 0 ? '+' : ''}
                  {(topEdgeContract?.calculatedFairOdds - topEdgeContract?.impliedProbability).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* 5. Time to Expiration Decay */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 font-mono">5. Time to Expiration</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400">
                15M BRACKET
              </span>
            </div>
            <div className="space-y-1.5 text-xs font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Remaining Time:</span>
                <span className="font-bold text-emerald-400">
                  {Math.floor(topEdgeContract?.timeToExpirationSeconds / 60)}m {topEdgeContract?.timeToExpirationSeconds % 60}s
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Theta Acceleration Zone:</span>
                <span className={topEdgeContract?.timeToExpirationSeconds < 300 ? 'text-rose-400' : 'text-slate-200'}>
                  {topEdgeContract?.timeToExpirationSeconds < 300 ? 'HIGH (Final 5 Min)' : 'STANDARD'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tick Heartbeat:</span>
                <span className="text-slate-200">{countdownSeconds}s countdown</span>
              </div>
            </div>
          </div>

          {/* 6. AI Synthesis 3.8 Flash / Live */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100 font-mono">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>6. AI Synthesis</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                  {aiSynthesis?.modelUsed || 'GEMINI 3.8 FLASH'}
                </span>
                {onManualAiSynthesis && (
                  <button
                    onClick={onManualAiSynthesis}
                    disabled={isAiSynthesizing}
                    className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 cursor-pointer transition-all shadow-sm"
                    title="Force immediate AI re-analysis and bypass cache"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isAiSynthesizing ? 'animate-spin' : ''}`} />
                    <span>{isAiSynthesizing ? 'ANALYZING' : 'RE-ANALYZE'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Cache TTL Control Bar */}
            {settings && onUpdateSettings && (
              <div className="flex items-center justify-between bg-slate-950/70 px-2 py-1 rounded border border-slate-800/80 text-[10px] font-mono">
                <span className="text-slate-400">Cache TTL:</span>
                <div className="flex items-center gap-1">
                  {([45, 90, 180] as const).map((secs) => (
                    <button
                      key={secs}
                      onClick={() => onUpdateSettings({ aiCacheDurationSeconds: secs })}
                      className={`px-1.5 py-0.5 rounded text-[9px] transition-colors ${
                        (settings.aiCacheDurationSeconds || 180) === secs
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {secs}s {secs === 180 ? '(Default)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {aiSynthesis ? (
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="font-mono text-[11px] text-cyan-300 font-semibold">
                  Regime: {aiSynthesis.regime} (Conviction: {aiSynthesis.conviction}%)
                </div>
                <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
                  {aiSynthesis.reasoning.slice(0, 2).map((r, idx) => (
                    <li key={idx} className="truncate">
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-xs text-slate-400 font-mono py-2">
                Running 8-11s institutional AI synthesis...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
