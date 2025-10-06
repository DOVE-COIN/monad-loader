import React, { useEffect, useState, useRef } from "react";
import "./App.css";

const STATUS_API_URL =
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_MONAD_STATUS_URL)
    ? process.env.REACT_APP_MONAD_STATUS_URL
    : "/api/monad/status";

const POLL_INTERVAL_MS = 3000;

// ---- Simulation setup ----
const INITIAL_SYNC = 80.0;           // Start at 80%
const GROWTH_PER_DAY = 2.5;          // Increase 2.5% per day
const DAYS_TO_COMPLETE = (100 - INITIAL_SYNC) / GROWTH_PER_DAY; // total ~8 days
const TOTAL_SECONDS = DAYS_TO_COMPLETE * 24 * 60 * 60;

const LOCAL_STORAGE_KEY = "monad_timer_v3_start";

export default function MonadMainnetLoader({ apiUrl = STATUS_API_URL }) {
  const [status, setStatus] = useState(null);
  const [connected, setConnected] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [displayedPct, setDisplayedPct] = useState(INITIAL_SYNC);

  const pollRef = useRef(null);
  const timerRef = useRef(null);
  const animationRef = useRef(null);

  // Initialize start time as 4 days ago (simulated)
  useEffect(() => {
    let startTimestamp = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!startTimestamp) {
      const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
      // The trick: set "start time" 4 days *ahead*, so we begin at 80% now.
      // We offset the start so the computed progress at this moment = 80%.
      startTimestamp = Date.now(); // set baseline now
      localStorage.setItem(LOCAL_STORAGE_KEY, startTimestamp);
    }

    const startTime = Number(startTimestamp);
    setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));

    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  // Fetch status
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

  // ---- Demo Sync ----
  const adjustedElapsedSeconds = elapsedSeconds + 4 * 24 * 60 * 60; // simulate day 4
  const demoSyncPct = Math.min(
    100,
    INITIAL_SYNC + (adjustedElapsedSeconds / TOTAL_SECONDS) * (100 - INITIAL_SYNC)
  );

  const demo = {
    chain: "monad-mainnet",
    status: "syncing",
    blockHeight: 123_456,
    peers: 8,
    tps: 0.7,
    syncPct: demoSyncPct,
  };

  const s = connected && status ? status : demo;

  // Smooth bar animation
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

  const formatTime = (seconds) => {
    const totalSeconds = seconds + 4 * 24 * 60 * 60; // start at day 4
    const d = Math.floor(totalSeconds / (24 * 3600));
    const h = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
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
            Elapsed time: {formatTime(elapsedSeconds)}
          </div>
        </div>

        <footer className="loader-footer">Built by gentledove.eth</footer>
      </div>
    </div>
  );
}
