/**
 * Tab 3: Combo Contract Generator with Aggression vs. Accuracy Optimization
 * Multi-Leg Spreads, Payoff Diagrams, Expected Value, and Kelly Sizing.
 */

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Sliders,
  DollarSign,
  TrendingUp,
  Shield,
  Zap,
  Copy,
  Check,
  Percent,
  Calculator,
  ArrowRight,
} from 'lucide-react';
import {
  KalshiMarketAsset,
  Kalshi15mContract,
  TechnicalAnalysisPosture,
  ComboStrategy,
} from '../types/market.ts';
import { generateComboStrategies } from '../services/comboGenerator.ts';

interface Tab3ComboGeneratorProps {
  selectedAsset: KalshiMarketAsset;
  contracts: Kalshi15mContract[];
  posture: TechnicalAnalysisPosture;
}

export const Tab3ComboGenerator: React.FC<Tab3ComboGeneratorProps> = ({
  selectedAsset,
  contracts,
  posture,
}) => {
  const [aggression, setAggression] = useState<number>(45); // 0 to 100
  const [bankrollDollars, setBankrollDollars] = useState<number>(1000);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Generate combo strategies based on aggression slider & live market contracts
  const strategies = useMemo(() => {
    return generateComboStrategies(selectedAsset, contracts, posture, aggression, bankrollDollars);
  }, [selectedAsset, contracts, posture, aggression, bankrollDollars]);

  const handleCopyBlueprint = (strat: ComboStrategy) => {
    const text = `=== KALSHI 15M COMBO EXECUTION BLUEPRINT ===
Strategy: ${strat.name} (${strat.category})
Asset: ${selectedAsset.ticker} ($${selectedAsset.currentPrice})
Aggression / Accuracy: ${strat.aggressionScore}% / ${strat.accuracyScore}%
Win Probability: ${strat.winProbabilityPercent}%
Expected Value: +${strat.expectedValueCents}¢ / contract
Max Profit: ${strat.maxProfitCents}¢ | Max Risk: ${strat.maxRiskCents}¢
Recommended Position Size (Quarter-Kelly): ${strat.recommendedKellyContracts} contracts

LEGS:
${strat.legs
  .map(
    (l) =>
      `• ${l.action} ${l.contractsCount * strat.recommendedKellyContracts}x ${l.contractTicker} [${l.side} @ $${l.strike}] @ ${l.priceCents}¢`
  )
  .join('\n')}
=============================================`;

    navigator.clipboard.writeText(text);
    setCopiedId(strat.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Aggression vs Accuracy Slider */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono text-slate-100 uppercase tracking-wider">
                15-Minute Multi-Leg Combo Contract Generator
              </h2>
              <p className="text-xs text-slate-400">
                Optimize multi-strike Kalshi combinations with quantitative payoff profiles and Kelly position sizing.
              </p>
            </div>
          </div>

          {/* Bankroll Sizing Input */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-xs">
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">BANKROLL:</span>
            <span className="text-slate-200 font-bold">$</span>
            <input
              type="number"
              min="100"
              max="50000"
              step="100"
              value={bankrollDollars}
              onChange={(e) => setBankrollDollars(Math.max(50, parseInt(e.target.value || '100', 10)))}
              className="w-20 bg-transparent text-emerald-400 font-bold focus:outline-none"
            />
          </div>
        </div>

        {/* Aggression vs Accuracy Slider */}
        <div className="space-y-2 font-mono">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Shield className="w-4 h-4" />
              <span>HIGH ACCURACY & HEDGED (0%)</span>
            </div>

            <div className="text-slate-200 font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
              Aggression: {aggression}% | Accuracy Target: {100 - aggression}%
            </div>

            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Zap className="w-4 h-4" />
              <span>MAX CONVEX AGGRESSION (100%)</span>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={aggression}
            onChange={(e) => setAggression(parseInt(e.target.value, 10))}
            className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
          />

          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Range Bracket Boxes, Hurst Stability Harvests (Low Risk)</span>
            <span>Directional Binary Corridors & Eliades Target Pairs (Balanced)</span>
            <span>Dual-Wing Breakout Strangles & Delta Snipers (Convex Upside)</span>
          </div>
        </div>
      </div>

      {/* Generated Combo Strategy Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {strategies.map((strat) => {
          const isCopied = copiedId === strat.id;
          return (
            <div
              key={strat.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 shadow-lg space-y-3.5 transition-all flex flex-col justify-between"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-mono font-bold text-sm text-slate-100">{strat.name}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800">
                      {strat.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{strat.description}</p>
                </div>

                <button
                  onClick={() => handleCopyBlueprint(strat)}
                  className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400 text-xs font-mono flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copied' : 'Blueprint'}</span>
                </button>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">WIN PROB</span>
                  <span className="text-emerald-400 font-bold">{strat.winProbabilityPercent}%</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">MAX PROFIT</span>
                  <span className="text-cyan-400 font-bold">+{strat.maxProfitCents}¢</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">MAX RISK</span>
                  <span className="text-rose-400 font-bold">{strat.maxRiskCents}¢</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">THEORETICAL EV</span>
                  <span className="text-amber-400 font-bold">+{strat.expectedValueCents}¢</span>
                </div>
              </div>

              {/* Dynamic Payoff Diagram SVG */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>PAYOFF DIAGRAM (SETTLEMENT PRICE VS P&L IN CENTS)</span>
                  <span className="text-emerald-400">R:R {strat.riskRewardRatio}:1</span>
                </div>

                <div className="w-full h-24 relative flex items-center">
                  {strat.payoffCurve.length > 1 && (
                    <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                      {/* Zero line */}
                      <line x1="0" y1="20" x2="100" y2="20" stroke="#334155" strokeWidth="0.8" strokeDasharray="2,2" />
                      {/* Payoff Polyline */}
                      <polyline
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="1.8"
                        points={strat.payoffCurve
                          .map((pt, idx) => {
                            const x = (idx / (strat.payoffCurve.length - 1)) * 100;
                            // Map -100 to +100 cents to 40 to 0 y-coords
                            const y = 20 - (pt.pnlCents / 100) * 18;
                            return `${x},${Math.min(38, Math.max(2, y))}`;
                          })
                          .join(' ')}
                      />
                    </svg>
                  )}
                </div>

                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>${strat.payoffCurve[0]?.price.toLocaleString()}</span>
                  <span className="text-cyan-400 font-bold">Current: ${selectedAsset.currentPrice.toLocaleString()}</span>
                  <span>${strat.payoffCurve[strat.payoffCurve.length - 1]?.price.toLocaleString()}</span>
                </div>
              </div>

              {/* Leg Breakdown Table */}
              <div className="space-y-1.5 font-mono text-xs">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Multi-Leg Execution Structure</div>
                <div className="space-y-1">
                  {strat.legs.map((leg, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800 flex items-center justify-between text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                            leg.action === 'BUY' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                          }`}
                        >
                          {leg.action}
                        </span>
                        <span className="text-slate-200">
                          {leg.side} @ ${leg.strike.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-slate-400">
                        Price: <span className="text-slate-200 font-bold">{leg.priceCents}¢</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kelly Sizing Recommendation Footer */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between font-mono text-xs">
                <div className="text-slate-400 text-[11px]">
                  Quarter-Kelly Recommended Size (${bankrollDollars} Bankroll):
                </div>
                <div className="text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800">
                  {strat.recommendedKellyContracts} Contracts
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
