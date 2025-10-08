import React, { useEffect, useState, useRef } from "react";
import "./App.css";

// --- CONFIGURATION ---
const INITIAL_SYNC = 92.0;                    // current progress
const DAILY_INCREMENT = 1.0;                  // grows 1% per day
const REMAINING_DAYS = 4;                     // 2 days to reach 100%
const TOTAL_DAYS = 4.92 + REMAINING_DAYS;     // total ~8.92 days timeline
const POLL_INTERVAL_MS = 3000;

// Fixed global start date (so everyone sees same timer)
// Start = 6 days 22 hours ago from now
const START_DATE_UTC = new Date(Date.now() - (6 * 24 * 3600 + 22 * 3600) * 1000);

// --- MAIN COMPONENT ---
export default function MonadMainnetLoader() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [displayedPct, setDisplayedPct] = useState(INITIAL_SYNC);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState(null);

  const animationRef = useRef(null);
  const pollRef = useRef(null);

  // Timer based on fixed start date (global)
  useEffect(() => {
    const updateElapsed = () => {
      setElapsedSeconds(Math.floor((Date.now() - START_DATE_UTC.getTime()) / 1000));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate demo sync percentage
  const elapsedDays = elapsedSeconds / (24 * 3600);
  const progress = Math.min(100, INITIAL_SYNC + elapsedDays * DAILY_INCREMENT);
  const demo = {
    chain: "monad-mainnet",
    status: progress >= 100 ? "ready" : "syncing",
    blockHeight: 123_456,
    peers: 8,
    tps: 0.7,
    syncPct: progress,
  };
  const s = connected && status ? status : demo;

  // Smooth progress animation
  useEffect(() => {
    animationRef.current = requestAnimationFrame(function animate() {
      setDisplayedPct((prev) => {
        const diff = s.syncPct - prev;
        if (Math.abs(diff) < 0.01) return s.syncPct;
        return prev + diff * 0.05;
      });
      animationRef.current = requestAnimationFrame(animate);
    });
    return () => cancelAnimationFrame(animationRef.current);
  }, [s.syncPct]);

  // Timer formatting
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
            Elapsed time: {formatTime(elapsedSeconds)}
          </div>
        </div>

        <footer className="loader-footer">Built by gentledove.eth</footer>
      </div>
    </div>
  );
}
