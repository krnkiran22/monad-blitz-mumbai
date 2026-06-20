"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MonadMark, MonadCoin } from "./MonadMark";
import { AGENT_PERSONALITIES } from "../agent/brain";
import { useMultiplayer } from "../game/multiplayer";

const MAP_LIST = [
  { name: "Free Arena", file: "/models/map.glb", tag: "CLASSIC" },
  { name: "Knife Fight", file: "/models/knife_fight_map.glb", tag: "CQB" },
  { name: "Living Room", file: "/models/living_room.glb", tag: "INDOOR" },
  { name: "Grave House", file: "/models/grave_house_map.glb", tag: "HORROR" },
  { name: "Broken House", file: "/models/broken_house_map.glb", tag: "RUINS" },
];

interface Props {
  walletAddress: string;
  monBalance: string;
  onBack: () => void;
  onEnter: (mapFile: string) => void;
  onConnect: () => void;
}

export function LobbyScreen({ walletAddress, monBalance, onBack, onEnter, onConnect }: Props) {
  const { status, roomCode, isHost, playerCount, error, connect } = useMultiplayer();
  const [role, setRole] = useState<"none" | "host" | "client">("none");
  const [joinCode, setJoinCode] = useState("");
  const [mapIndex, setMapIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const map = MAP_LIST[mapIndex];
  const connecting = status === "connecting";
  const connected = status === "connected";

  const createRoom = () => {
    setRole("host");
    connect();
  };

  const joinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setRole("client");
    connect(code);
  };

  const copyCode = () => {
    if (!roomCode) return;
    navigator.clipboard?.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden monad-bg monad-grid flex flex-col">
      <div className="absolute top-0 -left-20 w-96 h-96 rounded-full bg-[#836ef9]/15 blur-[120px] animate-float" />
      <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-[#6246ea]/15 blur-[140px] animate-float" style={{ animationDelay: "1.5s" }} />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-bold">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          BACK
        </button>
        <div className="flex items-center gap-2.5">
          <MonadMark size={24} className="animate-spin-slow" />
          <span className="font-black tracking-widest text-white text-sm">BGMI LOBBY</span>
        </div>
        {walletAddress ? (
          <div className="flex items-center gap-2 glass rounded-full px-4 py-2">
            <MonadCoin size={18} />
            <span className="text-white font-bold text-sm font-mono">{monBalance}</span>
            <span className="text-[#a78bfa] text-xs font-bold">MON</span>
          </div>
        ) : (
          <button onClick={onConnect} className="glass rounded-full px-5 py-2 text-sm font-bold text-white hover:bg-[#836ef9]/20 transition-all">
            Connect Wallet
          </button>
        )}
      </header>

      {/* ─── ENTRY: pick create vs join ─────────────────────────────────────── */}
      {!connected && (
        <main className="relative z-10 flex-1 flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-3xl"
          >
            <div className="text-center mb-8">
              <h1 className="text-4xl font-black text-white mb-2">JOIN THE BATTLE</h1>
              <p className="text-gray-400 text-sm">Host a live arena or jump into a friend&apos;s room with a code.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Create */}
              <div className="glass rounded-2xl p-7 flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-[#836ef9]/20 flex items-center justify-center mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <h2 className="text-xl font-black text-white mb-1">CREATE ROOM</h2>
                <p className="text-gray-400 text-sm mb-6 flex-1">
                  You become the host. Pick the map, start the match, and share your room code so others can spectate the same fight live.
                </p>
                <button
                  onClick={createRoom}
                  disabled={connecting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#836ef9] to-[#6246ea] text-white font-black tracking-wide disabled:opacity-60 transition-opacity glow-purple"
                >
                  {connecting && role === "host" ? "CREATING…" : "CREATE ROOM"}
                </button>
              </div>

              {/* Join */}
              <div className="glass rounded-2xl p-7 flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-[#836ef9]/20 flex items-center justify-center mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                  </svg>
                </div>
                <h2 className="text-xl font-black text-white mb-1">JOIN ROOM</h2>
                <p className="text-gray-400 text-sm mb-4 flex-1">
                  Enter a room code to watch a host&apos;s match in real time and bet alongside the crowd.
                </p>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                  placeholder="ROOM CODE"
                  maxLength={12}
                  className="w-full mb-3 px-4 py-3 rounded-xl bg-black/30 border border-[#836ef9]/30 text-white font-mono tracking-widest text-center text-lg focus:outline-none focus:border-[#836ef9] uppercase placeholder:text-gray-600"
                />
                <button
                  onClick={joinRoom}
                  disabled={connecting || !joinCode.trim()}
                  className="w-full py-3.5 rounded-xl glass text-white font-black tracking-wide hover:bg-[#836ef9]/20 disabled:opacity-50 transition-all"
                >
                  {connecting && role === "client" ? "JOINING…" : "JOIN ROOM"}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-center text-red-400 text-sm mt-5">
                {error.includes("gameId")
                  ? "PlayroomKit needs a free gameId. Add NEXT_PUBLIC_PLAYROOM_GAME_ID to .env.local (see README)."
                  : `Connection error: ${error}`}
              </p>
            )}
          </motion.div>
        </main>
      )}

      {/* ─── CONNECTED: room panel ───────────────────────────────────────────── */}
      {connected && (
        <main className="relative z-10 flex-1 flex items-center justify-center px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6 w-full max-w-5xl">
            {/* Left: room + roster */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4">
              <div className="glass rounded-2xl p-6">
                <p className="text-xs text-gray-400 font-bold tracking-widest mb-2">ROOM CODE</p>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-white font-mono tracking-wider text-glow">{roomCode ?? "····"}</span>
                  <button
                    onClick={copyCode}
                    className="glass rounded-lg px-3 py-1.5 text-xs font-bold text-[#a78bfa] hover:text-white transition-colors"
                  >
                    {copied ? "COPIED" : "COPY"}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-gray-400">
                    {playerCount} {playerCount === 1 ? "player" : "players"} in room · {isHost ? "you are HOST" : "spectator"}
                  </span>
                </div>
              </div>

              <div className="glass rounded-2xl p-5">
                <p className="text-xs text-gray-400 font-bold tracking-widest mb-3">COMBATANTS</p>
                <div className="space-y-3">
                  {AGENT_PERSONALITIES.map((a, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-black text-sm"
                        style={{ background: a.color, boxShadow: `0 0 12px ${a.color}` }}
                      >
                        {a.name[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-bold text-sm leading-none">{a.name}</p>
                        <p className="text-gray-500 text-xs">{a.weapon} · {(a.aggression * 100).toFixed(0)}% aggression</p>
                      </div>
                      <span className="text-[10px] font-bold text-green-400">READY</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Right: map selection (host) / spectator notice (client) */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass rounded-2xl p-6 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400 font-bold tracking-widest">{isHost ? "SELECT MAP" : "MAP"}</p>
                {isHost && <span className="text-xs text-[#a78bfa] font-mono">0{mapIndex + 1} / 0{MAP_LIST.length}</span>}
              </div>

              <div className="relative flex-1 rounded-xl overflow-hidden bg-gradient-to-br from-[#1a1033] to-[#0a0613] border border-[#836ef9]/20 min-h-[240px] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-3 opacity-30">🗺️</div>
                  <h2 className="text-3xl font-black text-white italic tracking-tight">{map.name}</h2>
                  <span className="inline-block mt-2 text-[10px] font-black tracking-widest text-[#a78bfa] px-3 py-1 rounded-full border border-[#836ef9]/30">
                    {map.tag}
                  </span>
                </div>
                {isHost && (
                  <>
                    <button
                      onClick={() => setMapIndex((p) => (p === 0 ? MAP_LIST.length - 1 : p - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full glass flex items-center justify-center text-white hover:bg-[#836ef9]/30 transition-all"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => setMapIndex((p) => (p === MAP_LIST.length - 1 ? 0 : p + 1))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full glass flex items-center justify-center text-white hover:bg-[#836ef9]/30 transition-all"
                    >
                      ›
                    </button>
                  </>
                )}
              </div>

              {isHost && (
                <div className="grid grid-cols-5 gap-2 mt-3">
                  {MAP_LIST.map((m, i) => (
                    <button
                      key={m.name}
                      onClick={() => setMapIndex(i)}
                      className={`py-2 rounded-lg text-[10px] font-bold transition-all ${
                        i === mapIndex ? "bg-[#836ef9] text-white" : "glass text-gray-400 hover:text-white"
                      }`}
                    >
                      {m.name.split(" ")[0]}
                    </button>
                  ))}
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onEnter(map.file)}
                className="mt-4 relative"
              >
                <span className="absolute inset-0 rounded-2xl bg-[#836ef9] blur-lg opacity-50" />
                <span className="relative flex items-center justify-center gap-3 w-full py-5 rounded-2xl bg-gradient-to-r from-[#836ef9] to-[#6246ea] text-white font-black text-xl tracking-widest">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  {isHost ? "ENTER ARENA" : "WATCH MATCH"}
                </span>
              </motion.button>
              {!isHost && (
                <p className="text-center text-gray-500 text-xs mt-2">The host controls the map &amp; match start.</p>
              )}
            </motion.div>
          </div>
        </main>
      )}

      <footer className="relative z-10 flex items-center justify-center gap-2 pb-5 text-xs text-gray-500">
        <MonadMark size={14} />
        <span>Match settles on <span className="text-[#836ef9] font-bold">Monad Testnet</span> · winners paid in MON</span>
      </footer>
    </div>
  );
}
