/**
 * Market, Indicator, Prediction, Neural Network, and Strategy Types
 */

export interface CandleBar {
  time: number; // UNIX timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ChartTimeframe = '30s' | '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '1d';

export type AssetCategory = 'crypto' | 'commodities' | 'indices' | 'forex';

export interface KalshiMarketAsset {
  id: string;
  ticker: string;
  name: string;
  category: AssetCategory;
  baseSymbol: string;
  kalshiSeriesTicker: string;
  currentPrice: number;
  priceChange24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  lastUpdated: number;
  exchangeSource: string;
}

export type TradeRecommendation =
  | 'BUY_YES'
  | 'BUY_NO'
  | 'WAIT'
  | 'REVERSE_SELL_BUY_NO'
  | 'REVERSE_SELL_BUY_YES';

export interface Kalshi15mContract {
  ticker: string;
  title: string;
  subtitle: string;
  assetTicker: string;
  expirationTime: number; // Unix timestamp in seconds
  timeToExpirationSeconds: number;
  strikePrice: number;
  strikeType: 'above' | 'below' | 'range';
  yesBid: number; // in cents (1-99)
  yesAsk: number;
  yesPrice: number;
  noBid: number;
  noAsk: number;
  noPrice: number;
  openInterest: number;
  volume: number;
  impliedProbability: number; // 0 - 100%
  displacementPoints: number; // currentPrice - strikePrice
  displacementPercent: number;
  calculatedFairOdds: number; // derived from cycle & delta ROC models (0-100%)
  edgePercent: number; // calculatedFairOdds - impliedProbability
  recommendation: TradeRecommendation;
  confidenceScore: number; // 0 - 100
  theoreticalExpectedValueCents: number; // EV per contract in cents
}

export interface TechnicalAnalysisPosture {
  rsi: number;
  rsiPosture: 'OVERSOLD' | 'BULLISH_MOMENTUM' | 'NEUTRAL' | 'BEARISH_MOMENTUM' | 'OVERBOUGHT';
  emaFast: number; // 9 EMA
  emaSlow: number; // 21 EMA
  trendPosture: 'STRONG_BULL' | 'MILD_BULL' | 'NEUTRAL' | 'MILD_BEAR' | 'STRONG_BEAR';
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
    bandWidthPercent: number;
    percentB: number;
  };
  macd: {
    macd: number;
    signal: number;
    hist: number;
    crossover: 'BULLISH' | 'BEARISH' | 'NONE';
  };
  hurstCycles: {
    nominalCycleLength: number;
    cyclePhase: 'trough_forming' | 'rising_expansion' | 'crest_peak' | 'declining_contraction';
    displacedMaUpper: number;
    displacedMaLower: number;
    displacedMaCenter: number;
    cycleDominantPeriod: number;
    hurstExponent: number; // H > 0.5 trending, H < 0.5 mean reverting
    cyclicalPower: number; // 0 - 100 score
  };
  eliadesOffsets: {
    offsetLength: number;
    offsetLine: number;
    projectedTargetPrice: number;
    projectedTargetDirection: 'UP' | 'DOWN' | 'NEUTRAL';
    crossoverConfirmed: boolean;
    projectionValidity: number; // 0 - 100%
    nominalCycleOffsetLevel: number;
  };
  momentumDeltaROC: {
    roc1: number; // 1-period velocity
    roc3: number; // 3-period velocity
    rocAcceleration: number; // 2nd derivative acceleration
    volumeWeightedROC: number;
    velocityPosture: 'ACCELERATING_BULL' | 'DECELERATING_BULL' | 'ACCELERATING_BEAR' | 'DECELERATING_BEAR' | 'STAGNANT';
  };
  askslimPosture: {
    swingPosture: 'VERY_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'VERY_BEARISH';
    cycleLowTimingCountdownBars: number;
    reversalZoneLow: number;
    reversalZoneHigh: number;
    cyclePhaseDegree: number; // 0 - 360 deg
  };
  sardinePattern: {
    patternName: string;
    breakoutLevel: number;
    breakdownLevel: number;
    patternBias: 'BULLISH' | 'BEARISH' | 'RANGE';
    qualityScore: number;
  };
}

export interface AISynthesisResult {
  regime: string;
  overallRecommendation: TradeRecommendation;
  conviction: number; // 0 - 100
  reasoning: string[];
  keyRisks: string[];
  targetPrice15m: number;
  targetOddsDelta: number;
  timestamp: number;
  modelUsed: string;
}

export interface NeuralTrainingMetrics {
  epoch: number;
  loss: number;
  validationAccuracy: number;
  confusionMatrix: {
    tp: number;
    fp: number;
    tn: number;
    fn: number;
  };
}

export interface SavedModelArtifact {
  id: string;
  name: string;
  ticker: string;
  timestamp: number;
  layers: number[];
  weights: number[][][];
  biases: number[][];
  trainLoss: number;
  valAccuracy: number;
  epochsTrained: number;
}

export interface BacktestTrade {
  time: number;
  strikePrice: number;
  contractTicker: string;
  action: TradeRecommendation;
  entryPriceCents: number;
  settlementPrice: number;
  outcome: 'WIN' | 'LOSS' | 'SCRATCH';
  pnlCents: number;
  runningPnlCents?: number;
  edgeAtEntry: number;
  modelConfidence: number;
}

export interface BacktestResult {
  totalTrades: number;
  winCount: number;
  lossCount: number;
  scratchCount: number;
  winRatePercent: number;
  totalReturnCents: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdownPercent: number;
  averageTradePnlCents: number;
  trades: BacktestTrade[];
}

export interface ComboLeg {
  contractTicker: string;
  strike: number;
  side: 'YES' | 'NO';
  action: 'BUY' | 'SELL';
  priceCents: number;
  contractsCount: number;
}

export interface ComboStrategy {
  id: string;
  name: string;
  category:
    | 'BINARY_UPSIDE_CORRIDOR'
    | 'BINARY_DOWNSIDE_CORRIDOR'
    | 'BINARY_RANGE_BOX'
    | 'BINARY_BREAKOUT_STRANGLE'
    | 'BINARY_EDGE_SNIPER';
  description: string;
  aggressionScore: number; // 0 - 100
  accuracyScore: number; // 0 - 100
  legs: ComboLeg[];
  netCostCents: number;
  maxProfitCents: number;
  maxRiskCents: number;
  winProbabilityPercent: number;
  riskRewardRatio: number;
  expectedValueCents: number;
  recommendedKellyContracts: number;
  payoffCurve: Array<{ price: number; pnlCents: number }>;
}

export interface UserAppSettings {
  aiSynthesisEnabled: boolean;
  aiModelName: 'gemini-3.8-flash' | 'gemini-3.8-live';
  aiCacheDurationSeconds: 45 | 90 | 180; // 180s default with 45s/90s toggle
  heartbeatIntervalSeconds: number; // 8 - 11 default 9
  hurstCycleLength: number; // default 14
  eliadesOffsetFactor: number; // default 0.5
  edgeThresholdPercent: number; // default 3.5%
  minConfidencePercent: number; // default 60%
  soundAlerts: boolean;
}
