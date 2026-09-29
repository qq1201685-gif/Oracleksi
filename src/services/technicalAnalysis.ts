/**
 * Technical Analysis, Hurst Cycle Continuum, Peter Eliades Offsets,
 * AskSlim Slim Ribbon & Reversal Scout, Delta ROC, and Kalshi Binary Pricing Engine.
 */

import {
  CandleBar,
  TechnicalAnalysisPosture,
  Kalshi15mContract,
  TradeRecommendation,
} from '../types/market.ts';

/**
 * Standard Cumulative Normal Distribution N(x) approximation (Abramowitz & Stegun)
 */
export function standardNormalCdf(x: number): number {
  if (isNaN(x)) return 0.5;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.SQRT2;

  const t = 1.0 / (1.0 + p * absX);
  const erf = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * erf);
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length === 0) return [];
  const k = 2 / (period + 1);
  const emaArray: number[] = [prices[0]];

  for (let i = 1; i < prices.length; i++) {
    const ema = prices[i] * k + emaArray[i - 1] * (1 - k);
    emaArray.push(ema);
  }
  return emaArray;
}

/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(prices: number[], period: number): number[] {
  const smaArray: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      smaArray.push(prices[i]);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += prices[i - j];
    }
    smaArray.push(sum / period);
  }
  return smaArray;
}

/**
 * Calculate Weighted Moving Average (WMA)
 */
export function calculateWMA(prices: number[], period: number): number[] {
  const wmaArray: number[] = [];
  const denominator = (period * (period + 1)) / 2;

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      wmaArray.push(prices[i]);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += prices[i - (period - 1 - j)] * (j + 1);
    }
    wmaArray.push(sum / denominator);
  }
  return wmaArray;
}

/**
 * Calculate AskSlim Reversal Scout (Hull Moving Average HMA 14)
 * HMA = WMA(2 * WMA(n/2) - WMA(n), sqrt(n))
 */
export function calculateAskSlimReversalScout(prices: number[], period: number = 14): number[] {
  if (prices.length < period) return [...prices];

  const halfPeriod = Math.max(1, Math.round(period / 2));
  const sqrtPeriod = Math.max(1, Math.round(Math.sqrt(period)));

  const wmaHalf = calculateWMA(prices, halfPeriod);
  const wmaFull = calculateWMA(prices, period);

  const diffSeries: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    diffSeries.push(2 * wmaHalf[i] - wmaFull[i]);
  }

  return calculateWMA(diffSeries, sqrtPeriod);
}

/**
 * Calculate Relative Strength Index (RSI)
 */
export function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: number; middle: number; lower: number; bandWidthPercent: number; percentB: number } {
  if (closes.length < period) {
    const last = closes[closes.length - 1] || 100;
    return {
      upper: last * 1.01,
      middle: last,
      lower: last * 0.99,
      bandWidthPercent: 2,
      percentB: 0.5,
    };
  }

  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
  const std = Math.sqrt(variance);

  const upper = mean + stdDevMultiplier * std;
  const lower = mean - stdDevMultiplier * std;
  const current = closes[closes.length - 1];
  const bandWidth = ((upper - lower) / mean) * 100;
  const percentB = upper !== lower ? (current - lower) / (upper - lower) : 0.5;

  return { upper, middle: mean, lower, bandWidthPercent: bandWidth, percentB };
}

/**
 * Calculate MACD (12, 26, 9)
 */
export function calculateMACD(
  closes: number[]
): { macd: number; signal: number; hist: number; crossover: 'BULLISH' | 'BEARISH' | 'NONE' } {
  if (closes.length < 26) {
    return { macd: 0, signal: 0, hist: 0, crossover: 'NONE' };
  }

  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    macdLine.push(ema12[i] - ema26[i]);
  }

  const signalLine = calculateEMA(macdLine, 9);
  const curMacd = macdLine[macdLine.length - 1];
  const curSignal = signalLine[signalLine.length - 1];
  const curHist = curMacd - curSignal;

  const prevMacd = macdLine[macdLine.length - 2] || curMacd;
  const prevSignal = signalLine[signalLine.length - 2] || curSignal;

  let crossover: 'BULLISH' | 'BEARISH' | 'NONE' = 'NONE';
  if (prevMacd <= prevSignal && curMacd > curSignal) crossover = 'BULLISH';
  else if (prevMacd >= prevSignal && curMacd < curSignal) crossover = 'BEARISH';

  return { macd: curMacd, signal: curSignal, hist: curHist, crossover };
}

/**
 * Hurst Exponent Estimation via Rescaled Range (R/S) Analysis
 */
export function calculateHurstExponent(prices: number[]): number {
  if (prices.length < 32) return 0.55;

  const logReturns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    logReturns.push(Math.log(prices[i] / prices[i - 1]));
  }

  const subSizes = [8, 16, 32].filter((s) => s <= logReturns.length);
  if (subSizes.length === 0) return 0.52;

  const rsValues: { size: number; rs: number }[] = [];

  for (const n of subSizes) {
    const numSubsets = Math.floor(logReturns.length / n);
    let totalRS = 0;

    for (let sub = 0; sub < numSubsets; sub++) {
      const subset = logReturns.slice(sub * n, (sub + 1) * n);
      const mean = subset.reduce((a, b) => a + b, 0) / n;

      let cumDev = 0;
      let minCum = 0;
      let maxCum = 0;
      let sumSq = 0;

      for (let j = 0; j < n; j++) {
        const dev = subset[j] - mean;
        cumDev += dev;
        if (cumDev < minCum) minCum = dev;
        if (cumDev > maxCum) maxCum = dev;
        sumSq += dev * dev;
      }

      const range = maxCum - minCum;
      const std = Math.sqrt(sumSq / n) || 0.0001;
      totalRS += range / std;
    }

    rsValues.push({ size: n, rs: totalRS / numSubsets });
  }

  if (rsValues.length < 2) return 0.58;

  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;
  const count = rsValues.length;

  for (const item of rsValues) {
    const x = Math.log(item.size);
    const y = Math.log(Math.max(item.rs, 0.001));
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const slope = (count * sumXY - sumX * sumY) / (count * sumX2 - sumX * sumX);
  return Math.min(Math.max(Number.isFinite(slope) ? slope : 0.55, 0.05), 0.95);
}

/**
 * J.M. Hurst Cycle Continuum Analysis
 */
export function analyzeHurstCycles(
  candles: CandleBar[],
  nominalCycleLength: number = 14
): TechnicalAnalysisPosture['hurstCycles'] {
  const closes = candles.map((c) => c.close);
  const len = closes.length;
  if (len < nominalCycleLength + 5) {
    const last = closes[len - 1] || 100;
    return {
      nominalCycleLength,
      cyclePhase: 'rising_expansion',
      displacedMaUpper: last * 1.008,
      displacedMaLower: last * 0.992,
      displacedMaCenter: last,
      cycleDominantPeriod: nominalCycleLength,
      hurstExponent: 0.58,
      cyclicalPower: 65,
    };
  }

  const displacement = Math.floor(nominalCycleLength / 2);
  const smaCenter = calculateSMA(closes, nominalCycleLength);

  const displacedIdx = Math.max(0, len - 1 - displacement);
  const displacedMaCenter = smaCenter[displacedIdx] || closes[len - 1];

  let sumDeviation = 0;
  for (let i = Math.max(0, len - nominalCycleLength); i < len; i++) {
    sumDeviation += Math.abs(closes[i] - smaCenter[i]);
  }
  const avgDev = (sumDeviation / nominalCycleLength) * 1.6;

  const displacedMaUpper = displacedMaCenter + avgDev;
  const displacedMaLower = displacedMaCenter - avgDev;

  const currentPrice = closes[len - 1];
  const prevPrice = closes[len - 2];
  const hurstExponent = calculateHurstExponent(closes);

  let cyclePhase: 'trough_forming' | 'rising_expansion' | 'crest_peak' | 'declining_contraction';
  if (currentPrice <= displacedMaLower) {
    cyclePhase = 'trough_forming';
  } else if (currentPrice >= displacedMaUpper) {
    cyclePhase = 'crest_peak';
  } else if (currentPrice > displacedMaCenter && currentPrice > prevPrice) {
    cyclePhase = 'rising_expansion';
  } else {
    cyclePhase = 'declining_contraction';
  }

  const cyclicalPower = Math.round(
    Math.min(100, Math.max(20, hurstExponent * 70 + (Math.abs(currentPrice - displacedMaCenter) / avgDev) * 30))
  );

  return {
    nominalCycleLength,
    cyclePhase,
    displacedMaUpper: parseFloat(displacedMaUpper.toFixed(2)),
    displacedMaLower: parseFloat(displacedMaLower.toFixed(2)),
    displacedMaCenter: parseFloat(displacedMaCenter.toFixed(2)),
    cycleDominantPeriod: nominalCycleLength,
    hurstExponent: parseFloat(hurstExponent.toFixed(3)),
    cyclicalPower,
  };
}

/**
 * Peter Eliades Nominal Offset Continuum Projections (Stock Market Cycles)
 */
export function analyzePeterEliadesOffsets(
  candles: CandleBar[],
  nominalCycleLength: number = 14,
  offsetFactor: number = 0.5
): TechnicalAnalysisPosture['eliadesOffsets'] {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const len = closes.length;

  const offsetLength = Math.max(2, Math.round(nominalCycleLength * offsetFactor));
  const sma = calculateSMA(closes, offsetLength);

  if (len < offsetLength * 2) {
    const last = closes[len - 1] || 100;
    return {
      offsetLength,
      offsetLine: last,
      projectedTargetPrice: last,
      projectedTargetDirection: 'NEUTRAL',
      crossoverConfirmed: false,
      projectionValidity: 50,
      nominalCycleOffsetLevel: last,
    };
  }

  const lookback = Math.min(len - 1, nominalCycleLength * 2);
  let minLow = Infinity;
  let maxHigh = -Infinity;

  for (let i = len - lookback; i < len; i++) {
    if (lows[i] < minLow) minLow = lows[i];
    if (highs[i] > maxHigh) maxHigh = highs[i];
  }

  const currentPrice = closes[len - 1];
  const offsetLine = sma[len - 1 - Math.floor(offsetLength / 2)] || sma[len - 1];

  let projectedTargetPrice = currentPrice;
  let projectedTargetDirection: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
  let crossoverConfirmed = false;
  let projectionValidity = 60;

  // Peter Eliades Offset Crossover Rule:
  if (currentPrice > offsetLine && closes[len - 2] <= offsetLine) {
    crossoverConfirmed = true;
    projectedTargetDirection = 'UP';
    const deltaFromTrough = Math.max(0.1, currentPrice - minLow);
    projectedTargetPrice = currentPrice + deltaFromTrough;
    projectionValidity = 88;
  } else if (currentPrice < offsetLine && closes[len - 2] >= offsetLine) {
    crossoverConfirmed = true;
    projectedTargetDirection = 'DOWN';
    const deltaFromCrest = Math.max(0.1, maxHigh - currentPrice);
    projectedTargetPrice = currentPrice - deltaFromCrest;
    projectionValidity = 88;
  } else if (currentPrice > offsetLine) {
    projectedTargetDirection = 'UP';
    const deltaFromTrough = Math.max(0.1, currentPrice - minLow);
    projectedTargetPrice = currentPrice + deltaFromTrough * 0.75;
    projectionValidity = 75;
  } else if (currentPrice < offsetLine) {
    projectedTargetDirection = 'DOWN';
    const deltaFromCrest = Math.max(0.1, maxHigh - currentPrice);
    projectedTargetPrice = currentPrice - deltaFromCrest * 0.75;
    projectionValidity = 75;
  }

  return {
    offsetLength,
    offsetLine: parseFloat(offsetLine.toFixed(2)),
    projectedTargetPrice: parseFloat(projectedTargetPrice.toFixed(2)),
    projectedTargetDirection,
    crossoverConfirmed,
    projectionValidity,
    nominalCycleOffsetLevel: parseFloat(sma[len - 1].toFixed(2)),
  };
}

/**
 * Momentum & Delta Rate of Change (ROC) Analysis
 */
export function analyzeDeltaROC(candles: CandleBar[]): TechnicalAnalysisPosture['momentumDeltaROC'] {
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const len = closes.length;

  if (len < 5) {
    return {
      roc1: 0,
      roc3: 0,
      rocAcceleration: 0,
      volumeWeightedROC: 0,
      velocityPosture: 'STAGNANT',
    };
  }

  const p0 = closes[len - 1];
  const p1 = closes[len - 2];
  const p2 = closes[len - 3];
  const p3 = closes[len - 4];

  const roc1 = ((p0 - p1) / p1) * 100;
  const roc1_prev = ((p1 - p2) / p2) * 100;
  const roc3 = ((p0 - p3) / p3) * 100;

  const rocAcceleration = roc1 - roc1_prev;

  const avgVol = volumes.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, volumes.length) || 1;
  const curVol = volumes[len - 1] || 1;
  const volumeMultiplier = Math.min(3, Math.max(0.5, curVol / avgVol));
  const volumeWeightedROC = roc1 * volumeMultiplier;

  let velocityPosture: TechnicalAnalysisPosture['momentumDeltaROC']['velocityPosture'] = 'STAGNANT';

  if (roc1 > 0.05) {
    velocityPosture = rocAcceleration >= 0 ? 'ACCELERATING_BULL' : 'DECELERATING_BULL';
  } else if (roc1 < -0.05) {
    velocityPosture = rocAcceleration <= 0 ? 'ACCELERATING_BEAR' : 'DECELERATING_BEAR';
  } else {
    velocityPosture = 'STAGNANT';
  }

  return {
    roc1: parseFloat(roc1.toFixed(3)),
    roc3: parseFloat(roc3.toFixed(3)),
    rocAcceleration: parseFloat(rocAcceleration.toFixed(3)),
    volumeWeightedROC: parseFloat(volumeWeightedROC.toFixed(3)),
    velocityPosture,
  };
}

/**
 * AskSlim Slim Ribbon (EMA 8, 13, 21) & Reversal Scout (HMA 14) Posture
 */
export function analyzeAskSlimPosture(
  candles: CandleBar[],
  nominalCycleLength: number = 14
): TechnicalAnalysisPosture['askslimPosture'] {
  const closes = candles.map((c) => c.close);
  const lows = candles.map((c) => c.low);
  const len = closes.length;

  if (len < nominalCycleLength) {
    const last = closes[len - 1] || 100;
    return {
      swingPosture: 'NEUTRAL',
      cycleLowTimingCountdownBars: 4,
      reversalZoneLow: last * 0.995,
      reversalZoneHigh: last * 1.005,
      cyclePhaseDegree: 180,
    };
  }

  let minLowIdx = len - 1;
  for (let i = len - nominalCycleLength; i < len; i++) {
    if (lows[i] <= lows[minLowIdx]) {
      minLowIdx = i;
    }
  }

  const barsSinceLow = len - 1 - minLowIdx;
  const cyclePhaseDegree = Math.round(((barsSinceLow % nominalCycleLength) / nominalCycleLength) * 360);
  const countdownToNextTrough = Math.max(0, nominalCycleLength - barsSinceLow);

  // Slim Ribbon: EMA 8, 13, 21
  const ema8 = calculateEMA(closes, 8);
  const ema13 = calculateEMA(closes, 13);
  const ema21 = calculateEMA(closes, 21);

  const cur8 = ema8[len - 1];
  const cur13 = ema13[len - 1];
  const cur21 = ema21[len - 1];
  const curPrice = closes[len - 1];

  // Reversal Scout (HMA 14)
  const reversalScout = calculateAskSlimReversalScout(closes, 14);
  const curScout = reversalScout[len - 1];
  const prevScout = reversalScout[len - 2] || curScout;
  const isScoutRising = curScout > prevScout;

  let swingPosture: TechnicalAnalysisPosture['askslimPosture']['swingPosture'] = 'NEUTRAL';
  if (cur8 > cur13 && cur13 > cur21 && curPrice >= cur8 && isScoutRising) {
    swingPosture = 'VERY_BULLISH';
  } else if (cur8 > cur13 && isScoutRising) {
    swingPosture = 'BULLISH';
  } else if (cur8 < cur13 && cur13 < cur21 && curPrice <= cur8 && !isScoutRising) {
    swingPosture = 'VERY_BEARISH';
  } else if (cur8 < cur13 && !isScoutRising) {
    swingPosture = 'BEARISH';
  } else {
    swingPosture = 'NEUTRAL';
  }

  const atrSlice = candles.slice(-8);
  const avgRange = atrSlice.reduce((acc, c) => acc + (c.high - c.low), 0) / atrSlice.length;

  return {
    swingPosture,
    cycleLowTimingCountdownBars: countdownToNextTrough,
    reversalZoneLow: parseFloat((curPrice - avgRange * 0.8).toFixed(2)),
    reversalZoneHigh: parseFloat((curPrice + avgRange * 0.8).toFixed(2)),
    cyclePhaseDegree,
  };
}

/**
 * Sardine.info Pattern Recognition
 */
export function analyzeSardinePatterns(candles: CandleBar[]): TechnicalAnalysisPosture['sardinePattern'] {
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const closes = candles.map((c) => c.close);
  const len = closes.length;

  if (len < 10) {
    const last = closes[len - 1] || 100;
    return {
      patternName: 'Consolidation Range',
      breakoutLevel: last * 1.004,
      breakdownLevel: last * 0.996,
      patternBias: 'RANGE',
      qualityScore: 60,
    };
  }

  const recentHighs = highs.slice(-12);
  const recentLows = lows.slice(-12);
  const resistance = Math.max(...recentHighs);
  const support = Math.min(...recentLows);
  const currentPrice = closes[len - 1];

  let patternName = 'Horizontal Range Channel';
  let patternBias: 'BULLISH' | 'BEARISH' | 'RANGE' = 'RANGE';
  let qualityScore = 70;

  const higherLows = lows[len - 1] > lows[len - 4] && lows[len - 4] > lows[len - 8];
  const lowerHighs = highs[len - 1] < highs[len - 4] && highs[len - 4] < highs[len - 8];

  if (higherLows && Math.abs(highs[len - 1] - highs[len - 4]) / currentPrice < 0.002) {
    patternName = 'Ascending Triangle (Bullish Compression)';
    patternBias = 'BULLISH';
    qualityScore = 88;
  } else if (lowerHighs && Math.abs(lows[len - 1] - lows[len - 4]) / currentPrice < 0.002) {
    patternName = 'Descending Triangle (Bearish Compression)';
    patternBias = 'BEARISH';
    qualityScore = 88;
  } else if (higherLows && !lowerHighs) {
    patternName = 'Upward Momentum Trend Channel';
    patternBias = 'BULLISH';
    qualityScore = 82;
  } else if (lowerHighs && !higherLows) {
    patternName = 'Downward Momentum Pressure Channel';
    patternBias = 'BEARISH';
    qualityScore = 82;
  }

  return {
    patternName,
    breakoutLevel: parseFloat(resistance.toFixed(2)),
    breakdownLevel: parseFloat(support.toFixed(2)),
    patternBias,
    qualityScore,
  };
}

/**
 * Complete Synthesis of Technical Posture
 */
export function computeCompleteTechnicalPosture(
  candles: CandleBar[],
  nominalCycleLength: number = 14,
  eliadesOffsetFactor: number = 0.5
): TechnicalAnalysisPosture {
  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1] || 100;

  const rsi = calculateRSI(closes, 14);
  let rsiPosture: TechnicalAnalysisPosture['rsiPosture'] = 'NEUTRAL';
  if (rsi > 70) rsiPosture = 'OVERBOUGHT';
  else if (rsi > 55) rsiPosture = 'BULLISH_MOMENTUM';
  else if (rsi < 30) rsiPosture = 'OVERSOLD';
  else if (rsi < 45) rsiPosture = 'BEARISH_MOMENTUM';

  const emaFastList = calculateEMA(closes, 8);
  const emaSlowList = calculateEMA(closes, 21);
  const emaFast = emaFastList[emaFastList.length - 1] || currentPrice;
  const emaSlow = emaSlowList[emaSlowList.length - 1] || currentPrice;

  let trendPosture: TechnicalAnalysisPosture['trendPosture'] = 'NEUTRAL';
  const spreadPercent = ((emaFast - emaSlow) / emaSlow) * 100;
  if (spreadPercent > 0.3) trendPosture = 'STRONG_BULL';
  else if (spreadPercent > 0.05) trendPosture = 'MILD_BULL';
  else if (spreadPercent < -0.3) trendPosture = 'STRONG_BEAR';
  else if (spreadPercent < -0.05) trendPosture = 'MILD_BEAR';

  const bollinger = calculateBollingerBands(closes, 20, 2);
  const macd = calculateMACD(closes);
  const hurstCycles = analyzeHurstCycles(candles, nominalCycleLength);
  const eliadesOffsets = analyzePeterEliadesOffsets(candles, nominalCycleLength, eliadesOffsetFactor);
  const momentumDeltaROC = analyzeDeltaROC(candles);
  const askslimPosture = analyzeAskSlimPosture(candles, nominalCycleLength);
  const sardinePattern = analyzeSardinePatterns(candles);

  return {
    rsi: parseFloat(rsi.toFixed(2)),
    rsiPosture,
    emaFast: parseFloat(emaFast.toFixed(2)),
    emaSlow: parseFloat(emaSlow.toFixed(2)),
    trendPosture,
    bollinger: {
      upper: parseFloat(bollinger.upper.toFixed(2)),
      middle: parseFloat(bollinger.middle.toFixed(2)),
      lower: parseFloat(bollinger.lower.toFixed(2)),
      bandWidthPercent: parseFloat(bollinger.bandWidthPercent.toFixed(2)),
      percentB: parseFloat(bollinger.percentB.toFixed(3)),
    },
    macd: {
      macd: parseFloat(macd.macd.toFixed(4)),
      signal: parseFloat(macd.signal.toFixed(4)),
      hist: parseFloat(macd.hist.toFixed(4)),
      crossover: macd.crossover,
    },
    hurstCycles,
    eliadesOffsets,
    momentumDeltaROC,
    askslimPosture,
    sardinePattern,
  };
}

/**
 * Real Black-Scholes Cash-or-Nothing Binary Option Pricing Formula
 */
export function calculateBinaryOptionFairOdds(
  currentPrice: number,
  strikePrice: number,
  timeToExpirationSeconds: number,
  volatilityAnnualized: number = 0.45,
  cyclicalDriftBps: number = 0
): number {
  if (timeToExpirationSeconds <= 2) {
    return currentPrice >= strikePrice ? 99 : 1;
  }

  const T = Math.max(0.000001, timeToExpirationSeconds / (365.25 * 24 * 3600));
  const sigma = Math.max(0.05, volatilityAnnualized);
  const r = 0.045; // 4.5% risk-free rate

  const driftRate = r + cyclicalDriftBps / 10000;

  const d2 =
    (Math.log(currentPrice / strikePrice) + (driftRate - 0.5 * sigma * sigma) * T) /
    (sigma * Math.sqrt(T));

  const probability = standardNormalCdf(d2);
  const probabilityPercent = Math.min(99, Math.max(1, probability * 100));
  return parseFloat(probabilityPercent.toFixed(1));
}

/**
 * Calculate Real Clock Time to Next 15-Minute Expiration Bracket in Seconds
 */
export function getSecondsToNext15mExpiration(): number {
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const minutesInto15m = minutes % 15;
  const elapsedSecondsInBracket = minutesInto15m * 60 + seconds;
  const remainingSeconds = 900 - elapsedSecondsInBracket;
  return remainingSeconds > 0 ? remainingSeconds : 900;
}

/**
 * Generate 15-Minute Strike Contracts with Live Points Displacement and Edge Recommendation
 */
export function generateKalshi15mContracts(
  assetTicker: string,
  currentPrice: number,
  posture: TechnicalAnalysisPosture,
  customTimeToExpirationSeconds?: number
): Kalshi15mContract[] {
  const timeToExpirationSeconds = customTimeToExpirationSeconds || getSecondsToNext15mExpiration();

  let step = 50;
  if (assetTicker.includes('ETH')) step = 5;
  else if (assetTicker.includes('SOL')) step = 0.5;
  else if (assetTicker.includes('XRP') || assetTicker.includes('DOGE')) step = 0.005;
  else if (assetTicker.includes('SPX') || assetTicker.includes('INX')) step = 2;
  else if (assetTicker.includes('QQQ') || assetTicker.includes('NDX')) step = 5;
  else if (assetTicker.includes('GOLD')) step = 2;
  else if (assetTicker.includes('OIL')) step = 0.25;
  else if (assetTicker.includes('EUR')) step = 0.0005;

  const roundedAtm = Math.round(currentPrice / step) * step;
  const strikes: number[] = [];
  for (let i = -3; i <= 3; i++) {
    const s = roundedAtm + i * step;
    strikes.push(parseFloat(s.toFixed(step < 1 ? 4 : 2)));
  }

  let cyclicalDriftBps = 0;
  if (posture.eliadesOffsets.projectedTargetDirection === 'UP') {
    cyclicalDriftBps += posture.eliadesOffsets.projectionValidity * 1.5;
  } else if (posture.eliadesOffsets.projectedTargetDirection === 'DOWN') {
    cyclicalDriftBps -= posture.eliadesOffsets.projectionValidity * 1.5;
  }

  if (posture.hurstCycles.cyclePhase === 'rising_expansion' || posture.hurstCycles.cyclePhase === 'trough_forming') {
    cyclicalDriftBps += 40;
  } else if (posture.hurstCycles.cyclePhase === 'declining_contraction' || posture.hurstCycles.cyclePhase === 'crest_peak') {
    cyclicalDriftBps -= 40;
  }

  cyclicalDriftBps += posture.momentumDeltaROC.volumeWeightedROC * 100;

  const now = Math.floor(Date.now() / 1000);
  const expirationTime = now + timeToExpirationSeconds;

  return strikes.map((strike) => {
    const displacementPoints = parseFloat((currentPrice - strike).toFixed(2));
    const displacementPercent = parseFloat(((displacementPoints / strike) * 100).toFixed(3));

    const baseOdds = calculateBinaryOptionFairOdds(currentPrice, strike, timeToExpirationSeconds, 0.40, 0);

    const calculatedFairOdds = calculateBinaryOptionFairOdds(
      currentPrice,
      strike,
      timeToExpirationSeconds,
      0.40,
      cyclicalDriftBps
    );

    const yesPrice = Math.min(99, Math.max(1, Math.round(baseOdds)));
    const yesBid = Math.max(1, yesPrice - 1);
    const yesAsk = Math.min(99, yesPrice + 1);

    const noPrice = 100 - yesPrice;
    const noBid = Math.max(1, noPrice - 1);
    const noAsk = Math.min(99, noPrice + 1);

    const impliedProbability = yesPrice;
    const edgePercent = parseFloat((calculatedFairOdds - impliedProbability).toFixed(1));

    const evYes = (calculatedFairOdds / 100) * (100 - yesAsk) - ((100 - calculatedFairOdds) / 100) * yesAsk;
    const evNo = ((100 - calculatedFairOdds) / 100) * (100 - noAsk) - (calculatedFairOdds / 100) * noAsk;

    let recommendation: TradeRecommendation = 'WAIT';
    let confidenceScore = 50;
    let theoreticalExpectedValueCents = 0;

    if (edgePercent >= 3.5 && evYes > 1.2) {
      recommendation = 'BUY_YES';
      confidenceScore = Math.min(98, Math.round(50 + edgePercent * 3.2));
      theoreticalExpectedValueCents = parseFloat(evYes.toFixed(2));
    } else if (edgePercent <= -3.5 && evNo > 1.2) {
      recommendation = 'BUY_NO';
      confidenceScore = Math.min(98, Math.round(50 + Math.abs(edgePercent) * 3.2));
      theoreticalExpectedValueCents = parseFloat(evNo.toFixed(2));
    } else if (edgePercent > 1.5 && posture.momentumDeltaROC.velocityPosture === 'ACCELERATING_BEAR') {
      recommendation = 'REVERSE_SELL_BUY_NO';
      confidenceScore = 65;
      theoreticalExpectedValueCents = parseFloat(evNo.toFixed(2));
    } else if (edgePercent < -1.5 && posture.momentumDeltaROC.velocityPosture === 'ACCELERATING_BULL') {
      recommendation = 'REVERSE_SELL_BUY_YES';
      confidenceScore = 65;
      theoreticalExpectedValueCents = parseFloat(evYes.toFixed(2));
    } else {
      recommendation = 'WAIT';
      confidenceScore = 40;
      theoreticalExpectedValueCents = 0;
    }

    const tickerClean = assetTicker.replace(/[^A-Z0-9]/g, '');
    const strikeFormatted = strike >= 1000 ? strike.toFixed(0) : strike.toString();
    const contractTicker = `KX-${tickerClean}-15M-${strikeFormatted}`;

    return {
      ticker: contractTicker,
      title: `${assetTicker} > $${strike.toLocaleString()}`,
      subtitle: `Settles in ${Math.floor(timeToExpirationSeconds / 60)}m ${timeToExpirationSeconds % 60}s`,
      assetTicker,
      expirationTime,
      timeToExpirationSeconds,
      strikePrice: strike,
      strikeType: 'above',
      yesBid,
      yesAsk,
      yesPrice,
      noBid,
      noAsk,
      noPrice,
      openInterest: Math.floor(150 + Math.abs(displacementPoints * 12) % 950),
      volume: Math.floor(520 + Math.abs(displacementPoints * 35) % 2400),
      impliedProbability,
      displacementPoints,
      displacementPercent,
      calculatedFairOdds,
      edgePercent,
      recommendation,
      confidenceScore,
      theoreticalExpectedValueCents,
    };
  });
}
