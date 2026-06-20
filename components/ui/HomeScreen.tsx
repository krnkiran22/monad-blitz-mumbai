"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { MonadMark, MonadCoin } from "./MonadMark";

const MenuScene = dynamic(
  () => import("../game/MenuScene").then((m) => ({ default: m.MenuScene })),
  { ssr: false }
);

const CONTRACT_URL =
  "https://testnet.monadexplorer.com/address/0x9fDF1758D5EeA606C4f2b9870A8a90f2CcB5fe7f";

interface Props {
  walletAddress: string;
  monBalance: string;
  onPlay: () => void;
  onSettings: () => void;
  onConnect: () => void;
}

// Home screen built on the stellar_strike template: a light lavender page with
// a thick dark-bordered hero card, big high-contrast title on the left and a
// "play" content card on the lower right. Positions are easy to nudge later.
export function HomeScreen({ walletAddress, monBalance, onPlay, onSettings, onConnect }: Props) {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#E6E6FF]">
      {/* ── Top navbar ── */}
      <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-6 sm:px-10 h-[76px]">
        <div className="flex items-center gap-2.5">
          <MonadMark size={28} />
          <span className="font-black tracking-widest text-[#161B32] text-sm">MONAD</span>
          <span className="text-[#6246ea] text-xs font-mono px-2 py-0.5 rounded-full border border-[#161B32]/30 bg-white/50">
            TESTNET
          </span>
        </div>

        {walletAddress ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/60 rounded-full px-4 py-2 border border-[#161B32]/15">
              <MonadCoin size={18} />
              <span className="text-[#161B32] font-bold text-sm font-mono">{monBalance}</span>
              <span className="text-[#6246ea] text-xs font-bold">MON</span>
            </div>
            <div className="bg-white/60 rounded-full px-4 py-2 text-xs font-mono text-[#161B32] border border-[#161B32]/15">
              {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
            </div>
          </div>
        ) : (
          <button
            onClick={onConnect}
            className="bg-[#161B32] text-[#E6E6FF] rounded-full px-5 py-2 text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Connect Wallet
          </button>
        )}
      </header>

      {/* ── Hero card ── */}
      <div className="absolute inset-x-4 sm:inset-x-8 top-[84px] bottom-6 rounded-[28px] border-[6px] border-[#161B32] bg-[#CCD5FF] overflow-hidden shadow-2xl">
        {/* Live 3D agents as the hero */}
        <div className="absolute inset-0 z-0">
          <MenuScene />
        </div>

        {/* Title — top left */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute top-7 left-7 sm:top-10 sm:left-10 z-10 max-w-[60%] pointer-events-none"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="h-px w-8 bg-[#161B32]" />
            <span className="text-[#161B32] font-bold tracking-[0.3em] text-[11px] opacity-70">
              SEASON 01 · MONAD BLITZ
            </span>
          </div>
          <span className="inline-block bg-[#161B32] text-[#E6E6FF] px-5 py-2 rounded-2xl text-6xl sm:text-7xl font-black leading-none mb-3">
            BGMI
          </span>
          <p className="text-[#161B32] text-3xl sm:text-5xl font-black leading-[0.95] opacity-80">Battle Ground</p>
          <p className="text-[#161B32] text-3xl sm:text-5xl font-black leading-[0.95] opacity-80">Monad India</p>
        </motion.div>

        {/* Content / Play card — bottom right */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="absolute bottom-7 right-7 sm:bottom-10 sm:right-10 z-10 w-[300px] sm:w-[360px]"
        >
          <p className="inline-block text-[#161B32] bg-[#161B32]/5 px-4 py-1 rounded-full text-sm font-semibold mb-2">
            Pushing the limits of onchain gaming
          </p>
          <p className="text-[#161B32]/80 text-[13px] leading-relaxed mb-4">
            Three autonomous AI agents drop into a live arena and fight to the last one standing.
            Stake <span className="font-bold text-[#161B32]">MON</span> on your champion — winners
            are paid on-chain in <span className="font-bold text-[#161B32]">~400ms</span>.
          </p>
          <button
            onClick={onPlay}
            className="w-full bg-[#161B32] text-[#E6E6FF] py-3 rounded-full font-black text-lg tracking-wide hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            PLAY NOW
          </button>
          <div className="flex gap-2 mt-2">
            <button
              onClick={onSettings}
              className="flex-1 bg-white/60 border border-[#161B32]/15 text-[#161B32] py-2 rounded-full text-xs font-bold hover:bg-white transition-colors"
            >
              SETTINGS
            </button>
            <a
              href={CONTRACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center bg-white/60 border border-[#161B32]/15 text-[#161B32] py-2 rounded-full text-xs font-bold hover:bg-white transition-colors"
            >
              CONTRACT
            </a>
          </div>
        </motion.div>

        {/* Footer pill — bottom left */}
        <div className="absolute bottom-4 left-7 sm:left-10 z-10 flex items-center gap-2 text-[11px] text-[#161B32]/60">
          <span>Powered by</span>
          <MonadMark size={13} />
          <span className="font-bold">Monad</span>
          <span>· 10,000 TPS · 400ms blocks</span>
        </div>
      </div>
    </div>
  );
}
