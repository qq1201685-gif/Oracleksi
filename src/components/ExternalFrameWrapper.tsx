/**
 * External Frame Wrapper Component
 * Robust, error-handling wrapper for embedded external URLs & web views.
 * Features 10-second timeout detection, animated spinner, manual 'Reload Frame' button,
 * and external fallback links.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Maximize2,
  Globe,
} from 'lucide-react';

interface ExternalFrameWrapperProps {
  src: string;
  title: string;
  className?: string;
  timeoutMs?: number; // default 10,000ms (10 seconds)
  sandbox?: string;
  allow?: string;
}

export const ExternalFrameWrapper: React.FC<ExternalFrameWrapperProps> = ({
  src,
  title,
  className = 'w-full h-96',
  timeoutMs = 10000,
  sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups allow-presentation',
  allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize watchdog timeout
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    setElapsedSeconds(0);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);

    // Elapsed seconds counter for user feedback
    elapsedIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    // 10-Second Watchdog Timeout
    timerRef.current = setTimeout(() => {
      setIsLoading(false);
      setHasError(true);
      setErrorMessage(`The external resource did not respond within ${timeoutMs / 1000} seconds.`);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    }, timeoutMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, [src, reloadKey, timeoutMs]);

  const handleFrameLoad = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    setIsLoading(false);
    setHasError(false);
  };

  const handleFrameError = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    setIsLoading(false);
    setHasError(true);
    setErrorMessage('Failed to load external frame due to security or connectivity constraints.');
  };

  const handleReload = () => {
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div className={`relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden flex flex-col ${className}`}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 font-mono text-xs z-10">
        <div className="flex items-center gap-2 text-slate-300 truncate">
          <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-bold truncate">{title}</span>
          <span className="text-[10px] text-slate-500 hidden sm:inline truncate max-w-xs">{src}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isLoading && (
            <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              <span>{elapsedSeconds}s</span>
            </span>
          )}

          <button
            onClick={handleReload}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono transition-colors cursor-pointer"
            title="Reload Frame"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Reload Frame</span>
          </button>

          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-300 text-[11px] font-mono transition-colors"
            title="Open in new window"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="hidden sm:inline">Open URL</span>
          </a>
        </div>
      </div>

      {/* Frame Container & Overlay States */}
      <div className="relative flex-1 w-full h-full min-h-[300px] bg-slate-950">
        {/* Loading Spinner State */}
        {isLoading && (
          <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-3">
              <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
              <Loader2 className="w-5 h-5 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <h4 className="text-sm font-bold font-mono text-slate-200">Connecting to External Web View</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm font-mono">
              Loading {title}... ({elapsedSeconds}s elapsed)
            </p>
            <div className="w-48 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
              <div
                className="bg-cyan-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, (elapsedSeconds / (timeoutMs / 1000)) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Error / Timeout Fallback State (Triggered after 10s) */}
        {hasError && (
          <div className="absolute inset-0 z-30 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="p-3 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md">
              <h4 className="text-sm font-bold font-mono text-slate-100">External Content Load Timeout</h4>
              <p className="text-xs text-slate-400 font-mono">{errorMessage}</p>
              <p className="text-[11px] text-slate-500 font-mono">
                Some external providers block iframe embedding due to X-Frame-Options or Content Security Policies.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleReload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold cursor-pointer transition-colors border border-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Reload Frame</span>
              </button>

              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-mono font-bold transition-colors shadow-md shadow-cyan-500/20"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Direct View</span>
              </a>
            </div>
          </div>
        )}

        {/* Actual IFrame */}
        <iframe
          key={reloadKey}
          src={src}
          title={title}
          sandbox={sandbox}
          allow={allow}
          onLoad={handleFrameLoad}
          onError={handleFrameError}
          className="w-full h-full border-0 absolute inset-0"
          loading="lazy"
        />
      </div>
    </div>
  );
};
