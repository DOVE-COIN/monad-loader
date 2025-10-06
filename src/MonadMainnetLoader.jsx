import React, { useEffect, useState, useRef } from "react";
import './App.css';

const STATUS_API_URL = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_MONAD_STATUS_URL)
  ? process.env.REACT_APP_MONAD_STATUS_URL
  : "/api/monad/status";
const POLL_INTERVAL_MS = 3000;

// === Global Monad Sync Settings ===
const START_DATE = new Date("2025-10-02T00:00:00Z"); // started 4 days ago
const START_PROGRESS = 80;     // starting percentage
const DAILY_INCREMENT = 2.5;   // percent per day increase

export default function MonadMainnetLoader({ apiUrl = STATUS_API_URL }) {
  const [status, setStatus] = useState(null);
  const [connected, setConnected] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [displayedPct, setDisplayedPct] = useState(START_PROGRESS);

  const pollRef = useRef(null);
  const animationRef = useRef(null);
  const timerRef = useRef(null);

  // Timer updates every second using real world time difference
  useEffect(() => {
    const updateElapsed = () => {
      const diff = Date.now() - START_DATE.getTime();
      setElapsedSeconds(Math.floor(diff / 1000));
    };

    updateElapsed();
    timerRef.current = setInterval(updateElapsed, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Fetch optional live status
  useEffect(() => {
    let mounted = true;
    async function fetchStatus() {
      try {
        const res = await fetch(apiUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        setStatus(normalizeData(data));
        setConnected(true);
      } catch {
        if (!mounted) return;
        setConnected(false);
      }
    }
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(pollRef.current);
    };
  }, [apiUrl]);

  function normalizeData(data) {
    return {
      chain: data.chain || data.network || "monad-mainnet",
      status: data.status || (data.syncPct && data.syncPct >= 100 ? "ready" : "syncing"),
      blockHeight: Number(data.blockHeight ?? data.height ?? data.block ?? 0),
      peers: Number(data.peers ?? data.connectedPeers ?? 0),
      tps: Number(data.tps ?? data.txPerSec ?? 0),
      syncPct: Number(data.syncPct ?? data.progress ?? 0),
    };
  }

  // === Global Progress Calculation ===
  const daysPassed = (Date.now() - START_DATE.getTime()) / (1000 * 60 * 60 * 24);
  const currentProgress = Math.min(START_PROGRESS + daysPassed * DAILY_INCREMENT, 100);

  const demo = {
    chain: "monad-mainnet",
    status: currentProgress >= 100 ? "ready" : "syncing",
    blockHeight: 123_456,
    peers: 8,
    tps: 0.7,
    syncPct: currentProgress,
  };

  const s = connected && status ? status : demo;

  // Smooth animation for progress bar
  useEffect(() => {
    animationRef.current = requestAnimationFrame(function animate() {
      setDisplayedPct(prev => {
        const target = s.syncPct;
        const diff = target - prev;
        if (Math.abs(diff) < 0.01) return target;
        return prev + diff * 0.05;
      });
      animationRef.current = requestAnimationFrame(animate);
    });
    return () => cancelAnimationFrame(animationRef.current);
  }, [s.syncPct]);

  const formatTime = (seconds) => {
    const d = Math.floor(seconds / (24 * 3600));
    const h = Math.floor((seconds % (24 * 3600)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  return (
    <div className="loader-container">
      <div className="loader-box">
        <div className="loader-header">
          <div>
            <div className="loader-label">Network</div>
            <div className="loader-value">{s.chain}</div>
          </div>
          <div>
            <div className="loader-label">Status</div>
            <div className={`loader-value ${s.status === 'ready' ? 'status-ready' : 'status-syncing'}`}>
              {s.status}
            </div>
          </div>
        </div>

        <div className="loader-progress">
          <div className="loader-progress-bar">
            <div
              className="loader-progress-fill"
              style={{ width: `${Math.max(0, Math.min(100, displayedPct))}%` }}
            />
          </div>
          <div className="loader-progress-text">
            {displayedPct.toFixed(2)}% — Block #{s.blockHeight.toLocaleString()}
          </div>
          <div className="loader-progress-text">
            Elapsed time: {formatTime(elapsedSeconds)}
          </div>
        </div>

        <footer className="loader-footer">Built by gentledove.eth</footer>
      </div>
    </div>
  );
}
