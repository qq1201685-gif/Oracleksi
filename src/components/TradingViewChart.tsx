/**
 * Real-Time Candlestick Chart with Hurst Envelopes, Peter Eliades Offsets,
 * AskSlim Slim Ribbon (EMA 8, 13, 21) and Reversal Scout (HMA 14) using Lightweight Charts.
 * Supports full scrollback, pan/zoom, auto-scale, crosshair inspect, and legend metrics.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  CandlestickData,
  LineData,
  HistogramData,
  UTCTimestamp,
  ColorType,
  CrosshairMode,
} from 'lightweight-charts';
import {
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  Sliders,
  Sparkles,
  Layers,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { CandleBar, TechnicalAnalysisPosture } from '../types/market.ts';
import { calculateEMA, calculateAskSlimReversalScout } from '../services/technicalAnalysis.ts';

interface TradingViewChartProps {
  candles: CandleBar[];
  posture: TechnicalAnalysisPosture;
  assetTicker: string;
  showHurstEnvelopes?: boolean;
  showEliadesTarget?: boolean;
  showSlimRibbon?: boolean;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  candles,
  posture,
  assetTicker,
  showHurstEnvelopes = true,
  showEliadesTarget = true,
  showSlimRibbon = true,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Hurst Lines
  const hurstUpperSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const hurstCenterSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const hurstLowerSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Eliades Line
  const eliadesTargetSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // AskSlim Slim Ribbon Lines (EMA 8, 13, 21) & Reversal Scout (HMA 14)
  const ema8SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema13SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const reversalScoutSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const [hoverData, setHoverData] = useState<{
    time?: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
    ema8?: number;
    ema13?: number;
    ema21?: number;
    scout?: number;
    hurstCenter?: number;
    eliadesTarget?: number;
  } | null>(null);

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#090d16' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.4)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.4)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#38bdf8', width: 1, style: 2, labelBackgroundColor: '#0284c7' },
        horzLine: { color: '#38bdf8', width: 1, style: 2, labelBackgroundColor: '#0284c7' },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        autoScale: true,
        scaleMargins: {
          top: 0.08,
          bottom: 0.22,
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 8,
        minBarSpacing: 3,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // Volume Sub-pane
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    // Candlesticks
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });
    candleSeriesRef.current = candleSeries;

    // AskSlim Slim Ribbon: EMA 8 (Emerald), EMA 13 (Teal), EMA 21 (Rose/Amber)
    const ema8 = chart.addSeries(LineSeries, {
      color: '#34d399',
      lineWidth: 1,
      priceLineVisible: false,
      title: 'Slim EMA 8',
    });
    ema8SeriesRef.current = ema8;

    const ema13 = chart.addSeries(LineSeries, {
      color: '#2dd4bf',
      lineWidth: 1,
      priceLineVisible: false,
      title: 'Slim EMA 13',
    });
    ema13SeriesRef.current = ema13;

    const ema21 = chart.addSeries(LineSeries, {
      color: '#f43f5e',
      lineWidth: 1,
      priceLineVisible: false,
      title: 'Slim EMA 21',
    });
    ema21SeriesRef.current = ema21;

    // AskSlim Reversal Scout (HMA 14)
    const scout = chart.addSeries(LineSeries, {
      color: '#c084fc',
      lineWidth: 2,
      priceLineVisible: false,
      title: 'AskSlim Reversal Scout',
    });
    reversalScoutSeriesRef.current = scout;

    // Hurst Upper Envelope (Cyan Dashed)
    const hurstUpper = chart.addSeries(LineSeries, {
      color: '#06b6d4',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      title: 'Hurst Upper',
    });
    hurstUpperSeriesRef.current = hurstUpper;

    // Hurst Centerline
    const hurstCenter = chart.addSeries(LineSeries, {
      color: '#0284c7',
      lineWidth: 2,
      priceLineVisible: false,
      title: 'Hurst DMA Center',
    });
    hurstCenterSeriesRef.current = hurstCenter;

    // Hurst Lower Envelope
    const hurstLower = chart.addSeries(LineSeries, {
      color: '#06b6d4',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      title: 'Hurst Lower',
    });
    hurstLowerSeriesRef.current = hurstLower;

    // Peter Eliades Target Projection
    const eliadesTarget = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 2,
      lineStyle: 1,
      priceLineVisible: true,
      title: 'Eliades Projected Target',
    });
    eliadesTargetSeriesRef.current = eliadesTarget;

    // Crosshair subscribe
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setHoverData(null);
        return;
      }

      const cData = param.seriesData.get(candleSeries) as CandlestickData | undefined;
      const vData = param.seriesData.get(volumeSeries) as HistogramData | undefined;
      const e8Data = param.seriesData.get(ema8) as LineData | undefined;
      const e13Data = param.seriesData.get(ema13) as LineData | undefined;
      const e21Data = param.seriesData.get(ema21) as LineData | undefined;
      const scData = param.seriesData.get(scout) as LineData | undefined;
      const hCData = param.seriesData.get(hurstCenter) as LineData | undefined;
      const elData = param.seriesData.get(eliadesTarget) as LineData | undefined;

      const dateStr = typeof param.time === 'number'
        ? new Date(param.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : String(param.time);

      if (cData) {
        setHoverData({
          time: dateStr,
          open: cData.open,
          high: cData.high,
          low: cData.low,
          close: cData.close,
          volume: vData?.value,
          ema8: e8Data?.value,
          ema13: e13Data?.value,
          ema21: e21Data?.value,
          scout: scData?.value,
          hurstCenter: hCData?.value,
          eliadesTarget: elData?.value,
        });
      }
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [assetTicker]);

  // Update Series Data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return;

    const sortedCandles = [...candles].sort((a, b) => a.time - b.time);
    const uniqueCandles: CandleBar[] = [];
    const seenTimes = new Set<number>();

    for (const c of sortedCandles) {
      if (!seenTimes.has(c.time)) {
        seenTimes.add(c.time);
        uniqueCandles.push(c);
      }
    }

    const candleData: CandlestickData[] = uniqueCandles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData: HistogramData[] = uniqueCandles.map((c) => ({
      time: c.time as UTCTimestamp,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)',
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    const closes = uniqueCandles.map((c) => c.close);

    // 1. Slim Ribbon & Reversal Scout
    if (showSlimRibbon && ema8SeriesRef.current && ema13SeriesRef.current && ema21SeriesRef.current && reversalScoutSeriesRef.current) {
      const ema8Vals = calculateEMA(closes, 8);
      const ema13Vals = calculateEMA(closes, 13);
      const ema21Vals = calculateEMA(closes, 21);
      const scoutVals = calculateAskSlimReversalScout(closes, 14);

      const ema8Data: LineData[] = [];
      const ema13Data: LineData[] = [];
      const ema21Data: LineData[] = [];
      const scoutData: LineData[] = [];

      for (let i = 0; i < uniqueCandles.length; i++) {
        const t = uniqueCandles[i].time as UTCTimestamp;
        ema8Data.push({ time: t, value: ema8Vals[i] });
        ema13Data.push({ time: t, value: ema13Vals[i] });
        ema21Data.push({ time: t, value: ema21Vals[i] });
        scoutData.push({ time: t, value: scoutVals[i] });
      }

      ema8SeriesRef.current.setData(ema8Data);
      ema13SeriesRef.current.setData(ema13Data);
      ema21SeriesRef.current.setData(ema21Data);
      reversalScoutSeriesRef.current.setData(scoutData);
    } else if (ema8SeriesRef.current) {
      ema8SeriesRef.current.setData([]);
      ema13SeriesRef.current?.setData([]);
      ema21SeriesRef.current?.setData([]);
      reversalScoutSeriesRef.current?.setData([]);
    }

    // 2. Hurst Envelope
    if (showHurstEnvelopes && hurstUpperSeriesRef.current && hurstCenterSeriesRef.current && hurstLowerSeriesRef.current) {
      const upperData: LineData[] = [];
      const centerData: LineData[] = [];
      const lowerData: LineData[] = [];

      const lookback = 14;
      for (let i = lookback; i < uniqueCandles.length; i++) {
        const slice = uniqueCandles.slice(i - lookback, i + 1);
        const mean = slice.reduce((a, b) => a + b.close, 0) / slice.length;
        const diffSum = slice.reduce((a, b) => a + Math.abs(b.close - mean), 0) / slice.length;
        const envWidth = diffSum * 1.6;

        const t = uniqueCandles[i].time as UTCTimestamp;
        upperData.push({ time: t, value: mean + envWidth });
        centerData.push({ time: t, value: mean });
        lowerData.push({ time: t, value: mean - envWidth });
      }

      hurstUpperSeriesRef.current.setData(upperData);
      hurstCenterSeriesRef.current.setData(centerData);
      hurstLowerSeriesRef.current.setData(lowerData);
    } else if (hurstUpperSeriesRef.current) {
      hurstUpperSeriesRef.current.setData([]);
      hurstCenterSeriesRef.current?.setData([]);
      hurstLowerSeriesRef.current?.setData([]);
    }

    // 3. Peter Eliades Offset Projected Target
    if (showEliadesTarget && eliadesTargetSeriesRef.current && posture.eliadesOffsets.projectedTargetPrice > 0) {
      const targetVal = posture.eliadesOffsets.projectedTargetPrice;
      const targetData: LineData[] = uniqueCandles.slice(-24).map((c) => ({
        time: c.time as UTCTimestamp,
        value: targetVal,
      }));
      eliadesTargetSeriesRef.current.setData(targetData);
    } else if (eliadesTargetSeriesRef.current) {
      eliadesTargetSeriesRef.current.setData([]);
    }
  }, [candles, posture, showHurstEnvelopes, showEliadesTarget, showSlimRibbon]);

  // Chart Controls
  const handleFitContent = useCallback(() => {
    chartRef.current?.timeScale().fitContent();
  }, []);

  const handleZoomIn = useCallback(() => {
    const timeScale = chartRef.current?.timeScale();
    if (timeScale) {
      const range = timeScale.getVisibleLogicalRange();
      if (range) {
        const delta = (range.to - range.from) * 0.25;
        timeScale.setVisibleLogicalRange({
          from: range.from + delta,
          to: range.to - delta,
        });
      }
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    const timeScale = chartRef.current?.timeScale();
    if (timeScale) {
      const range = timeScale.getVisibleLogicalRange();
      if (range) {
        const delta = (range.to - range.from) * 0.25;
        timeScale.setVisibleLogicalRange({
          from: range.from - delta,
          to: range.to + delta,
        });
      }
    }
  }, []);

  const handleScrollToEnd = useCallback(() => {
    chartRef.current?.timeScale().scrollToRealTime();
  }, []);

  const lastCandle = candles[candles.length - 1];

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner flex flex-col">
      {/* Top Controls Header Bar - In Flow (Zero Overlap with Candles) */}
      <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 z-10">
        {/* Live Metrics Header / Tooltip on Hover */}
        <div className="text-xs font-mono text-slate-200 flex flex-wrap items-center gap-2.5">
          {hoverData ? (
            <>
              <span className="text-cyan-400 font-bold">{hoverData.time}</span>
              <span>O: <strong className="text-slate-100">${hoverData.open?.toLocaleString()}</strong></span>
              <span>H: <strong className="text-emerald-400">${hoverData.high?.toLocaleString()}</strong></span>
              <span>L: <strong className="text-rose-400">${hoverData.low?.toLocaleString()}</strong></span>
              <span>C: <strong className="text-slate-100">${hoverData.close?.toLocaleString()}</strong></span>
              {hoverData.volume && <span className="text-slate-400">Vol: {hoverData.volume.toLocaleString()}</span>}
            </>
          ) : lastCandle ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-slate-100">{assetTicker} Live</span>
              </div>
              <span>Last: <strong className="text-emerald-400">${lastCandle.close.toLocaleString()}</strong></span>
              <span>High: ${lastCandle.high.toLocaleString()}</span>
              <span>Low: ${lastCandle.low.toLocaleString()}</span>
              <span>Vol: {lastCandle.volume.toLocaleString()}</span>
            </>
          ) : (
            <span>Connecting to live feed...</span>
          )}
        </div>

        {/* Action Buttons: Auto-Scale, Zoom, Scroll-to-Latest */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomIn}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleFitContent}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono font-bold transition-colors cursor-pointer"
            title="Auto-fit and reset zoom"
          >
            <RotateCcw className="w-3 h-3 text-cyan-400" />
            <span>Auto Scale</span>
          </button>
          <button
            onClick={handleScrollToEnd}
            className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-[10px] font-mono font-bold transition-colors cursor-pointer"
            title="Scroll to latest live candle"
          >
            <ArrowRight className="w-3 h-3" />
            <span>Latest</span>
          </button>
        </div>
      </div>

      {/* Unobstructed Chart Canvas */}
      <div ref={chartContainerRef} className="w-full h-[400px]" />

      {/* Bottom Indicator Legend Bar */}
      <div className="px-3 py-1.5 bg-slate-900/80 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400 gap-2">
        <div className="flex flex-wrap items-center gap-3">
          {showSlimRibbon && (
            <div className="flex items-center gap-1.5 text-purple-300">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>AskSlim Ribbon (8/13/21) & Reversal Scout: <strong>{posture.askslimPosture.swingPosture}</strong></span>
            </div>
          )}
          {showHurstEnvelopes && (
            <div className="flex items-center gap-1.5 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Hurst DMA Center: <strong>${posture.hurstCycles.displacedMaCenter.toLocaleString()}</strong> ({posture.hurstCycles.cyclePhase})</span>
            </div>
          )}
          {showEliadesTarget && (
            <div className="flex items-center gap-1.5 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Eliades Target: <strong>${posture.eliadesOffsets.projectedTargetPrice.toLocaleString()}</strong> ({posture.eliadesOffsets.projectedTargetDirection})</span>
            </div>
          )}
        </div>

        <div className="text-slate-500">
          Scroll back to inspect full history • Drag axes to rescale
        </div>
      </div>
    </div>
  );
};
