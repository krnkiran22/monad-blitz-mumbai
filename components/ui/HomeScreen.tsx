"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { MonadMark, MonadCoin } from "./MonadMark";

const MenuScene = dynamic(
  () => import("../game/MenuScene").then((m) => ({ default: m.MenuScene })),
  { ssr: false }
);

interface Props {
  walletAddress: string;
  monBalance: string;
  onPlay: () => void;
  onSettings: () => void;
  onConnect: () => void;
}

export function HomeScreen({ walletAddress, monBalance, onPlay, onSettings, onConnect }: Props) {
  return (
    <div
      className="relative h-screen w-screen overflow-hidden"
      style={{ background: "linear-gradient(160deg, #3a2a82 0%, #241657 50%, #160d38 100%)" }}
    >
      {/* Live 3D battlefield background */}
      <div className="absolute inset-0 z-0">
        <MenuScene />
      </div>

      {/* Top HUD bar */}
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <MonadMark size={28} className="animate-spin-slow" />
          <span className="font-black tracking-widest text-white text-sm">MONAD</span>
          <span className="text-[#836ef9] text-xs font-mono px-2 py-0.5 rounded-full border border-[#836ef9]/40 bg-black/30">
            TESTNET
          </span>
        </div>

        {walletAddress ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 glass rounded-full px-4 py-2">
              <MonadCoin size={20} />
              <span className="text-white font-bold text-sm font-mono">{monBalance}</span>
              <span className="text-[#a78bfa] text-xs font-bold">MON</span>
            </div>
            <div className="glass rounded-full px-4 py-2 text-xs font-mono text-gray-300">
              {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
            </div>
          </div>
        ) : (
          <button
            onClick={onConnect}
            className="glass rounded-full px-5 py-2 text-sm font-bold text-white hover:bg-[#836ef9]/20 transition-all"
          >
            Connect Wallet
          </button>
        )}
      </header>

      {/* Hero / menu */}
      <main className="absolute inset-0 z-10 flex flex-col justify-center px-8 sm:px-16">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-xl"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="h-px w-10 bg-[#836ef9]" />
            <span className="text-[#a78bfa] font-bold tracking-[0.35em] text-xs">SEASON 01 · MONAD BLITZ</span>
          </div>

          <h1 className="text-7xl sm:text-8xl font-black leading-[0.85] mb-3 drop-shadow-[0_4px_30px_rgba(131,110,249,0.5)]">
            <span className="shimmer">BGMI</span>
          </h1>
          <h2 className="text-base sm:text-xl font-bold tracking-[0.28em] text-white/90 title-stroke mb-5">
            BATTLE GROUND MONAD INDIA
          </h2>

          <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-9 max-w-md">
            Three autonomous AI agents drop into a live arena and fight to the last one standing.
            Stake <span className="text-[#a78bfa] font-bold">MON</span> on your champion —
            winners are paid on-chain in <span className="text-white font-bold">~400ms</span>.
          </p>

          {/* Primary actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-3">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={onPlay}
              className="group relative"
            >
              <span className="absolute inset-0 rounded-2xl bg-[#836ef9] blur-xl opacity-60 group-hover:opacity-90 transition-opacity" />
              <span className="relative flex items-center justify-center gap-3 px-12 py-5 rounded-2xl bg-gradient-to-r from-[#836ef9] to-[#6246ea] text-white font-black text-2xl tracking-wider shadow-2xl">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                START
              </span>
            </motion.button>

            <button
              onClick={onSettings}
              className="flex items-center justify-center gap-2 glass rounded-2xl px-7 py-5 text-white font-bold text-sm hover:bg-white/10 transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              SETTINGS
            </button>

            <a
              href="https://testnet.monadexplorer.com/address/0x9fDF1758D5EeA606C4f2b9870A8a90f2CcB5fe7f"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 glass rounded-2xl px-7 py-5 text-white font-bold text-sm hover:bg-white/10 transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <path d="M15 3h6v6M10 14L21 3" />
              </svg>
              CONTRACT
            </a>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-4 left-0 right-0 z-10 flex items-center justify-center gap-2 text-xs text-gray-400">
        <span>Powered by</span>
        <MonadMark size={14} />
        <span className="font-bold text-[#a78bfa]">Monad</span>
        <span>· 10,000 TPS · 400ms blocks</span>
      </footer>
    </div>
  );
}
