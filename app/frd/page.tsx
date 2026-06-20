"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { insertCoin, getRoomCode } from "playroomkit";

const FriendsGame = dynamic(
  () => import("../../components/frd/FriendsGame").then((m) => ({ default: m.FriendsGame })),
  { ssr: false }
);

const MAPS = [
  { name: "Free Arena", file: "/models/map.glb" },
  { name: "Knife Fight", file: "/models/knife_fight_map.glb" },
  { name: "Living Room", file: "/models/living_room.glb" },
];

type Phase = "start" | "rooms" | "playing";

export default function FriendsPage() {
  const [phase, setPhase] = useState<Phase>("start");
  const [joinCode, setJoinCode] = useState("");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [mapIndex, setMapIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gameId = process.env.NEXT_PUBLIC_PLAYROOM_GAME_ID;

  const enter = async (code?: string) => {
    setBusy(true);
    setError(null);
    try {
      await insertCoin({
        skipLobby: true,
        maxPlayersPerRoom: 8,
        ...(code ? { roomCode: code } : {}),
        ...(gameId ? { gameId } : {}),
      });
      setRoomCode(getRoomCode() ?? code ?? null);
      setPhase("playing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect");
      setBusy(false);
    }
  };

  // ── Playing: full-screen game + minimal HUD ──
  if (phase === "playing") {
    return (
      <div className="fixed inset-0 bg-black">
        <FriendsGame mapFile={MAPS[mapIndex].file} />

        <div className="absolute top-4 left-4 flex items-center gap-3 z-10">
          <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-gray-300 font-bold">ROOM</span>
            <span className="text-white font-bold text-sm font-mono tracking-widest">{roomCode}</span>
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(roomCode || "")}
            className="glass rounded-full px-3 py-2 text-xs font-bold text-white hover:bg-white/10 transition-colors"
          >
            Copy code
          </button>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 glass rounded-full px-5 py-2 flex items-center gap-4 text-[11px] text-gray-300 font-bold">
          <span><span className="text-white">WASD</span> move</span>
          <span><span className="text-white">F / Click</span> shoot</span>
          <span><span className="text-white">Space</span> jump</span>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="absolute top-4 right-4 z-10 glass rounded-full px-4 py-2 text-xs font-bold text-white hover:bg-white/10 transition-colors"
        >
          Leave
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#E6E6FF] flex items-center justify-center">
      <div className="absolute inset-x-4 sm:inset-x-8 top-6 bottom-6 rounded-[28px] border-[6px] border-[#161B32] bg-[#CCD5FF]" />

      <div className="relative z-10 text-center px-6">
        <p className="text-[#161B32]/70 font-bold tracking-[0.35em] text-xs mb-3">PLAY WITH FRIENDS</p>
        <h1 className="text-6xl sm:text-7xl font-black text-[#161B32] mb-2 leading-none">FRIENDS ARENA</h1>
        <p className="text-[#161B32]/70 text-sm mb-8 max-w-md mx-auto">
          No wallet, no betting — just create a room, share the code, and battle your friends in the arena.
        </p>

        {phase === "start" && (
          <button
            onClick={() => setPhase("rooms")}
            className="bg-[#161B32] text-[#E6E6FF] px-12 py-4 rounded-full font-black text-2xl tracking-wider hover:opacity-90 transition-opacity inline-flex items-center gap-3"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            START
          </button>
        )}

        {phase === "rooms" && (
          <div className="max-w-md mx-auto space-y-5">
            {/* Map picker */}
            <div className="flex items-center justify-center gap-2">
              {MAPS.map((m, i) => (
                <button
                  key={m.file}
                  onClick={() => setMapIndex(i)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                    mapIndex === i ? "bg-[#161B32] text-[#E6E6FF]" : "bg-white/60 text-[#161B32] hover:bg-white"
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>

            <button
              onClick={() => enter()}
              disabled={busy}
              className="w-full bg-[#161B32] text-[#E6E6FF] py-4 rounded-2xl font-black text-lg tracking-wide hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {busy ? "Creating room…" : "Create Room"}
            </button>

            <div className="flex items-center gap-3">
              <span className="flex-1 h-px bg-[#161B32]/20" />
              <span className="text-[10px] text-[#161B32]/50 font-bold tracking-widest">OR JOIN</span>
              <span className="flex-1 h-px bg-[#161B32]/20" />
            </div>

            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                className="flex-1 bg-white/70 border-2 border-[#161B32]/20 rounded-2xl px-4 py-3 text-[#161B32] font-bold font-mono tracking-widest text-center focus:outline-none focus:border-[#161B32]"
              />
              <button
                onClick={() => enter(joinCode.trim())}
                disabled={busy || joinCode.trim().length < 3}
                className="bg-white/70 border-2 border-[#161B32]/20 text-[#161B32] px-6 rounded-2xl font-black hover:bg-white disabled:opacity-50 transition-colors"
              >
                Join
              </button>
            </div>

            {error && <p className="text-red-600 text-xs font-bold">{error}</p>}

            <button
              onClick={() => setPhase("start")}
              className="text-[#161B32]/60 text-xs font-bold hover:text-[#161B32] transition-colors"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
