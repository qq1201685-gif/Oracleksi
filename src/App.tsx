/**
 * Main Application Shell: 3-Tab Architecture for Kalshi 15-Minute Market Predictor
 * 8-11s Live Tick Heartbeat, Real-Time Points & Multi-Exchange Aggregation.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp,
  Activity,
  Cpu,
  Layers,
  Settings,
  Flame,
  Radio,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  KalshiMarketAsset,
  CandleBar,
  TechnicalAnalysisPosture,
  Kalshi15mContract,
  AISynthesisResult,
  UserAppSettings,
  ChartTimeframe,
} from './types/market.ts';
import { SUPPORTED_ASSETS } from './constants/assets.ts';
import {
  computeCompleteTechnicalPosture,
  generateKalshi15mContracts,
} from './services/technicalAnalysis.ts';
import { Tab1LiveMarket } from './components/Tab1LiveMarket.tsx';
import { Tab2BacktestNeural } from './components/Tab2BacktestNeural.tsx';
import { Tab3ComboGenerator } from './components/Tab3ComboGenerator.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState<'live' | 'backtest' | 'combos'>('live');
  const [assets, setAssets] = useState<KalshiMarketAsset[]>(SUPPORTED_ASSETS);
  const [selectedAsset, setSelectedAsset] = useState<KalshiMarketAsset>(SUPPORTED_ASSETS[0]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<ChartTimeframe>('15m');
  const [candles, setCandles] = useState<CandleBar[]>([]);
  const [liveApiContracts, setLiveApiContracts] = useState<Kalshi15mContract[]>([]);
  const [aiSynthesis, setAiSynthesis] = useState<AISynthesisResult | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isAiSynthesizing, setIsAiSynthesizing] = useState<boolean>(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(9);

  // User App Settings (Default 180s AI Cache with 45s / 90s toggles)
  const [settings, setSettings] = useState<UserAppSettings>({
    hurstCycleLength: 14,
    eliadesOffsetFactor: 0.5,
    edgeThresholdPercent: 3.5,
    minConfidencePercent: 60,
    soundAlerts: false,
    heartbeatIntervalSeconds: 9,
    aiModelName: 'gemini-3.8-flash',
    aiSynthesisEnabled: true,
    aiCacheDurationSeconds: 180,
  });

  // Fetch live asset prices from multi-exchange aggregator
  const refreshMarkets = useCallback(async () => {
    try {
      const res = await fetch('/api/markets');
      if (res.ok) {
        const data = await res.json();
        if (data.assets && Array.isArray(data.assets)) {
          setAssets(data.assets);
          const current = data.assets.find((a: KalshiMarketAsset) => a.id === selectedAsset.id);
          if (current) {
            setSelectedAsset(current);
          }
        }
      }
    } catch (err) {
      console.warn('Markets fetch error:', err);
    }
  }, [selectedAsset.id]);

  // Fetch live candle bars from Kraken / Yahoo Query2
  const refreshCandles = useCallback(async (symbol: string, timeframe: ChartTimeframe = selectedTimeframe) => {
    try {
      const res = await fetch(`/api/klines?symbol=${symbol}&interval=${timeframe}&limit=120`);
      if (res.ok) {
        const data = await res.json();
        if (data.klines && Array.isArray(data.klines) && data.klines.length > 0) {
          setCandles(data.klines);
        }
      }
    } catch (err) {
      console.warn('Candles fetch error:', err);
    }
  }, [selectedTimeframe]);

  // Fetch live contracts from Kalshi public API
  const refreshKalshiContracts = useCallback(async (seriesTicker: string, spot: number) => {
    try {
      const res = await fetch(`/api/kalshi/contracts?series=${seriesTicker}&spot=${spot}`);
      if (res.ok) {
        const data = await res.json();
        if (data.contracts && Array.isArray(data.contracts) && data.contracts.length > 0) {
          setLiveApiContracts(data.contracts);
        }
      }
    } catch (err) {
      console.warn('Kalshi contracts fetch error:', err);
    }
  }, []);

  // Compute Technical Posture derived from real candles
  const posture: TechnicalAnalysisPosture = React.useMemo(() => {
    return computeCompleteTechnicalPosture(
      candles,
      settings.hurstCycleLength,
      settings.eliadesOffsetFactor
    );
  }, [candles, settings.hurstCycleLength, settings.eliadesOffsetFactor]);

  // Generate or merge contracts
  const contracts: Kalshi15mContract[] = React.useMemo(() => {
    if (liveApiContracts.length > 0) {
      return liveApiContracts;
    }
    return generateKalshi15mContracts(
      selectedAsset.ticker,
      selectedAsset.currentPrice,
      posture
    );
  }, [selectedAsset, posture, liveApiContracts]);

  const lastAiCallRef = useRef<number>(0);

  // Trigger Server-Side Gemini AI Synthesis (Configurable 180s / 90s / 45s Cache TTL with Manual Force Refresh)
  const runAiSynthesis = useCallback(async (asset: KalshiMarketAsset, currentPosture: TechnicalAnalysisPosture, force: boolean = false) => {
    if (!settings.aiSynthesisEnabled) return;
    const now = Date.now();
    const cacheTtlMs = (settings.aiCacheDurationSeconds || 180) * 1000;
    if (!force && now - lastAiCallRef.current < cacheTtlMs) return;
    lastAiCallRef.current = now;

    setIsAiSynthesizing(true);
    try {
      const res = await fetch('/api/gemini/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset,
          posture: currentPosture,
          modelName: settings.aiModelName,
          cacheDurationSeconds: settings.aiCacheDurationSeconds || 180,
          forceRefresh: force,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.synthesis) {
          setAiSynthesis(data.synthesis);
        }
      }
    } catch (err) {
      console.warn('Gemini synthesis call notice:', err);
    } finally {
      setIsAiSynthesizing(false);
    }
  }, [settings.aiSynthesisEnabled, settings.aiModelName, settings.aiCacheDurationSeconds]);

  // Full Live Tick Cycle (Runs every 8-11s)
  const executeTick = useCallback(async () => {
    setIsUpdating(true);
    await refreshMarkets();
    await refreshCandles(selectedAsset.baseSymbol, selectedTimeframe);
    await refreshKalshiContracts(selectedAsset.kalshiSeriesTicker, selectedAsset.currentPrice);
    if (settings.aiSynthesisEnabled) {
      await runAiSynthesis(selectedAsset, posture, false);
    }
    setIsUpdating(false);
    setCountdownSeconds(settings.heartbeatIntervalSeconds);
  }, [
    refreshMarkets,
    refreshCandles,
    refreshKalshiContracts,
    selectedAsset,
    selectedTimeframe,
    settings.aiSynthesisEnabled,
    settings.heartbeatIntervalSeconds,
    runAiSynthesis,
    posture,
  ]);

  // Initial load when selected asset changes
  useEffect(() => {
    refreshCandles(selectedAsset.baseSymbol, selectedTimeframe);
    refreshMarkets();
    refreshKalshiContracts(selectedAsset.kalshiSeriesTicker, selectedAsset.currentPrice);
    runAiSynthesis(selectedAsset, posture, true);
  }, [selectedAsset.id, selectedTimeframe, refreshCandles, refreshMarkets, refreshKalshiContracts]);

  // 8-11s Continuous Heartbeat Interval Loop
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          executeTick();
          return settings.heartbeatIntervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [executeTick, settings.heartbeatIntervalSeconds]);

  // Settings Updater
  const handleUpdateSettings = (newSettings: Partial<UserAppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      fetch('/api/database/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Universal Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Brand Logo & Live Badge */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black font-mono tracking-tight text-slate-100">
                  KALSHI 15M QUANT PREDICTOR
                </h1>
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 animate-pulse">
                  <Radio className="w-2.5 h-2.5" />
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Hurst Cycles • Peter Eliades Offsets • Delta ROC • Gemini 3.8 Flash
              </p>
            </div>
          </div>

          {/* Right Header Metrics: Countdown & Tab Navigation */}
          <div className="flex items-center gap-3">
            {/* 8-11s Recalculation Countdown Bar */}
            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-xs flex items-center gap-2 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">TICK:</span>
              <span className={`font-bold ${isUpdating ? 'text-emerald-400 animate-spin' : 'text-cyan-400'}`}>
                {isUpdating ? 'SYNC' : `${countdownSeconds}s`}
              </span>
            </div>

            {/* 3 Main Tabs */}
            <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 font-mono text-xs shadow-inner">
              <button
                onClick={() => setActiveTab('live')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'live'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>1. Live Market & Signals</span>
              </button>

              <button
                onClick={() => setActiveTab('backtest')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'backtest'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>2. Neural & Backtest</span>
              </button>

              <button
                onClick={() => setActiveTab('combos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'combos'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>3. Combo Generator</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main App Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-4">
        {activeTab === 'live' && (
          <Tab1LiveMarket
            assets={assets}
            selectedAsset={selectedAsset}
            onSelectAsset={(a) => {
              setSelectedAsset(a);
              refreshCandles(a.baseSymbol, selectedTimeframe);
              refreshKalshiContracts(a.kalshiSeriesTicker, a.currentPrice);
            }}
            candles={candles}
            posture={posture}
            contracts={contracts}
            aiSynthesis={aiSynthesis}
            countdownSeconds={countdownSeconds}
            isUpdating={isUpdating}
            onManualRefresh={executeTick}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onManualAiSynthesis={() => runAiSynthesis(selectedAsset, posture, true)}
            isAiSynthesizing={isAiSynthesizing}
            currentTimeframe={selectedTimeframe}
            onSelectTimeframe={(tf) => {
              setSelectedTimeframe(tf);
              refreshCandles(selectedAsset.baseSymbol, tf);
            }}
          />
        )}

        {activeTab === 'backtest' && (
          <Tab2BacktestNeural
            selectedAsset={selectedAsset}
            candles={candles}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {activeTab === 'combos' && (
          <Tab3ComboGenerator
            selectedAsset={selectedAsset}
            contracts={contracts}
            posture={posture}
          />
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-2.5 text-center text-[11px] font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Kalshi 15M Quant Predictor • Live Multi-Exchange Feed (CoinGecko, Kraken, Yahoo Query2, Frankfurter, Kalshi)
          </span>
          <span className="text-slate-400">
            Current Wall Clock: {new Date().toLocaleTimeString()} (Modulo 15M Synced)
          </span>
        </div>
      </footer>
    </div>
  );
}
