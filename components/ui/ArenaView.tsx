"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect } from "react";
import { useMultiplayerState } from "playroomkit";
import { BettingPanel } from "./BettingPanel";
import { Dashboard } from "./Dashboard";
import { MonadMark, MonadCoin } from "./MonadMark";
import { useMultiplayer } from "../game/multiplayer";
import type { ArenaState } from "../chain/useArena";
import type { ArenaSettings } from "../game/Arena";

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
  settings: { betStep: string };
  arenaSettings: ArenaSettings;
  arenaState: ArenaState;
  walletAddress: string;
  monBalance: string;
  loading: boolean;
  AGENT_COLORS: string[];
  onBack: () => void;
  onOpenSettings: () => void;
  onConnectWallet: () => void;
  onBet: (agentId: number, amount: string) => void;
  onClaim: (matchId: bigint) => void;
}

export function ArenaView({
  initialMapFile,
  settings,
  arenaSettings,
  arenaState,
  walletAddress,
  monBalance,
  loading,
  AGENT_COLORS,
  onBack,
  onOpenSettings,
  onConnectWallet,
  onBet,
  onClaim,
}: Props) {
  const { isHost, roomCode, playerCount } = useMultiplayer();

  // Host-authoritative match state, mirrored to every spectator in the room.
  const [matchRunning, setMatchRunning] = useMultiplayerState("matchRunning", false);
  const [winner, setWinner] = useMultiplayerState<number | null>("winner", null);
  const [mapFile, setMapFile] = useMultiplayerState("mapFile", initialMapFile);

  // Host publishes its chosen map once on entry.
  useEffect(() => {
    if (isHost) setMapFile(initialMapFile);
  }, [isHost, initialMapFile, setMapFile]);

  const handleMatchEnd = useCallback(
    (winnerId: number) => {
      if (!isHost) return;
      setMatchRunning(false);
      setWinner(winnerId);
    },
    [isHost, setMatchRunning, setWinner]
  );

  const handleStartMatch = useCallback(() => {
    if (!isHost) return;
    setWinner(null);
    setMatchRunning(true);
  }, [isHost, setMatchRunning, setWinner]);

  return (
    <div className="h-screen monad-bg text-white flex flex-col">
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
        <div className="flex-1 min-h-[420px] lg:min-h-0 relative">
          <ArenaScene
            onMatchEnd={handleMatchEnd}
            running={matchRunning}
            isHost={isHost}
            mapFile={mapFile}
            settings={arenaSettings}
          />

          {!matchRunning && winner === null && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center glass rounded-2xl p-8">
                <h2 className="text-2xl font-black mb-2 shimmer">READY TO BATTLE</h2>
                <p className="text-gray-400 text-sm max-w-xs">
                  {isHost
                    ? "3 autonomous AI agents fight to the death. Hit START MATCH — everyone in your room watches the same fight live."
                    : "Waiting for the host to start the match. You'll watch the same fight in real time."}
                </p>
              </div>
            </div>
          )}

          {winner !== null && !matchRunning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center glass rounded-2xl p-8 border-2" style={{ borderColor: AGENT_COLORS[winner] }}>
                <div className="text-5xl mb-3">🏆</div>
                <h2 className="text-3xl font-black mb-1" style={{ color: AGENT_COLORS[winner] }}>
                  {["ALPHA", "BETA", "GAMMA"][winner]} WINS
                </h2>
                <p className="text-gray-300 text-sm">Payout recorded on Monad chain</p>
              </div>
            </div>
          )}

          {matchRunning && (
            <div className="absolute top-4 left-4 flex items-center gap-2 glass rounded-full px-3 py-1.5 border border-red-500/30">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-red-400">LIVE</span>
            </div>
          )}
        </div>

        <div className="w-full lg:w-[340px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#836ef9]/15 overflow-y-auto bg-black/20">
          <div className="p-4 space-y-6">
            <BettingPanel
              arenaState={arenaState}
              walletAddress={walletAddress}
              loading={loading}
              defaultBet={settings.betStep}
              onConnect={onConnectWallet}
              onBet={onBet}
              colors={AGENT_COLORS}
            />
            <div className="border-t border-[#836ef9]/15" />
            <Dashboard
              arenaState={arenaState}
              matchRunning={matchRunning}
              winner={winner}
              walletAddress={walletAddress}
              loading={loading}
              isHost={isHost}
              onClaim={() => onClaim(arenaState.matchId)}
              onStartMatch={handleStartMatch}
              colors={AGENT_COLORS}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
