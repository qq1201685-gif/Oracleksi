/**
 * Backtesting Engine for Kalshi 15-Minute Prediction Contracts
 * Strictly evaluates Kalshi 15m Binary Settlement:
 * Resolution: YES if Close(t+1) >= Open(t+1) [Strike], NO if Close(t+1) < Open(t+1).
 */

import {
  CandleBar,
  BacktestResult,
  BacktestTrade,
  TradeRecommendation,
} from '../types/market.ts';
import {
  computeCompleteTechnicalPosture,
  calculateBinaryOptionFairOdds,
} from './technicalAnalysis.ts';
import { NeuralClassifier, extractCandleFeatures } from './neuralEngine.ts';

export interface BacktestOptions {
  candles: CandleBar[];
  assetTicker: string;
  nominalCycleLength: number;
  eliadesOffsetFactor: number;
  edgeThresholdPercent: number;
  neuralNetwork?: NeuralClassifier;
  useNeuralFilter: boolean;
}

export function runKalshi15mBacktest(options: BacktestOptions): BacktestResult {
  const {
    candles,
    assetTicker,
    nominalCycleLength,
    eliadesOffsetFactor,
    edgeThresholdPercent,
    neuralNetwork,
    useNeuralFilter,
  } = options;

  const trades: BacktestTrade[] = [];
  const lookback = Math.max(20, nominalCycleLength * 2);

  let cumulativePnl = 0;
  let peakPnl = 0;
  let maxDrawdownCents = 0;
  let grossGains = 0;
  let grossLosses = 0;
  let winCount = 0;
  let lossCount = 0;
  let scratchCount = 0;

  for (let i = lookback; i < candles.length - 1; i++) {
    const window = candles.slice(i - lookback, i + 1);
    const currentBar = candles[i];
    const nextBar = candles[i + 1];

    // Strike price is the open of the 15-minute contract bracket (CF Benchmarks BRTI 15m bracket)
    const strikePrice = nextBar.open;
    const settlementPrice = nextBar.close;

    // Technical posture calculated on historical window
    const posture = computeCompleteTechnicalPosture(window, nominalCycleLength, eliadesOffsetFactor);

    // Theoretical fair odds calculated from the 7-pillar model
    let cyclicalDriftBps = 0;
    if (posture.eliadesOffsets.projectedTargetDirection === 'UP') {
      cyclicalDriftBps += posture.eliadesOffsets.projectionValidity * 1.6;
    } else if (posture.eliadesOffsets.projectedTargetDirection === 'DOWN') {
      cyclicalDriftBps -= posture.eliadesOffsets.projectionValidity * 1.6;
    }

    if (posture.hurstCycles.cyclePhase === 'rising_expansion' || posture.hurstCycles.cyclePhase === 'trough_forming') {
      cyclicalDriftBps += 45;
    } else if (posture.hurstCycles.cyclePhase === 'declining_contraction' || posture.hurstCycles.cyclePhase === 'crest_peak') {
      cyclicalDriftBps -= 45;
    }

    cyclicalDriftBps += posture.momentumDeltaROC.volumeWeightedROC * 90;

    const technicalFairOdds = calculateBinaryOptionFairOdds(
      currentBar.close,
      strikePrice,
      900,
      0.40,
      cyclicalDriftBps
    );

    let neuralProb = technicalFairOdds / 100;
    if (neuralNetwork && useNeuralFilter) {
      const features = extractCandleFeatures(window, strikePrice);
      neuralProb = neuralNetwork.predict(features);
    }

    const blendedFairOdds = useNeuralFilter
      ? technicalFairOdds * 0.45 + neuralProb * 100 * 0.55
      : technicalFairOdds;

    // Kalshi 15m ATM baseline market entry cost is ~50¢ (with typical 1¢ - 2¢ bid-ask spread)
    const marketImpliedOdds = 50;
    const edgePercent = blendedFairOdds - marketImpliedOdds;
    const yesEntryPriceCents = 51; // 51¢ ask
    const noEntryPriceCents = 51;  // 51¢ ask

    let action: TradeRecommendation = 'WAIT';
    let entryPriceCents = 0;

    if (edgePercent >= edgeThresholdPercent) {
      action = 'BUY_YES';
      entryPriceCents = yesEntryPriceCents;
    } else if (edgePercent <= -edgeThresholdPercent) {
      action = 'BUY_NO';
      entryPriceCents = noEntryPriceCents;
    }

    if (action !== 'WAIT') {
      let outcome: 'WIN' | 'LOSS' | 'SCRATCH' = 'LOSS';
      let tradePnl = 0;

      // Kalshi 15m Settlement Rule:
      // YES wins 100¢ if settlementPrice >= strikePrice; otherwise 0¢.
      // NO wins 100¢ if settlementPrice < strikePrice; otherwise 0¢.
      if (action === 'BUY_YES') {
        if (settlementPrice >= strikePrice) {
          outcome = 'WIN';
          tradePnl = 100 - entryPriceCents;
          grossGains += tradePnl;
          winCount++;
        } else {
          outcome = 'LOSS';
          tradePnl = -entryPriceCents;
          grossLosses += entryPriceCents;
          lossCount++;
        }
      } else if (action === 'BUY_NO') {
        if (settlementPrice < strikePrice) {
          outcome = 'WIN';
          tradePnl = 100 - entryPriceCents;
          grossGains += tradePnl;
          winCount++;
        } else {
          outcome = 'LOSS';
          tradePnl = -entryPriceCents;
          grossLosses += entryPriceCents;
          lossCount++;
        }
      }

      cumulativePnl += tradePnl;
      if (cumulativePnl > peakPnl) peakPnl = cumulativePnl;
      const dd = peakPnl - cumulativePnl;
      if (dd > maxDrawdownCents) maxDrawdownCents = dd;

      trades.push({
        time: currentBar.time,
        strikePrice,
        contractTicker: `KX-${assetTicker}-15M-${Math.round(strikePrice)}`,
        action,
        entryPriceCents,
        settlementPrice,
        outcome,
        pnlCents: tradePnl,
        runningPnlCents: cumulativePnl,
        edgeAtEntry: parseFloat(edgePercent.toFixed(1)),
        modelConfidence: Math.min(99, Math.round(50 + Math.abs(edgePercent) * 3.5)),
      });
    }
  }

  const totalTrades = winCount + lossCount + scratchCount;
  const winRatePercent = totalTrades > 0 ? parseFloat(((winCount / totalTrades) * 100).toFixed(1)) : 0;
  const profitFactor = grossLosses > 0 ? parseFloat((grossGains / grossLosses).toFixed(2)) : parseFloat(grossGains.toFixed(2));
  const avgTradePnl = totalTrades > 0 ? parseFloat((cumulativePnl / totalTrades).toFixed(2)) : 0;

  // Real Sharpe ratio estimation
  const tradePnls = trades.map((t) => t.pnlCents);
  let stdDev = 1;
  if (tradePnls.length > 1) {
    const mean = cumulativePnl / tradePnls.length;
    const variance = tradePnls.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / (tradePnls.length - 1);
    stdDev = Math.sqrt(variance) || 1;
  }
  const sharpe = parseFloat(((avgTradePnl / stdDev) * Math.sqrt(96)).toFixed(2)); // ~96 15m intervals/day

  return {
    totalTrades,
    winCount,
    lossCount,
    scratchCount,
    winRatePercent,
    totalReturnCents: cumulativePnl,
    profitFactor,
    sharpeRatio: isNaN(sharpe) ? 0 : sharpe,
    maxDrawdownPercent: parseFloat(maxDrawdownCents.toFixed(1)),
    averageTradePnlCents: avgTradePnl,
    trades,
  };
}
