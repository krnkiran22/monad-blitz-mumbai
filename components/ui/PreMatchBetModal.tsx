"use client";

import { useState } from "react";
import { MonadCoin } from "./MonadMark";
import type { ArenaState } from "../chain/useArena";

interface Props {
  open: boolean;
  arenaState: ArenaState;
  names: string[];
  colors: string[];
  walletAddress: string;
  monBalance: string;
  loading: boolean;
  defaultBet: string;
  onConnect: () => void;
  onOpenBetting: () => void;
  onPlaceBet: (agentId: number, amount: string) => void;
  onStartFight: () => void;
  onClose: () => void;
}

const QUICK = ["0.1", "0.5", "1"];

export function PreMatchBetModal({
  open,
  arenaState,
  names,
  colors,
  walletAddress,
  monBalance,
  loading,
  defaultBet,
  onConnect,
  onOpenBetting,
  onPlaceBet,
  onStartFight,
  onClose,
}: Props) {
  // Default to a 0.5 MON stake (matches the intended demo flow); fall back to
  // the configured bet step only if it's already a meaningful size.
  const [amount, setAmount] = useState(
    defaultBet && parseFloat(defaultBet) >= 0.1 ? defaultBet : "0.5"
  );

  if (!open) return null;

  const { bettingOpen, myBets, totalPot, isOwner } = arenaState;
  const myTotal = myBets.reduce((s, b) => s + parseFloat(b || "0"), 0);
  const hasBet = myTotal > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#836ef9]/30 bg-[#0f0a1f] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">PLACE YOUR BETS</h2>
            <p className="text-[11px] text-gray-400">Back an agent before the fight — winners claim the pot</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Wallet */}
          {!walletAddress ? (
            <button
              onClick={onConnect}
              className="w-full py-3 rounded-xl bg-[#836ef9] hover:bg-[#7058f0] font-bold text-white transition-colors"
            >
              Connect Wallet to Bet
            </button>
          ) : (
            <div className="flex items-center justify-between glass rounded-xl px-4 py-2.5">
              <button
                onClick={onConnect}
                title="Switch account"
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white font-mono transition-colors"
              >
                {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                <span className="text-[10px] font-sans font-bold text-[#836ef9]">switch</span>
              </button>
              <span className="flex items-center gap-1.5 text-white font-bold text-sm">
                <MonadCoin size={16} /> {monBalance} MON
              </span>
            </div>
          )}

          {walletAddress && !isOwner && (
            <p className="text-[11px] text-amber-400 bg-amber-400/10 rounded-lg px-3 py-2">
              This wallet isn’t the contract owner, so it can’t open/settle rounds. Connect the deployer wallet to run the match.
            </p>
          )}

          {/* Step 1: open the on-chain round */}
          {walletAddress && !bettingOpen && (
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-300">Open an on-chain betting round to start staking MON.</p>
              <button
                onClick={onOpenBetting}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#836ef9] hover:bg-[#7058f0] disabled:opacity-50 font-bold text-white transition-colors"
              >
                {loading ? "Opening…" : "Open Betting Round"}
              </button>
            </div>
          )}

          {/* Step 2: choose stake + bet on agents */}
          {walletAddress && bettingOpen && (
            <>
              <div>
                <label className="text-[11px] font-bold text-gray-400 tracking-widest">STAKE PER BET (MON)</label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="number"
                    min="0.001"
                    step="0.1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-[#836ef9]"
                  />
                  {QUICK.map((q) => (
                    <button
                      key={q}
                      onClick={() => setAmount(q)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                        amount === q ? "bg-[#836ef9] text-white" : "bg-white/5 text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {names.map((name, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 border"
                    style={{ borderColor: `${colors[i]}55`, background: `${colors[i]}11` }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colors[i] }} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{name}</p>
                        <p className="text-[10px] text-gray-400">
                          my bet: {parseFloat(myBets[i] || "0").toFixed(2)} MON
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onPlaceBet(i, amount)}
                      disabled={loading || !amount || parseFloat(amount) <= 0}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50 transition-transform hover:scale-105"
                      style={{ background: colors[i] }}
                    >
                      Bet {amount}
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs glass rounded-xl px-4 py-2.5">
                <span className="text-gray-400">
                  Total pot: <span className="text-white font-bold">{parseFloat(totalPot).toFixed(2)} MON</span>
                </span>
                <span className="text-gray-400">
                  My stake: <span className="text-white font-bold">{myTotal.toFixed(2)} MON</span>
                </span>
              </div>

              <button
                onClick={onStartFight}
                disabled={loading || !hasBet}
                className="w-full py-3 rounded-xl bg-linear-to-r from-[#836ef9] to-[#a78bfa] hover:opacity-90 disabled:opacity-40 font-black text-white tracking-wide transition-opacity"
              >
                {loading ? "Please wait…" : hasBet ? "LOCK BETS & START FIGHT" : "Place at least one bet"}
              </button>
            </>
          )}

          {/* Always allow starting without betting (pure spectating). */}
          <button
            onClick={onStartFight}
            disabled={loading}
            className="w-full text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            Skip betting &amp; just watch
          </button>
        </div>
      </div>
    </div>
  );
}
