/**
 * Application Header with Real-Time Heartbeat, Asset Info, and Tab Switcher
 */

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Cpu,
  Layers,
  TrendingUp,
  Settings,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { KalshiMarketAsset, UserAppSettings } from '../types/market.ts';

interface HeaderProps {
  activeTab: 'live' | 'backtest' | 'combos';
  setActiveTab: (tab: 'live' | 'backtest' | 'combos') => void;
  selectedAsset: KalshiMarketAsset;
  countdownSeconds: number;
  isUpdating: boolean;
  settings: UserAppSettings;
  onUpdateSettings: (newSettings: Partial<UserAppSettings>) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedAsset,
  countdownSeconds,
  isUpdating,
  settings,
  onUpdateSettings,
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Keyboard shortcut to toggle tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === '1') setActiveTab('live');
      if (e.altKey && e.key === '2') setActiveTab('backtest');
      if (e.altKey && e.key === '3') setActiveTab('combos');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab]);

  return (
    <>
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Logo & Live Status */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/40">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm tracking-wider text-slate-100">
                    KALSHI<span className="text-emerald-400">15M</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-400 border border-emerald-800/60 font-mono font-medium">
                    QUANT ENGINE
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span>Hurst Continuum & Eliades Offsets</span>
                </div>
              </div>
            </div>

            {/* Live Heartbeat Tick */}
            <div className="flex items-center gap-2 bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-800">
              <div
                className={`w-2 h-2 rounded-full ${
                  isUpdating ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span className="text-[11px] font-mono text-slate-300">
                {isUpdating ? 'CALCULATING...' : `TICK: ${countdownSeconds}s`}
              </span>
            </div>
          </div>

          {/* 3 Main Tabs */}
          <nav className="flex items-center bg-slate-900/80 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('live')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'live'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>1. Live Market & Signals</span>
            </button>

            <button
              onClick={() => setActiveTab('backtest')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'backtest'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>2. Backtesting & Neural Trainer</span>
            </button>

            <button
              onClick={() => setActiveTab('combos')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'combos'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3. Combo Generator</span>
            </button>
          </nav>

          {/* Right Action: Active Asset Snapshot & Settings */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex flex-col items-end px-3 py-1 rounded-md bg-slate-900 border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400">
                {selectedAsset.ticker} SPOT
              </span>
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-100">
                <span>${selectedAsset.currentPrice.toLocaleString()}</span>
                <span
                  className={`text-[10px] ${
                    selectedAsset.priceChange24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {selectedAsset.priceChange24h >= 0 ? '+' : ''}
                  {selectedAsset.priceChange24h}%
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Quant Settings & Models"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-slate-100 text-sm">System & Model Settings</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300">
              {/* AI Synthesis Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800">
                <div>
                  <div className="font-medium text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>AI Synthesis Engine</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Real-time Gemini cyclical reasoning
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.aiSynthesisEnabled}
                  onChange={(e) => onUpdateSettings({ aiSynthesisEnabled: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* AI Model Choice */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  GEMINI MODEL (3.8 FLASH / LIVE)
                </label>
                <select
                  value={settings.aiModelName}
                  onChange={(e) =>
                    onUpdateSettings({
                      aiModelName: e.target.value as 'gemini-3.8-flash' | 'gemini-3.8-live',
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="gemini-3.8-flash">Gemini 3.8 Flash (Recommended - Ultra Fast)</option>
                  <option value="gemini-3.8-live">Gemini 3.8 Live (Live Real-Time Stream)</option>
                </select>
              </div>

              {/* Heartbeat Refresh Interval */}
              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>HEARTBEAT REFRESH (SEC)</span>
                  <span className="text-emerald-400 font-bold">{settings.heartbeatIntervalSeconds}s</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="11"
                  step="1"
                  value={settings.heartbeatIntervalSeconds}
                  onChange={(e) =>
                    onUpdateSettings({ heartbeatIntervalSeconds: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Hurst Nominal Cycle Length */}
              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>HURST NOMINAL CYCLE LENGTH</span>
                  <span className="text-cyan-400 font-bold">{settings.hurstCycleLength} Bars (15m)</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="28"
                  step="2"
                  value={settings.hurstCycleLength}
                  onChange={(e) =>
                    onUpdateSettings({ hurstCycleLength: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Peter Eliades Offset Multiplier */}
              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>PETER ELIADES OFFSET MULTIPLIER</span>
                  <span className="text-amber-400 font-bold">{settings.eliadesOffsetFactor}x</span>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="1.0"
                  step="0.05"
                  value={settings.eliadesOffsetFactor}
                  onChange={(e) =>
                    onUpdateSettings({ eliadesOffsetFactor: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Min Edge Threshold */}
              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>MINIMUM EDGE THRESHOLD FOR ALERT</span>
                  <span className="text-emerald-400 font-bold">{settings.edgeThresholdPercent}%</span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="8.0"
                  step="0.5"
                  value={settings.edgeThresholdPercent}
                  onChange={(e) =>
                    onUpdateSettings({ edgeThresholdPercent: parseFloat(e.target.value) })
                  }
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Apply Parameters</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
