"use client";

import { useEffect, useRef, useState } from "react";
import { Environment } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
 import { myPlayer, onPlayerJoin } from "playroomkit";
import { FriendsMap } from "./FriendsMap";
import { FriendsCharacterController } from "./FriendsCharacterController";
import { FriendsBullet, BulletData } from "./FriendsBullet";
import { FriendsBulletHit } from "./FriendsBulletHit";
/* eslint-disable @typescript-eslint/no-explicit-any */

const COLORS = ["#ff5a5a", "#5aa0ff", "#5aff8c", "#ffce4a", "#c46bff", "#ff8c3b"];
const WEAPONS = ["AK", "SMG", "Pistol", "Shotgun", "Sniper"];

interface HitFx {
  id: string;
  position: { x: number; y: number; z: number };
}

// Drop bullets that never hit anything so they don't pile up in player state.
const BULLET_LIFETIME = 2000; // ms

export function FriendsExperience({ mapFile, onReady }: { mapFile: string; onReady?: () => void }) {
  const [players, setPlayers] = useState<any[]>([]);
  const [hits, setHits] = useState<HitFx[]>([]);
  const [bullets, setBullets] = useState<BulletData[]>([]);
  const bulletSig = useRef("");

  // This component only commits after Suspense resolves (map GLTF + HDR
  // environment loaded), so this is a reliable "scene is ready" signal that
  // lets the page lift its dark loading cover and avoid the light-sky flash.
  useEffect(() => {
    onReady?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsub = onPlayerJoin((state: any) => {
      // Seed each player's networked state once.
      const idx = Math.floor(Math.random() * COLORS.length);
      state.setState("health", 100);
      state.setState("dead", false);
      if (state.id === myPlayer()?.id) {
        state.setState("profile", {
          name: "Player",
          color: COLORS[idx],
          weapon: WEAPONS[Math.floor(Math.random() * WEAPONS.length)],
        });
        state.setState("weapon", state.getState("profile")?.weapon || WEAPONS[1]);
      }
      setPlayers((prev) => (prev.some((p) => p.id === state.id) ? prev : [...prev, state]));
      state.onQuit(() => setPlayers((prev) => prev.filter((p) => p.id !== state.id)));
    });
    return () => {
      // onPlayerJoin returns an unsubscribe in recent SDKs
      if (typeof unsub === "function") unsub();
    };
  }, []);

  const onFire = (bullet: BulletData) => {
    const shooter = players.find((p) => p.id === bullet.player);
    if (!shooter) return;
    const current = shooter.getState("bullets") || [];
    shooter.setState("bullets", [...current, bullet]);
  };

  const onHit = (bulletId: string, position: { x: number; y: number; z: number }) => {
    const ownerId = bulletId.split("-")[0];
    const shooter = players.find((p) => p.id === ownerId);
    if (shooter) {
      const current = shooter.getState("bullets") || [];
      shooter.setState("bullets", current.filter((b: BulletData) => b.id !== bulletId));
    }
    setHits((prev) => [...prev, { id: bulletId, position }]);
  };

  const onKilled = () => {
    // Scoring is intentionally light for the open friends mode.
  };

  // Bullets live in each player's networked state, which does NOT re-render this
  // component on change. Poll it every frame, expire stale shots, and push to
  // React state only when the live set actually changes.
  useFrame(() => {
    const now = Date.now();
    let all: BulletData[] = [];
    for (const p of players) {
      const list: BulletData[] = p.getState("bullets") || [];
      if (list.length === 0) continue;
      const alive = list.filter((b) => {
        const ts = Number(b.id.split("-").pop());
        return !ts || now - ts < BULLET_LIFETIME;
      });
      if (alive.length !== list.length) p.setState("bullets", alive);
      all = all.concat(alive);
    }
    const sig = all.map((b) => b.id).join(",");
    if (sig !== bulletSig.current) {
      bulletSig.current = sig;
      setBullets(all);
    }
  });

  return (
    <>
      <Environment preset="sunset" />
      <ambientLight intensity={0.8} />
      <directionalLight position={[25, 30, -20]} intensity={1.1} castShadow />

      <FriendsMap mapFile={mapFile} />

      {players.map((state) => (
        <FriendsCharacterController
          key={state.id}
          state={state}
          userPlayer={state.id === myPlayer()?.id}
          onFire={onFire}
          onKilled={onKilled}
        />
      ))}

      {bullets.map((bullet) => (
        <FriendsBullet key={bullet.id} {...bullet} onHit={(pos) => onHit(bullet.id, pos)} />
      ))}

      {hits.map((hit) => (
        <FriendsBulletHit
          key={hit.id}
          position={hit.position}
          onEnded={() => setHits((prev) => prev.filter((h) => h.id !== hit.id))}
        />
      ))}
    </>
  );
}
