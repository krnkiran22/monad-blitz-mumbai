"use client";

import { AGENT_PERSONALITIES } from "../agent/brain";
import type { ArenaState } from "../chain/useArena";

interface Props {
  arenaState: ArenaState;
  matchRunning: boolean;
  winner: number | null;
  walletAddress: string;
  loading: boolean;
  isHost?: boolean;
  onClaim: () => void;
  onStartMatch: () => void;
  colors: string[];
}

export function Dashboard({
  arenaState,
  matchRunning,
  winner,
  walletAddress,
  loading,
  isHost = true,
  onClaim,
  onStartMatch,
  colors,
}: Props) {
  const totalPot = parseFloat(arenaState.totalPot) || 0;

  const getStatusLabel = () => {
    if (matchRunning) return { text: "LIVE", color: "#ef4444" };
    if (winner !== null) return { text: "MATCH ENDED", color: "#22c55e" };
    return { text: "WAITING", color: "#f59e0b" };
  };

  const status = getStatusLabel();

  return (
    <div className="flex flex-col gap-4">
      {/* Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Live Dashboard</h2>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: status.color }}
          />
          <span className="text-xs font-mono font-bold" style={{ color: status.color }}>
            {status.text}
          </span>
        </div>
      </div>

      {/* Match ID */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Match</span>
          <span className="text-white font-mono">#{arenaState.matchId.toString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-gray-400">Block Time</span>
          <span className="text-green-400 font-mono">~400ms</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-gray-400">Network</span>
          <span className="text-purple-400 font-mono">Monad Testnet</span>
        </div>
      </div>

      {/* Agent stats */}
      <div className="space-y-2">
        {arenaState.agents.map((agent, i) => {
          const p = AGENT_PERSONALITIES[i];
          const isWinner = winner === i;

          return (
            <div
              key={i}
              className="rounded-xl p-3 border transition-all"
              style={{
                borderColor: isWinner ? colors[i] : "rgba(255,255,255,0.08)",
                background: isWinner ? `${colors[i]}15` : "transparent",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: colors[i], boxShadow: `0 0 6px ${colors[i]}` }}
                  />
                  <span className="font-bold text-sm text-white">{p.name}</span>
                  {isWinner && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ background: colors[i], color: "#000" }}>
                      WINNER
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-gray-300">
                    {agent.wins}W / {agent.losses}L
                  </div>
                </div>
              </div>

              <div className="mt-2 flex gap-3 text-xs text-gray-400">
                <span>SPD {p.speed}x</span>
                <span>AGG {(p.aggression * 100).toFixed(0)}%</span>
                <span>{p.weapon}</span>
              </div>

              {/* Claim button */}
              {winner === i && walletAddress && parseFloat(arenaState.myBets[i]) > 0 && (
                <button
                  onClick={() => onClaim()}
                  disabled={loading}
                  className="mt-2 w-full py-1.5 rounded-lg text-sm font-bold disabled:opacity-50 transition-all"
                  style={{ background: colors[i], color: "#000" }}
                >
                  {loading ? "Claiming…" : `Claim Winnings`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Start button — host only; spectators wait for the host */}
      {!matchRunning && isHost && (
        <button
          onClick={onStartMatch}
          className="w-full py-3 rounded-xl font-black text-sm tracking-wide bg-gradient-to-r from-[#836ef9] to-[#6246ea] hover:opacity-90 text-white transition-opacity glow-purple"
        >
          {winner !== null ? "▶ START NEXT MATCH" : "▶ START MATCH"}
        </button>
      )}

      {!matchRunning && !isHost && (
        <div className="text-center text-sm text-gray-400">
          Waiting for the host to start the next match…
        </div>
      )}

      {matchRunning && (
        <div className="text-center text-sm text-gray-400 animate-pulse">
          Match in progress — watching on-chain…
        </div>
      )}

      {/* Total pot reminder */}
      {totalPot > 0 && (
        <div className="text-center text-xs text-gray-500">
          {totalPot.toFixed(4)} MON locked on Monad Testnet
        </div>
      )}
    </div>
  );
}
