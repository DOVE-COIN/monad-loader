import React, { useEffect, useState, useRef } from "react";
import "./App.css";

const STATUS_API_URL =
  typeof process !== "undefined" && process.env && process.env.REACT_APP_MONAD_STATUS_URL
    ? process.env.REACT_APP_MONAD_STATUS_URL
    : "/api/monad/status";

const POLL_INTERVAL_MS = 3000;

// --- CONFIGURATION ---
const INITIAL_SYNC = 80.0;     // Start progress at 80%
const DAILY_INCREMENT = 2.0;   // Progress increases by 2% per day
const START_DAYS_AGO = 4;      // Pretend sync started 4 days ago
const LOCAL_STORAGE_KEY = "monad_timer_start";
// ----------------------

export default function MonadMainnetLoader({ apiUrl = STATUS_API_URL }) {
  const [status, setStatus] = useState(null);
  const [connected, setConnected] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [displayedPct, setDisplayedPct] = useState(INITIAL_SYNC);

  const pollRef = useRef(null);
  const timerRef = useRef(null);
  const animationRef = useRef(null);

  // Initialize start time (persistent between refreshes)
  useEffect(() => {
    let startTimestamp = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!startTimestamp) {
      startTimestamp = Date.now();
      localStorage.setItem(LOCAL_STORAGE_KEY, startTimestamp);
    }
    const startTime = Number(startTimestamp);
    setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));

    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  // Poll API (optional)
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

  // --- Demo progression logic ---
  const SECONDS_PER_DAY = 24 * 60 * 60;
  const elapsedDays = elapsedSeconds / SECONDS_PER_DAY + START_DAYS_AGO;
  const demoSyncPct = Math.min(100, INITIAL_SYNC + elapsedDays * DAILY_INCREMENT);
  // ------------------------------

  const demo = {
    chain: "monad-mainnet",
    status: "syncing",
    blockHeight: 123_456,
    peers: 8,
    tps: 0.7,
    syncPct: demoSyncPct,
  };

  const s = connected && status ? status : demo;

  // Smooth progress animation
  useEffect(() => {
    animationRef.current = requestAnimationFrame(function animate() {
      setDisplayedPct((prev) => {
        const target = s.syncPct;
        const diff = target - prev;
        if (Math.abs(diff) < 0.01) return target;
        return prev + diff * 0.05;
      });
      animationRef.current = requestAnimationFrame(animate);
    });
    return () => cancelAnimationFrame(animationRef.current);
  }, [s.syncPct]);

  // Format time for display
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
            <div
              className={`loader-value ${
                s.status === "ready" ? "status-ready" : "status-syncing"
              }`}
            >
              {s.status}
            </div>
          </div>
        </div>

        <div className="loader-progress">
          <div className="loader-progress-bar">
            <div
              className="loader-progress-fill"
              style={{
                width: `${Math.max(0, Math.min(100, displayedPct))}%`,
              }}
            />
          </div>
          <div className="loader-progress-text">
            {displayedPct.toFixed(2)}% — Block #{s.blockHeight.toLocaleString()}
          </div>
          <div className="loader-progress-text">
            Elapsed time: {formatTime(elapsedSeconds + START_DAYS_AGO * SECONDS_PER_DAY)}
          </div>
        </div>

        <footer className="loader-footer">Built by gentledove.eth</footer>
      </div>
    </div>
  );
}
