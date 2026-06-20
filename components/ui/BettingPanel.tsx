"use client";

import { useState } from "react";
import { AGENT_PERSONALITIES } from "../agent/brain";
import type { ArenaState } from "../chain/useArena";
import { MonadCoin } from "./MonadMark";

interface Props {
  arenaState: ArenaState;
  walletAddress: string;
  loading: boolean;
  defaultBet?: string;
  onConnect: () => void;
  onBet: (agentId: number, amount: string) => void;
  colors: string[];
}

export function BettingPanel({ arenaState, walletAddress, loading, defaultBet = "0.01", onConnect, onBet, colors }: Props) {
  const [betAmounts, setBetAmounts] = useState([defaultBet, defaultBet, defaultBet]);
  const [selected, setSelected] = useState<number | null>(null);

  const totalPotNum = parseFloat(arenaState.totalPot) || 0;

  const odds = arenaState.agents.map((a) => {
    const agentBet = parseFloat(a.totalBet) || 0;
    if (totalPotNum === 0 || agentBet === 0) return "—";
    const ratio = totalPotNum / agentBet;
    return `${ratio.toFixed(2)}x`;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Place Your Bet</h2>
        {!walletAddress ? (
          <button
            onClick={onConnect}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#836ef9] to-[#6246ea] hover:opacity-90 text-white text-sm font-semibold transition-opacity"
          >
            Connect Wallet
          </button>
        ) : (
          <span className="text-xs text-gray-400 font-mono">
            {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
          </span>
        )}
      </div>

      {!arenaState.bettingOpen && (
        <div className="text-center py-2 rounded-lg bg-yellow-900/40 border border-yellow-700 text-yellow-400 text-sm">
          {arenaState.matchActive ? "Betting is closed — match is live!" : "Waiting for next match…"}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {arenaState.agents.map((agent, i) => {
          const agentBet = parseFloat(agent.totalBet) || 0;
          const pct = totalPotNum > 0 ? (agentBet / totalPotNum) * 100 : 33.3;
          const personality = AGENT_PERSONALITIES[i];
          const myBet = parseFloat(arenaState.myBets[i]) || 0;

          return (
            <div
              key={i}
              onClick={() => arenaState.bettingOpen && setSelected(selected === i ? null : i)}
              className={`rounded-xl border p-3 cursor-pointer transition-all ${
                selected === i
                  ? "border-opacity-100 shadow-lg"
                  : "border-white/10 hover:border-white/30"
              }`}
              style={{
                borderColor: selected === i ? colors[i] : undefined,
                boxShadow: selected === i ? `0 0 16px ${colors[i]}40` : undefined,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: colors[i], boxShadow: `0 0 8px ${colors[i]}` }}
                  />
                  <span className="font-bold text-white text-sm">{personality.name}</span>
                  <span className="text-xs text-gray-400 px-1.5 py-0.5 rounded bg-white/5">
                    {personality.weapon}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-white">{odds[i]}</div>
                  <div className="text-xs text-gray-400">{agent.wins}W / {agent.losses}L</div>
                </div>
              </div>

              {/* Bet bar */}
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: colors[i] }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{agent.totalBet} MON in pool ({pct.toFixed(0)}%)</span>
                {myBet > 0 && (
                  <span style={{ color: colors[i] }}>Your bet: {myBet.toFixed(4)} MON</span>
                )}
              </div>

              {/* Expanded bet input */}
              {selected === i && arenaState.bettingOpen && (
                <div
                  className="mt-3 flex gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={betAmounts[i]}
                    onChange={(e) => {
                      const next = [...betAmounts];
                      next[i] = e.target.value;
                      setBetAmounts(next);
                    }}
                    className="flex-1 bg-black/40 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-white/50"
                    placeholder="0.01"
                  />
                  <button
                    disabled={loading || !walletAddress}
                    onClick={() => onBet(i, betAmounts[i])}
                    className="px-4 py-1.5 rounded-lg text-sm font-bold disabled:opacity-50 transition-all"
                    style={{ background: colors[i], color: "#000" }}
                  >
                    {loading ? "…" : "BET"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-1 rounded-xl glass p-3 flex items-center justify-between">
        <span className="text-gray-400 text-sm">Total Pot</span>
        <span className="flex items-center gap-2 text-white font-bold font-mono text-lg">
          <MonadCoin size={18} />
          {totalPotNum.toFixed(4)} <span className="text-[#a78bfa] text-sm">MON</span>
        </span>
      </div>
    </div>
  );
}
