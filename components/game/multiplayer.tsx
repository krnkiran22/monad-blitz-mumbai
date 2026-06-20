"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  insertCoin,
  getRoomCode,
  useIsHost,
  usePlayersList,
} from "playroomkit";

type ConnStatus = "idle" | "connecting" | "connected" | "error";

interface MultiplayerCtx {
  status: ConnStatus;
  roomCode: string | null;
  isHost: boolean;
  playerCount: number;
  error: string | null;
  /** Create a room (no code) or join an existing one (code provided). */
  connect: (roomCode?: string) => Promise<void>;
}

const Ctx = createContext<MultiplayerCtx | null>(null);

export function MultiplayerProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnStatus>("idle");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [playerCount, setPlayerCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const connect = useCallback(async (code?: string) => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStatus("connecting");
    setError(null);
    try {
      const gameId = process.env.NEXT_PUBLIC_PLAYROOM_GAME_ID;
      await insertCoin({
        skipLobby: true,
        maxPlayersPerRoom: 8,
        ...(code ? { roomCode: code } : {}),
        ...(gameId ? { gameId } : {}),
      });
      setRoomCode(getRoomCode() ?? code ?? null);
      setStatus("connected");
    } catch (e) {
      startedRef.current = false;
      setError(e instanceof Error ? e.message : "Failed to connect to room");
      setStatus("error");
    }
  }, []);

  return (
    <Ctx.Provider value={{ status, roomCode, isHost, playerCount, error, connect }}>
      {children}
      {status === "connected" && (
        <RoomSubscriber onHost={setIsHost} onCount={setPlayerCount} />
      )}
    </Ctx.Provider>
  );
}

/**
 * Lives only while connected so the PlayroomKit hooks are never called before
 * insertCoin() has resolved. Pushes host/player-count changes up to the provider.
 */
function RoomSubscriber({
  onHost,
  onCount,
}: {
  onHost: (v: boolean) => void;
  onCount: (n: number) => void;
}) {
  const host = useIsHost();
  const players = usePlayersList(true);

  useEffect(() => {
    onHost(!!host);
  }, [host, onHost]);

  useEffect(() => {
    onCount(Array.isArray(players) && players.length ? players.length : 1);
  }, [players, onCount]);

  return null;
}

export function useMultiplayer(): MultiplayerCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMultiplayer must be used within <MultiplayerProvider>");
  return ctx;
}
