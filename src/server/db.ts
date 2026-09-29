/**
 * Real-Time File-Backed Database Storage Engine with Atomic Persistence
 * Stores Trained Neural Weights, Pattern Memory, Backtest Runs, and Live Trade Signals.
 */

import fs from 'fs';
import path from 'path';
import { SavedModelArtifact, BacktestResult, UserAppSettings } from '../types/market.ts';

export interface DatabaseSchema {
  savedModels: SavedModelArtifact[];
  backtestHistory: Array<{
    id: string;
    assetTicker: string;
    timestamp: number;
    metrics: Omit<BacktestResult, 'trades'>;
    tradesCount: number;
  }>;
  patternMemory: Array<{
    id: string;
    assetTicker: string;
    cyclePhase: string;
    eliadesOffsetDirection: string;
    rocVelocity: number;
    winRateOdds: number;
    timestamp: number;
  }>;
  liveSignalLogs: Array<{
    id: string;
    assetTicker: string;
    strikePrice: number;
    recommendation: string;
    mathEdgePercent: number;
    expectedValueCents: number;
    confidence: number;
    timestamp: number;
  }>;
  settings: Partial<UserAppSettings>;
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'kalshi_db.json');

// In-Memory Cache
let memoryDb: DatabaseSchema = {
  savedModels: [],
  backtestHistory: [],
  patternMemory: [],
  liveSignalLogs: [],
  settings: {},
};

// Initialize DB
export function initDatabase(): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      memoryDb = JSON.parse(raw);
    } else {
      flushDatabase();
    }
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

// Atomic Flush to Disk
function flushDatabase(): void {
  try {
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(memoryDb, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Database flush error:', err);
  }
}

// 1. Saved Neural Models
export function getSavedModels(): SavedModelArtifact[] {
  return memoryDb.savedModels || [];
}

export function saveModel(artifact: SavedModelArtifact): void {
  if (!memoryDb.savedModels) memoryDb.savedModels = [];
  const idx = memoryDb.savedModels.findIndex((m) => m.id === artifact.id);
  if (idx >= 0) {
    memoryDb.savedModels[idx] = artifact;
  } else {
    memoryDb.savedModels.unshift(artifact);
  }
  flushDatabase();
}

export function deleteModel(id: string): void {
  if (!memoryDb.savedModels) return;
  memoryDb.savedModels = memoryDb.savedModels.filter((m) => m.id !== id);
  flushDatabase();
}

// 2. Backtest History
export function recordBacktestRun(
  assetTicker: string,
  result: BacktestResult
): void {
  if (!memoryDb.backtestHistory) memoryDb.backtestHistory = [];
  const { trades, ...metrics } = result;
  memoryDb.backtestHistory.unshift({
    id: `backtest-${Date.now()}`,
    assetTicker,
    timestamp: Date.now(),
    metrics,
    tradesCount: trades.length,
  });
  // Keep last 50
  if (memoryDb.backtestHistory.length > 50) {
    memoryDb.backtestHistory = memoryDb.backtestHistory.slice(0, 50);
  }
  flushDatabase();
}

export function getBacktestHistory() {
  return memoryDb.backtestHistory || [];
}

// 3. Pattern Memory Storage
export function recordPatternMemory(
  assetTicker: string,
  cyclePhase: string,
  eliadesOffsetDirection: string,
  rocVelocity: number,
  winRateOdds: number
): void {
  if (!memoryDb.patternMemory) memoryDb.patternMemory = [];
  memoryDb.patternMemory.unshift({
    id: `pattern-${Date.now()}`,
    assetTicker,
    cyclePhase,
    eliadesOffsetDirection,
    rocVelocity,
    winRateOdds,
    timestamp: Date.now(),
  });
  if (memoryDb.patternMemory.length > 100) {
    memoryDb.patternMemory = memoryDb.patternMemory.slice(0, 100);
  }
  flushDatabase();
}

export function getPatternMemoryRecords() {
  return memoryDb.patternMemory || [];
}

// 4. Live Signal Log
export function logLiveSignal(
  assetTicker: string,
  strikePrice: number,
  recommendation: string,
  mathEdgePercent: number,
  expectedValueCents: number,
  confidence: number
): void {
  if (!memoryDb.liveSignalLogs) memoryDb.liveSignalLogs = [];
  memoryDb.liveSignalLogs.unshift({
    id: `signal-${Date.now()}`,
    assetTicker,
    strikePrice,
    recommendation,
    mathEdgePercent,
    expectedValueCents,
    confidence,
    timestamp: Date.now(),
  });
  if (memoryDb.liveSignalLogs.length > 200) {
    memoryDb.liveSignalLogs = memoryDb.liveSignalLogs.slice(0, 200);
  }
  flushDatabase();
}

export function getLiveSignalLogs() {
  return memoryDb.liveSignalLogs || [];
}

// 5. User Settings Persistence
export function saveUserSettings(settings: Partial<UserAppSettings>): void {
  memoryDb.settings = { ...memoryDb.settings, ...settings };
  flushDatabase();
}

export function getUserSettings(): Partial<UserAppSettings> {
  return memoryDb.settings || {};
}

// Auto-initialize on module load
initDatabase();
