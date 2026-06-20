"use client";

import { useState } from "react";
import { HomeScreen } from "@/components/ui/HomeScreen";
import { LobbyScreen } from "@/components/ui/LobbyScreen";
import { ArenaView } from "@/components/ui/ArenaView";
import { SettingsModal, GameSettings } from "@/components/ui/SettingsModal";
import { MultiplayerProvider } from "@/components/game/multiplayer";
import { useArena } from "@/components/chain/useArena";

type Screen = "home" | "lobby" | "arena";

function Game() {
  const [screen, setScreen] = useState<Screen>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapFile, setMapFile] = useState("/models/map.glb");
  const [settings, setSettings] = useState<GameSettings>({
    cameraAutoRotate: true,
    showHealthBars: true,
    matchSpeed: 1,
    betStep: "0.01",
  });

  const {
    state,
    loading,
    walletAddress,
    monBalance,
    connectWallet,
    placeBet,
    claimWinnings,
    openBetting,
    lockBetting,
    settleMatch,
    AGENT_COLORS,
  } = useArena();

  const arenaSettings = {
    cameraAutoRotate: settings.cameraAutoRotate,
    showHealthBars: settings.showHealthBars,
    matchSpeed: settings.matchSpeed,
  };

  if (screen === "home") {
    return (
      <>
        <HomeScreen
          walletAddress={walletAddress}
          monBalance={monBalance}
          onPlay={() => setScreen("lobby")}
          onSettings={() => setSettingsOpen(true)}
          onConnect={connectWallet}
        />
        <SettingsModal
          open={settingsOpen}
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      </>
    );
  }

  if (screen === "lobby") {
    return (
      <LobbyScreen
        walletAddress={walletAddress}
        monBalance={monBalance}
        onBack={() => setScreen("home")}
        onConnect={connectWallet}
        onEnter={(selectedMap) => {
          setMapFile(selectedMap);
          setScreen("arena");
        }}
      />
    );
  }

  return (
    <>
      <ArenaView
        initialMapFile={mapFile}
        settings={{ betStep: settings.betStep }}
        arenaSettings={arenaSettings}
        arenaState={state}
        walletAddress={walletAddress}
        monBalance={monBalance}
        loading={loading}
        AGENT_COLORS={AGENT_COLORS}
        onBack={() => setScreen("lobby")}
        onOpenSettings={() => setSettingsOpen(true)}
        onConnectWallet={connectWallet}
        onBet={placeBet}
        onClaim={claimWinnings}
        onOpenBetting={openBetting}
        onLockBetting={lockBetting}
        onSettleMatch={settleMatch}
      />
      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}

export default function Home() {
  return (
    <MultiplayerProvider>
      <Game />
    </MultiplayerProvider>
  );
}
