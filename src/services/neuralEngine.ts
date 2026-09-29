/**
 * Real Multilayer Perceptron Neural Network Engine with Forward/Backpropagation,
 * Matrix Operations, Pattern Memory, and Storage Persistence.
 */

import {
  CandleBar,
  NeuralTrainingMetrics,
  SavedModelArtifact,
} from '../types/market.ts';
import {
  calculateRSI,
  calculateBollingerBands,
  analyzeHurstCycles,
  analyzePeterEliadesOffsets,
  analyzeDeltaROC,
} from './technicalAnalysis.ts';

// Activation functions & derivatives
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-45, Math.min(45, x))));
}

function sigmoidDerivative(y: number): number {
  return y * (1 - y);
}

function tanh(x: number): number {
  return Math.tanh(x);
}

function tanhDerivative(y: number): number {
  return 1 - y * y;
}

export class NeuralClassifier {
  public layers: number[];
  public weights: number[][][]; // [layerIndex][neuronIndex][prevNeuronIndex]
  public biases: number[][]; // [layerIndex][neuronIndex]
  public learningRate: number;
  public momentum: number;
  private prevWeightDeltas: number[][][];

  constructor(
    layers: number[] = [7, 16, 8, 1],
    learningRate: number = 0.05,
    momentum: number = 0.85
  ) {
    this.layers = layers;
    this.learningRate = learningRate;
    this.momentum = momentum;
    this.weights = [];
    this.biases = [];
    this.prevWeightDeltas = [];
    this.initializeWeights();
  }

  // Xavier/Glorot weight initialization for stable gradient flow
  private initializeWeights(): void {
    this.weights = [];
    this.biases = [];
    this.prevWeightDeltas = [];

    for (let l = 0; l < this.layers.length - 1; l++) {
      const fanIn = this.layers[l];
      const fanOut = this.layers[l + 1];
      const limit = Math.sqrt(6 / (fanIn + fanOut));

      const layerWeights: number[][] = [];
      const layerDeltas: number[][] = [];
      const layerBiases: number[] = [];

      for (let j = 0; j < fanOut; j++) {
        const neuronWeights: number[] = [];
        const neuronDeltas: number[] = [];
        for (let i = 0; i < fanIn; i++) {
          neuronWeights.push((Math.random() * 2 - 1) * limit);
          neuronDeltas.push(0);
        }
        layerWeights.push(neuronWeights);
        layerDeltas.push(neuronDeltas);
        layerBiases.push(0.01);
      }

      this.weights.push(layerWeights);
      this.prevWeightDeltas.push(layerDeltas);
      this.biases.push(layerBiases);
    }
  }

  /**
   * Forward Pass through all layers
   */
  public forward(input: number[]): { activations: number[][]; layerInputs: number[][] } {
    const activations: number[][] = [input];
    const layerInputs: number[][] = [];

    let current = input;

    for (let l = 0; l < this.weights.length; l++) {
      const layerWeights = this.weights[l];
      const layerBiases = this.biases[l];
      const nextActivations: number[] = [];
      const zValues: number[] = [];

      const isOutputLayer = l === this.weights.length - 1;

      for (let j = 0; j < layerWeights.length; j++) {
        let sum = layerBiases[j];
        for (let i = 0; i < current.length; i++) {
          sum += current[i] * layerWeights[j][i];
        }
        zValues.push(sum);
        // Tanh for hidden layers, Sigmoid for final binary probability output
        const act = isOutputLayer ? sigmoid(sum) : tanh(sum);
        nextActivations.push(act);
      }

      layerInputs.push(zValues);
      activations.push(nextActivations);
      current = nextActivations;
    }

    return { activations, layerInputs };
  }

  /**
   * Predict single probability output (0.0 to 1.0)
   */
  public predict(input: number[]): number {
    const { activations } = this.forward(input);
    const outputLayer = activations[activations.length - 1];
    return outputLayer[0];
  }

  /**
   * Backpropagation on a single sample
   */
  public trainSample(input: number[], target: number): number {
    const { activations } = this.forward(input);
    const numLayers = this.weights.length;

    // Output error
    const output = activations[numLayers][0];
    const error = target - output;
    const loss = 0.5 * error * error;

    // Delta for output layer
    const deltas: number[][] = [];
    const outputDelta = [error * sigmoidDerivative(output)];
    deltas.unshift(outputDelta);

    // Backward pass for hidden layers
    for (let l = numLayers - 2; l >= 0; l--) {
      const layerDeltas: number[] = [];
      const currentActs = activations[l + 1];
      const nextDeltas = deltas[0];
      const nextWeights = this.weights[l + 1];

      for (let i = 0; i < this.layers[l + 1]; i++) {
        let sum = 0;
        for (let j = 0; j < nextDeltas.length; j++) {
          sum += nextDeltas[j] * nextWeights[j][i];
        }
        const delta = sum * tanhDerivative(currentActs[i]);
        layerDeltas.push(delta);
      }
      deltas.unshift(layerDeltas);
    }

    // Weight and bias updates with momentum
    for (let l = 0; l < numLayers; l++) {
      const prevActs = activations[l];
      const layerDeltas = deltas[l];

      for (let j = 0; j < this.weights[l].length; j++) {
        const delta = layerDeltas[j];
        for (let i = 0; i < this.weights[l][j].length; i++) {
          const grad = delta * prevActs[i];
          const deltaWeight = this.learningRate * grad + this.momentum * this.prevWeightDeltas[l][j][i];
          this.weights[l][j][i] += deltaWeight;
          this.prevWeightDeltas[l][j][i] = deltaWeight;
        }
        this.biases[l][j] += this.learningRate * delta;
      }
    }

    return loss;
  }

  /**
   * Export network state for persistence
   */
  public exportState(name: string, ticker: string, trainLoss: number, valAccuracy: number, epochs: number): SavedModelArtifact {
    return {
      id: `model-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      ticker,
      timestamp: Date.now(),
      layers: [...this.layers],
      weights: JSON.parse(JSON.stringify(this.weights)),
      biases: JSON.parse(JSON.stringify(this.biases)),
      trainLoss,
      valAccuracy,
      epochsTrained: epochs,
    };
  }

  /**
   * Import network weights from saved artifact
   */
  public importState(artifact: SavedModelArtifact): void {
    this.layers = [...artifact.layers];
    this.weights = JSON.parse(JSON.stringify(artifact.weights));
    this.biases = JSON.parse(JSON.stringify(artifact.biases));
    this.prevWeightDeltas = [];
    for (let l = 0; l < this.weights.length; l++) {
      const layerDeltas: number[][] = [];
      for (let j = 0; j < this.weights[l].length; j++) {
        layerDeltas.push(new Array(this.weights[l][j].length).fill(0));
      }
      this.prevWeightDeltas.push(layerDeltas);
    }
  }
}

/**
 * Feature Extractor: transforms a window of historical 15m candles into normalized 7-dimension input vector
 * [0]: Normalized Hurst Cyclical Phase (-1 to +1)
 * [1]: Eliades Offset Target Displacement vs Current Price (-1 to +1)
 * [2]: Normalized Momentum 1-period ROC (-1 to +1)
 * [3]: Normalized ROC Acceleration 2nd derivative (-1 to +1)
 * [4]: Normalized RSI (0 to 1)
 * [5]: Bollinger %B (0 to 1)
 * [6]: Strike Displacement / Average True Range (-1 to +1)
 */
export function extractCandleFeatures(
  candlesWindow: CandleBar[],
  targetStrike?: number
): number[] {
  const closes = candlesWindow.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];

  const rsi = calculateRSI(closes, 14);
  const bollinger = calculateBollingerBands(closes, 20, 2);
  const hurst = analyzeHurstCycles(candlesWindow, 14);
  const eliades = analyzePeterEliadesOffsets(candlesWindow, 14, 0.5);
  const roc = analyzeDeltaROC(candlesWindow);

  // 1. Hurst Phase: trough = 0.8, expansion = 0.5, peak = -0.8, contraction = -0.5
  let hurstPhaseVal = 0;
  if (hurst.cyclePhase === 'trough_forming') hurstPhaseVal = 0.9;
  else if (hurst.cyclePhase === 'rising_expansion') hurstPhaseVal = 0.5;
  else if (hurst.cyclePhase === 'crest_peak') hurstPhaseVal = -0.9;
  else hurstPhaseVal = -0.5;

  // 2. Eliades target displacement
  const eliadesDelta = ((eliades.projectedTargetPrice - currentPrice) / currentPrice) * 100;
  const normalizedEliades = Math.max(-1, Math.min(1, eliadesDelta / 2));

  // 3. ROC velocity
  const normalizedRoc = Math.max(-1, Math.min(1, roc.roc1 / 1.5));

  // 4. ROC acceleration
  const normalizedAccel = Math.max(-1, Math.min(1, roc.rocAcceleration / 1.0));

  // 5. RSI normalized (0 to 1)
  const normalizedRsi = rsi / 100;

  // 6. Bollinger %B clamped
  const normalizedB = Math.max(0, Math.min(1, bollinger.percentB));

  // 7. Strike Displacement normalized
  const strike = targetStrike || currentPrice;
  const displacement = ((currentPrice - strike) / currentPrice) * 100;
  const normalizedDisplacement = Math.max(-1, Math.min(1, displacement / 1.5));

  return [
    hurstPhaseVal,
    normalizedEliades,
    normalizedRoc,
    normalizedAccel,
    normalizedRsi,
    normalizedB,
    normalizedDisplacement,
  ];
}

export interface TrainingDataset {
  trainInputs: number[][];
  trainTargets: number[];
  valInputs: number[][];
  valTargets: number[];
}

/**
 * Generate Real Supervised Training Dataset from Historical 15m Candle Bars
 */
export function buildDatasetFromCandles(
  candles: CandleBar[],
  lookbackWindow: number = 25
): TrainingDataset {
  const dataset: { input: number[]; target: number }[] = [];

  for (let i = lookbackWindow; i < candles.length - 1; i++) {
    const window = candles.slice(i - lookbackWindow, i + 1);
    const nextCandle = candles[i + 1];
    const currentPrice = candles[i].close;

    // Binary Target: Did the next 15-minute bar close ABOVE the current bar close?
    // 1 = Settlement > Strike (YES won), 0 = Settlement <= Strike (NO won)
    const target = nextCandle.close > currentPrice ? 1 : 0;
    const input = extractCandleFeatures(window, currentPrice);

    dataset.push({ input, target });
  }

  // 80/20 Train/Validation Split
  const splitIdx = Math.floor(dataset.length * 0.8);
  const train = dataset.slice(0, splitIdx);
  const val = dataset.slice(splitIdx);

  return {
    trainInputs: train.map((d) => d.input),
    trainTargets: train.map((d) => d.target),
    valInputs: val.map((d) => d.input),
    valTargets: val.map((d) => d.target),
  };
}

/**
 * Run iterative epoch training and yield step-by-step metrics
 */
export async function executeNeuralTraining(
  network: NeuralClassifier,
  dataset: TrainingDataset,
  epochs: number = 80,
  onEpochProgress?: (metrics: NeuralTrainingMetrics) => void
): Promise<NeuralTrainingMetrics> {
  let lastMetrics: NeuralTrainingMetrics = {
    epoch: 0,
    loss: 1.0,
    validationAccuracy: 50,
    confusionMatrix: { tp: 0, fp: 0, tn: 0, fn: 0 },
  };

  const { trainInputs, trainTargets, valInputs, valTargets } = dataset;
  if (trainInputs.length === 0) return lastMetrics;

  for (let epoch = 1; epoch <= epochs; epoch++) {
    let totalLoss = 0;

    // Shuffle training indices
    const indices = Array.from({ length: trainInputs.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    for (const idx of indices) {
      const loss = network.trainSample(trainInputs[idx], trainTargets[idx]);
      totalLoss += loss;
    }

    const avgLoss = totalLoss / trainInputs.length;

    // Validation evaluation & Confusion Matrix
    let tp = 0,
      fp = 0,
      tn = 0,
      fn = 0;

    for (let i = 0; i < valInputs.length; i++) {
      const predProb = network.predict(valInputs[i]);
      const actual = valTargets[i];
      const predictedClass = predProb >= 0.5 ? 1 : 0;

      if (predictedClass === 1 && actual === 1) tp++;
      else if (predictedClass === 1 && actual === 0) fp++;
      else if (predictedClass === 0 && actual === 0) tn++;
      else if (predictedClass === 0 && actual === 1) fn++;
    }

    const totalVal = Math.max(1, tp + fp + tn + fn);
    const valAccuracy = ((tp + tn) / totalVal) * 100;

    lastMetrics = {
      epoch,
      loss: parseFloat(avgLoss.toFixed(5)),
      validationAccuracy: parseFloat(valAccuracy.toFixed(2)),
      confusionMatrix: { tp, fp, tn, fn },
    };

    if (onEpochProgress && (epoch % 2 === 0 || epoch === epochs)) {
      onEpochProgress(lastMetrics);
      // Yield execution frame to keep UI responsive during training
      await new Promise((r) => setTimeout(r, 4));
    }
  }

  return lastMetrics;
}

// Local Pattern Memory Persistence Key
const PATTERN_MEMORY_KEY = 'kalshi_neural_saved_models_v1';

export function saveModelToStorage(artifact: SavedModelArtifact): void {
  try {
    const existing = getSavedModelsFromStorage();
    const filtered = existing.filter((m) => m.id !== artifact.id);
    filtered.unshift(artifact);
    localStorage.setItem(PATTERN_MEMORY_KEY, JSON.stringify(filtered.slice(0, 20)));
  } catch (err) {
    console.error('Storage save error:', err);
  }
}

export function getSavedModelsFromStorage(): SavedModelArtifact[] {
  try {
    const data = localStorage.getItem(PATTERN_MEMORY_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function deleteSavedModel(id: string): void {
  try {
    const existing = getSavedModelsFromStorage().filter((m) => m.id !== id);
    localStorage.setItem(PATTERN_MEMORY_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Storage delete error:', err);
  }
}
