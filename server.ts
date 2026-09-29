/**
 * Full-Stack Express Server for Kalshi 15-Minute Market Predictor
 * with Real-Time Database Integration, Live Kalshi Points & Contracts Endpoints.
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import {
  SUPPORTED_ASSETS,
  fetchLiveAllQuotes,
  fetchLiveKlines,
  fetchLiveKalshiContracts,
  getLiveKalshiPoints,
  generateGeminiSynthesis,
  getSavedModels,
  saveModel,
  deleteModel,
  recordBacktestRun,
  getBacktestHistory,
  recordPatternMemory,
  getPatternMemoryRecords,
  logLiveSignal,
  getLiveSignalLogs,
  saveUserSettings,
  getUserSettings,
} from './src/server/apiHandlers.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. Markets & Live Feeds
app.get('/api/markets', async (_req, res) => {
  try {
    const liveQuotes = await fetchLiveAllQuotes();

    const enrichedAssets = SUPPORTED_ASSETS.map((asset) => {
      const quote = liveQuotes[asset.baseSymbol];
      if (quote) {
        return {
          ...asset,
          currentPrice: quote.price,
          priceChange24h: quote.change24h,
          high24h: quote.high,
          low24h: quote.low,
          volume24h: quote.volume,
          lastUpdated: Date.now(),
        };
      }
      return asset;
    });

    res.json({
      success: true,
      timestamp: Date.now(),
      assets: enrichedAssets,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.get('/api/klines', async (req, res) => {
  try {
    const symbol = (req.query.symbol as string) || 'BTCUSDT';
    const interval = (req.query.interval as string) || '15m';
    const limit = parseInt((req.query.limit as string) || '80', 10);

    const klines = await fetchLiveKlines(symbol, interval, limit);
    res.json({
      success: true,
      symbol,
      interval,
      klines,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 2. Kalshi Live Points Endpoint
app.get('/api/kalshi/points', async (_req, res) => {
  try {
    const pointsData = await getLiveKalshiPoints();
    res.json(pointsData);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 3. Kalshi Live Contracts Endpoint
app.get('/api/kalshi/contracts', async (req, res) => {
  try {
    const series = (req.query.series as string) || 'KXBTC15M';
    const spot = parseFloat((req.query.spot as string) || '83500');
    const contracts = await fetchLiveKalshiContracts(series, spot);
    res.json({ success: true, contracts });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 4. Gemini AI Synthesis
app.post('/api/gemini/synthesize', async (req, res) => {
  try {
    const { asset, posture, modelName, cacheDurationSeconds, forceRefresh } = req.body;
    if (!asset || !posture) {
      return res.status(400).json({ success: false, error: 'Missing asset or posture' });
    }

    const synthesis = await generateGeminiSynthesis(
      asset,
      posture,
      modelName,
      cacheDurationSeconds || 180,
      !!forceRefresh
    );
    res.json({ success: true, synthesis });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 5. Database Endpoints: Saved Neural Models
app.get('/api/database/models', (_req, res) => {
  try {
    const models = getSavedModels();
    res.json({ success: true, models });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.post('/api/database/models', (req, res) => {
  try {
    const artifact = req.body;
    if (!artifact || !artifact.id) {
      return res.status(400).json({ success: false, error: 'Invalid model artifact' });
    }
    saveModel(artifact);
    res.json({ success: true, message: 'Model saved to database' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.delete('/api/database/models/:id', (req, res) => {
  try {
    const { id } = req.params;
    deleteModel(id);
    res.json({ success: true, message: 'Model deleted from database' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 6. Database Endpoints: Backtest Runs
app.get('/api/database/backtests', (_req, res) => {
  try {
    const history = getBacktestHistory();
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.post('/api/database/backtests', (req, res) => {
  try {
    const { assetTicker, result } = req.body;
    recordBacktestRun(assetTicker, result);
    res.json({ success: true, message: 'Backtest recorded in database' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 7. Database Endpoints: Pattern Memory
app.get('/api/database/patterns', (_req, res) => {
  try {
    const patterns = getPatternMemoryRecords();
    res.json({ success: true, patterns });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.post('/api/database/patterns', (req, res) => {
  try {
    const { assetTicker, cyclePhase, eliadesOffsetDirection, rocVelocity, winRateOdds } = req.body;
    recordPatternMemory(assetTicker, cyclePhase, eliadesOffsetDirection, rocVelocity, winRateOdds);
    res.json({ success: true, message: 'Pattern memory saved' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 8. Database Endpoints: Live Signal Logs
app.get('/api/database/signals', (_req, res) => {
  try {
    const signals = getLiveSignalLogs();
    res.json({ success: true, signals });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.post('/api/database/signals', (req, res) => {
  try {
    const { assetTicker, strikePrice, recommendation, mathEdgePercent, expectedValueCents, confidence } = req.body;
    logLiveSignal(assetTicker, strikePrice, recommendation, mathEdgePercent, expectedValueCents, confidence);
    res.json({ success: true, message: 'Signal logged' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 9. Database Endpoints: Settings
app.get('/api/database/settings', (_req, res) => {
  try {
    const settings = getUserSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.post('/api/database/settings', (req, res) => {
  try {
    saveUserSettings(req.body);
    res.json({ success: true, message: 'Settings saved to database' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Serve static frontend files in production
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Kalshi 15m Predictor server listening on port ${PORT}`);
});
