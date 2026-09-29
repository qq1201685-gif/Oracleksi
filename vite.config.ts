import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
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

function apiServerPlugin(): Plugin {
  return {
    name: 'api-server-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next();
        }

        const urlObj = new URL(req.url, 'http://localhost:3000');
        const pathname = urlObj.pathname;

        try {
          if (pathname === '/api/markets') {
            const liveQuotes = await fetchLiveAllQuotes();
            const enriched = SUPPORTED_ASSETS.map((asset) => {
              const q = liveQuotes[asset.baseSymbol];
              if (q) {
                return {
                  ...asset,
                  currentPrice: q.price,
                  priceChange24h: q.change24h,
                  high24h: q.high,
                  low24h: q.low,
                  volume24h: q.volume,
                  lastUpdated: Date.now(),
                };
              }
              return asset;
            });
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, timestamp: Date.now(), assets: enriched }));
            return;
          }

          if (pathname === '/api/klines') {
            const symbol = urlObj.searchParams.get('symbol') || 'BTCUSDT';
            const interval = urlObj.searchParams.get('interval') || '15m';
            const limit = parseInt(urlObj.searchParams.get('limit') || '120', 10);
            const klines = await fetchLiveKlines(symbol, interval, limit);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, symbol, interval, klines }));
            return;
          }

          if (pathname === '/api/kalshi/points') {
            const pointsData = await getLiveKalshiPoints();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(pointsData));
            return;
          }

          if (pathname === '/api/kalshi/contracts') {
            const series = urlObj.searchParams.get('series') || 'KXBTC15M';
            const spot = parseFloat(urlObj.searchParams.get('spot') || '83500');
            const contracts = await fetchLiveKalshiContracts(series, spot);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, contracts }));
            return;
          }

          if (pathname === '/api/gemini/synthesize' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const synthesis = await generateGeminiSynthesis(
                  parsed.asset,
                  parsed.posture,
                  parsed.modelName,
                  parsed.cacheDurationSeconds || 180,
                  !!parsed.forceRefresh
                );
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, synthesis }));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: String(err) }));
              }
            });
            return;
          }

          // Database: Models
          if (pathname === '/api/database/models') {
            if (req.method === 'GET') {
              const models = getSavedModels();
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, models }));
              return;
            } else if (req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => {
                body += chunk;
              });
              req.on('end', () => {
                try {
                  const artifact = JSON.parse(body || '{}');
                  saveModel(artifact);
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, message: 'Model saved to database' }));
                } catch (err) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: String(err) }));
                }
              });
              return;
            }
          }

          if (pathname.startsWith('/api/database/models/') && req.method === 'DELETE') {
            const id = pathname.replace('/api/database/models/', '');
            deleteModel(id);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'Model deleted' }));
            return;
          }

          // Database: Backtests
          if (pathname === '/api/database/backtests') {
            if (req.method === 'GET') {
              const history = getBacktestHistory();
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, history }));
              return;
            } else if (req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => {
                body += chunk;
              });
              req.on('end', () => {
                try {
                  const parsed = JSON.parse(body || '{}');
                  recordBacktestRun(parsed.assetTicker, parsed.result);
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, message: 'Backtest recorded' }));
                } catch (err) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: String(err) }));
                }
              });
              return;
            }
          }

          // Database: Patterns
          if (pathname === '/api/database/patterns') {
            if (req.method === 'GET') {
              const patterns = getPatternMemoryRecords();
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, patterns }));
              return;
            } else if (req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => {
                body += chunk;
              });
              req.on('end', () => {
                try {
                  const p = JSON.parse(body || '{}');
                  recordPatternMemory(p.assetTicker, p.cyclePhase, p.eliadesOffsetDirection, p.rocVelocity, p.winRateOdds);
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, message: 'Pattern saved' }));
                } catch (err) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: String(err) }));
                }
              });
              return;
            }
          }

          // Database: Settings
          if (pathname === '/api/database/settings') {
            if (req.method === 'GET') {
              const settings = getUserSettings();
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, settings }));
              return;
            } else if (req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => {
                body += chunk;
              });
              req.on('end', () => {
                try {
                  const s = JSON.parse(body || '{}');
                  saveUserSettings(s);
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, message: 'Settings saved' }));
                } catch (err) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: String(err) }));
                }
              });
              return;
            }
          }

          next();
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: String(err) }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
