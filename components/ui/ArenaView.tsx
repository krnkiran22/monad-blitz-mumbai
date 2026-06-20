"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMultiplayerState } from "playroomkit";
import { MonadMark, MonadCoin } from "./MonadMark";
import { useMultiplayer } from "../game/multiplayer";
import { AGENT_PERSONALITIES } from "../agent/brain";
import type { ArenaState } from "../chain/useArena";
import type { ArenaSettings, MatchStats } from "../game/Arena";

const AGENT_NAMES = AGENT_PERSONALITIES.map((a) => a.name);

const ArenaScene = dynamic(
  () => import("../game/Arena").then((m) => ({ default: m.ArenaScene })),
  { ssr: false, loading: () => <ArenaSkeleton /> }
);

function ArenaSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center monad-bg">
      <div className="text-center">
        <MonadMark size={48} className="animate-spin-slow mx-auto mb-4" />
        <p className="text-[#a78bfa] text-sm font-bold tracking-widest">LOADING ARENA…</p>
      </div>
    </div>
  );
}

interface Props {
  initialMapFile: string;
  arenaSettings: ArenaSettings;
  arenaState: ArenaState;
  walletAddress: string;
  monBalance: string;
  loading: boolean;
  AGENT_COLORS: string[];
  onBack: () => void;
  onOpenSettings: () => void;
  onClaim: (matchId: bigint) => Promise<void> | void;
  onSettleMatch: (winnerId: number) => Promise<void> | void;
}

export function ArenaView({
  initialMapFile,
  arenaSettings,
  arenaState,
  walletAddress,
  monBalance,
  loading,
  AGENT_COLORS,
  onBack,
  onOpenSettings,
  onClaim,
  onSettleMatch,
}: Props) {
  const { isHost, roomCode, playerCount } = useMultiplayer();

  // Host-authoritative match state, mirrored to every spectator in the room.
  const [matchRunning, setMatchRunning] = useMultiplayerState("matchRunning", false);
  const [winner, setWinner] = useMultiplayerState<number | null>("winner", null);
  const [mapFile, setMapFile] = useMultiplayerState("mapFile", initialMapFile);
  const [stats, setStats] = useMultiplayerState<MatchStats>("stats", {
    timeLeft: 10,
    kills: [0, 0, 0],
  });

  // Spectator camera: -1 = free orbit, 0..2 = follow that agent's POV.
  const [spectateIndex, setSpectateIndex] = useState(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Host publishes its chosen map once on entry.
  useEffect(() => {
    if (isHost) setMapFile(initialMapFile);
  }, [isHost, initialMapFile, setMapFile]);

  const handleMatchEnd = useCallback(
    async (winnerId: number) => {
      if (!isHost) return;
      setMatchRunning(false);
      setWinner(winnerId);
      // Settle the match on-chain so winning bettors can claim.
      try {
        await onSettleMatch(winnerId);
      } catch {
        // owner-only / no active round — keep the visual result regardless
      }
    },
    [isHost, setMatchRunning, setWinner, onSettleMatch]
  );

  const handleStats = useCallback(
    (next: MatchStats) => {
      if (isHost) setStats(next);
    },
    [isHost, setStats]
  );

  // Betting already happened in the lobby — the arena is watch-only and the
  // host's fight starts automatically a beat after entering.
  const beginMatch = useCallback(() => {
    if (!isHost) return;
    setWinner(null);
    setStats({ timeLeft: 10, kills: [0, 0, 0] });
    setMatchRunning(true);
  }, [isHost, setMatchRunning, setWinner, setStats]);

  // Bets were placed in the lobby, so the fight starts the instant the host
  // enters the arena — no "ready" prompt. The guard lives inside the (0 ms)
  // timer so React Strict Mode's mount/cleanup/mount cycle still reschedules,
  // while the start itself only ever runs once.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!isHost) return;
    const t = setTimeout(() => {
      if (autoStarted.current) return;
      autoStarted.current = true;
      setWinner(null);
      setStats({ timeLeft: 10, kills: [0, 0, 0] });
      setMatchRunning(true);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost]);

  // Claim winnings, then dismiss the result popup and return to the start
  // screen. Only closes on success so a rejected tx keeps the claim available.
  const handleClaim = useCallback(async () => {
    try {
      await onClaim(arenaState.matchId);
      setWinner(null);
    } catch {
      // tx rejected / failed — leave the popup up so they can retry
    }
  }, [onClaim, arenaState.matchId, setWinner]);

  // Cycle the spectator POV. -1 (free) → 0 → 1 → 2 → -1 …
  const cycleSpectate = useCallback((dir: 1 | -1) => {
    setSpectateIndex((cur) => {
      const next = cur + dir;
      if (next > 2) return -1;
      if (next < -1) return 2;
      return next;
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  // Keyboard: ←/→ cycle POV, F toggles fullscreen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") cycleSpectate(1);
      else if (e.key === "ArrowLeft") cycleSpectate(-1);
      else if (e.key.toLowerCase() === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cycleSpectate, toggleFullscreen]);

  useEffect(() => {
    const onFs = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // The arena <canvas> only resizes on a layout/resize event; nudge it so
      // it shrinks back correctly and the side panel reflows after exiting.
      setTimeout(() => window.dispatchEvent(new Event("resize")), 80);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const spectateName = spectateIndex >= 0 ? AGENT_NAMES[spectateIndex] : "FREE CAM";
  const spectateColor = spectateIndex >= 0 ? AGENT_COLORS[spectateIndex] : "#a78bfa";

  return (
    <div ref={rootRef} className="h-screen monad-bg text-white flex flex-col">
      <header className="border-b border-[#836ef9]/15 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2.5">
            <MonadMark size={26} />
            <div>
              <h1 className="text-base font-black tracking-tight leading-none">
                BGMI <span className="text-gray-500 font-medium text-xs">· Battle Ground Monad India</span>
              </h1>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {roomCode && (
            <div className="flex items-center gap-2 glass rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-gray-400 font-bold">ROOM</span>
              <span className="text-white font-bold text-xs font-mono tracking-wider">{roomCode}</span>
              <span className="text-[10px] text-[#a78bfa] font-bold">· {playerCount}</span>
            </div>
          )}
          {walletAddress && (
            <div className="flex items-center gap-2 glass rounded-full px-3 py-1.5">
              <MonadCoin size={16} />
              <span className="text-white font-bold text-xs font-mono">{monBalance}</span>
              <span className="text-[#a78bfa] text-[10px] font-bold">MON</span>
            </div>
          )}
          <button
            onClick={onOpenSettings}
            className="w-8 h-8 rounded-full glass flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 min-w-0 min-h-[420px] lg:min-h-0 relative overflow-hidden bg-[#0a0613]">
          <ArenaScene
            onMatchEnd={handleMatchEnd}
            onStats={handleStats}
            running={matchRunning}
            isHost={isHost}
            mapFile={mapFile}
            settings={arenaSettings}
            spectateIndex={spectateIndex}
          />

          {!matchRunning && winner === null && !isHost && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center glass rounded-2xl p-8 max-w-sm">
                <h2 className="text-2xl font-black mb-2 shimmer">GET READY</h2>
                <p className="text-gray-400 text-sm">
                  Waiting for the host to start the match. You&apos;ll watch the same fight in real time.
                </p>
              </div>
            </div>
          )}

          {/* ── Live HUD: countdown + LIVE badge ── */}
          {matchRunning && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
              <div className="flex items-center gap-2 glass rounded-full px-3 py-1 border border-red-500/30">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[11px] font-bold text-red-400 tracking-widest">LIVE</span>
              </div>
              <div
                className={`text-4xl font-black tabular-nums tracking-tight ${
                  stats.timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-white"
                }`}
                style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
              >
                0:{String(stats.timeLeft).padStart(2, "0")}
              </div>
            </div>
          )}

          {/* ── Kill scoreboard ── */}
          {(matchRunning || winner !== null) && (
            <div className="absolute top-4 right-4 glass rounded-xl px-3 py-2.5 w-44 pointer-events-none">
              <p className="text-[9px] font-bold text-gray-400 tracking-widest mb-2">KILL LEADERBOARD</p>
              <div className="space-y-1.5">
                {[...AGENT_NAMES.keys()]
                  .sort((a, b) => (stats.kills[b] ?? 0) - (stats.kills[a] ?? 0))
                  .map((i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: AGENT_COLORS[i] }} />
                        <span className="text-[11px] font-bold text-white truncate">{AGENT_NAMES[i]}</span>
                      </div>
                      <span className="text-[12px] font-black tabular-nums" style={{ color: AGENT_COLORS[i] }}>
                        {stats.kills[i] ?? 0}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ── Winner screen ── */}
          {winner !== null && !matchRunning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm">
              <div
                className="relative text-center rounded-3xl px-10 py-9 max-w-md w-[90%] border"
                style={{
                  borderColor: AGENT_COLORS[winner],
                  background: "linear-gradient(160deg, rgba(20,14,40,0.96), rgba(10,6,19,0.96))",
                  boxShadow: `0 0 80px -10px ${AGENT_COLORS[winner]}`,
                }}
              >
                <p className="text-[11px] font-bold tracking-[0.4em] text-gray-400 mb-3">MATCH OVER</p>
                <div
                  className="mx-auto mb-4 w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black"
                  style={{ background: AGENT_COLORS[winner], color: "#0a0613", boxShadow: `0 8px 30px -6px ${AGENT_COLORS[winner]}` }}
                >
                  {AGENT_NAMES[winner][0]}
                </div>
                <h2 className="text-4xl font-black mb-1 tracking-tight" style={{ color: AGENT_COLORS[winner] }}>
                  {AGENT_NAMES[winner]}
                </h2>
                <p className="text-white/80 text-sm font-bold tracking-widest mb-5">VICTORY ROYALE</p>

                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[...AGENT_NAMES.keys()]
                    .sort((a, b) => (stats.kills[b] ?? 0) - (stats.kills[a] ?? 0))
                    .map((i, rank) => (
                      <div
                        key={i}
                        className="rounded-xl py-2.5 px-1"
                        style={{
                          background: i === winner ? `${AGENT_COLORS[i]}22` : "rgba(255,255,255,0.04)",
                          border: `1px solid ${i === winner ? AGENT_COLORS[i] : "rgba(255,255,255,0.08)"}`,
                        }}
                      >
                        <p className="text-[9px] font-bold text-gray-400">#{rank + 1}</p>
                        <p className="text-[11px] font-bold text-white truncate px-1">{AGENT_NAMES[i].split(" ")[0]}</p>
                        <p className="text-xl font-black tabular-nums" style={{ color: AGENT_COLORS[i] }}>
                          {stats.kills[i] ?? 0}
                        </p>
                        <p className="text-[8px] text-gray-500 font-bold tracking-wider">KILLS</p>
                      </div>
                    ))}
                </div>

                {parseFloat(arenaState.claimable) > 0 ? (
                  <button
                    onClick={handleClaim}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-linear-to-r from-emerald-500 to-green-500 hover:opacity-90 disabled:opacity-50 font-black text-white tracking-wide transition-opacity flex items-center justify-center gap-2"
                  >
                    <MonadCoin size={18} />
                    {loading ? "CLAIMING…" : `CLAIM ${parseFloat(arenaState.claimable).toFixed(3)} MON`}
                  </button>
                ) : (
                  <p className="text-gray-400 text-xs">Result recorded on Monad Testnet · winners can claim payouts</p>
                )}

                {isHost && (
                  <button
                    onClick={beginMatch}
                    className="mt-3 w-full py-2.5 rounded-xl glass hover:bg-white/10 font-bold text-white text-sm tracking-wide transition-colors"
                  >
                    WATCH AGAIN
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Spectator + fullscreen controls ── */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <button
              onClick={() => cycleSpectate(-1)}
              className="w-9 h-9 rounded-full glass flex items-center justify-center text-gray-300 hover:text-white transition-colors"
              title="Previous camera (←)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div
              className="glass rounded-full px-4 py-1.5 flex items-center gap-2 min-w-[150px] justify-center"
              style={{ borderColor: spectateColor }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: spectateColor }} />
              <span className="text-xs font-bold text-white tracking-wide">{spectateName}</span>
              {spectateIndex >= 0 && <span className="text-[9px] text-gray-400 font-bold">POV</span>}
            </div>
            <button
              onClick={() => cycleSpectate(1)}
              className="w-9 h-9 rounded-full glass flex items-center justify-center text-gray-300 hover:text-white transition-colors"
              title="Next camera (→)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="absolute bottom-4 right-4 w-9 h-9 rounded-full glass flex items-center justify-center text-gray-300 hover:text-white transition-colors"
            title="Fullscreen (F)"
          >
            {isFullscreen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
