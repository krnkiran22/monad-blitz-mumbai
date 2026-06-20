"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Environment, Billboard } from "@react-three/drei";
import { getState, setState } from "playroomkit";
import * as THREE from "three";
import {
  createBots,
  tickBot,
  botAnimation,
  snapshotBots,
  applyBotSnapshot,
  BotState,
  AGENT_PERSONALITIES,
} from "../agent/brain";
import { CharacterSoldier } from "./CharacterSoldier";
import { GameMap } from "./GameMap";

export interface ArenaSettings {
  cameraAutoRotate: boolean;
  showHealthBars: boolean;
  matchSpeed: number;
}

const DEFAULT_SETTINGS: ArenaSettings = {
  cameraAutoRotate: true,
  showHealthBars: true,
  matchSpeed: 1,
};

const MAX_BULLETS = 80;
const SNAPSHOT_INTERVAL = 70; // ms between host broadcasts (~14 Hz)

interface BulletData {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
}

// ─── One AI soldier (reads from the shared bots ref, host or client) ──────────
function AgentSoldier({
  index,
  botsRef,
  showHealthBar,
}: {
  index: number;
  botsRef: React.MutableRefObject<BotState[]>;
  showHealthBar: boolean;
}) {
  const posGroup = useRef<THREE.Group>(null);
  const rotGroup = useRef<THREE.Group>(null);
  const healthBar = useRef<THREE.Mesh>(null);
  const [anim, setAnim] = useState("Idle");
  const personality = AGENT_PERSONALITIES[index];

  useFrame(() => {
    const bot = botsRef.current[index];
    if (!bot || !posGroup.current || !rotGroup.current) return;

    posGroup.current.position.set(bot.pos.x, 0, bot.pos.z);
    rotGroup.current.rotation.y = bot.angle;

    const nextAnim = botAnimation(bot);
    if (nextAnim !== anim) setAnim(nextAnim);

    if (healthBar.current) {
      const hp = Math.max(0, bot.health) / 100;
      healthBar.current.scale.x = hp;
      healthBar.current.visible = showHealthBar && !bot.dead;
    }
  });

  return (
    <group ref={posGroup}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.55, 0.75, 32]} />
        <meshBasicMaterial color={personality.color} transparent opacity={0.55} />
      </mesh>

      <group ref={rotGroup}>
        <Suspense fallback={null}>
          <CharacterSoldier
            color={personality.color}
            animation={anim}
            weapon={personality.weapon}
            scale={1}
          />
        </Suspense>
      </group>

      <Billboard position={[0, 2.5, 0]}>
        <Text fontSize={0.32} color={personality.color} anchorX="center" outlineWidth={0.02} outlineColor="#000">
          {personality.name}
        </Text>
      </Billboard>

      <Billboard position={[0, 2.15, 0]}>
        <group>
          <mesh>
            <planeGeometry args={[1, 0.1]} />
            <meshBasicMaterial color="#000" transparent opacity={0.5} />
          </mesh>
          <mesh ref={healthBar} position={[0, 0, 0.01]}>
            <planeGeometry args={[1, 0.1]} />
            <meshBasicMaterial color={personality.color} />
          </mesh>
        </group>
      </Billboard>
    </group>
  );
}

// ─── Bullet system: spawns tracers from shooting bots + advances them ─────────
// Runs identically on host and clients, driven purely by the (synced) bots ref,
// so everyone in the room sees matching gunfire without streaming each bullet.
function BulletSystem({
  botsRef,
  bulletsRef,
  running,
}: {
  botsRef: React.MutableRefObject<BotState[]>;
  bulletsRef: React.MutableRefObject<BulletData[]>;
  running: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D());
  const lastFire = useRef<number[]>([0, 0, 0]);

  useFrame((_, rawDelta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dt = Math.min(rawDelta, 0.05);
    const bots = botsRef.current;
    const bullets = bulletsRef.current;
    const now = performance.now();

    // Spawn cosmetic tracers for any bot that is shooting.
    if (running) {
      bots.forEach((bot, i) => {
        if (bot.dead || !bot.shooting) return;
        const target = bots[bot.target];
        if (!target || target.dead) return;
        if (now - lastFire.current[i] < bot.personality.fireRate) return;
        lastFire.current[i] = now;

        const slot = bullets.findIndex((b) => !b.active);
        if (slot === -1) return;
        const dir = new THREE.Vector3(
          target.pos.x - bot.pos.x,
          0,
          target.pos.z - bot.pos.z
        ).normalize();
        bullets[slot].active = true;
        bullets[slot].pos.set(bot.pos.x, 1.2, bot.pos.z);
        bullets[slot].vel.copy(dir);
      });
    }

    // Advance + render the pool.
    for (let i = 0; i < MAX_BULLETS; i++) {
      const b = bullets[i];
      if (b && b.active) {
        b.pos.addScaledVector(b.vel, dt * 22);
        if (b.pos.length() > 40) b.active = false;
        dummy.current.position.copy(b.pos);
        dummy.current.scale.setScalar(1);
      } else {
        dummy.current.position.set(0, -1000, 0);
        dummy.current.scale.setScalar(0);
      }
      dummy.current.updateMatrix();
      mesh.setMatrixAt(i, dummy.current.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_BULLETS]}>
      <sphereGeometry args={[0.09, 8, 8]} />
      <meshBasicMaterial color="#facc15" toneMapped={false} />
    </instancedMesh>
  );
}

// ─── Host simulation: runs the AI, applies damage, broadcasts snapshots ───────
function HostSimulation({
  botsRef,
  running,
  matchSpeed,
  onMatchEnd,
}: {
  botsRef: React.MutableRefObject<BotState[]>;
  running: boolean;
  matchSpeed: number;
  onMatchEnd: (winnerId: number) => void;
}) {
  const endedRef = useRef(false);
  const lastBroadcast = useRef(0);

  // Damage application only — bullet visuals are handled by BulletSystem.
  const applyShot = (from: BotState, target: BotState) => {
    const dmg = from.personality.weapon === "Sniper" ? 25 : from.personality.weapon === "SMG" ? 8 : 12;
    target.health = Math.max(0, target.health - dmg);
    if (target.health <= 0) target.dead = true;
  };

  useEffect(() => {
    endedRef.current = false;
  }, [running]);

  useFrame((_, rawDelta) => {
    if (!running) return;
    const dt = Math.min(rawDelta, 0.05) * matchSpeed;
    const bots = botsRef.current;

    bots.forEach((bot, i) => {
      const enemies = bots.filter((_, j) => j !== i);
      tickBot(bot, enemies, dt, performance.now(), applyShot);
    });

    // Broadcast a compact snapshot for everyone else in the room.
    const now = performance.now();
    if (now - lastBroadcast.current > SNAPSHOT_INTERVAL) {
      lastBroadcast.current = now;
      setState("snapshot", snapshotBots(bots), false);
    }

    if (!endedRef.current) {
      const alive = bots.filter((b) => !b.dead);
      if (alive.length === 1) {
        endedRef.current = true;
        setState("snapshot", snapshotBots(bots), true);
        onMatchEnd(alive[0].id);
      }
    }
  });

  return null;
}

// ─── Client mirror: applies the host's broadcast snapshots each frame ─────────
function ClientMirror({
  botsRef,
  running,
}: {
  botsRef: React.MutableRefObject<BotState[]>;
  running: boolean;
}) {
  useFrame(() => {
    const snap = getState("snapshot");
    if (snap) applyBotSnapshot(botsRef.current, snap, running ? 0.25 : 1);
  });
  return null;
}

// ─── Camera rig ───────────────────────────────────────────────────────────────
function CameraRig({ autoRotate }: { autoRotate: boolean }) {
  return (
    <OrbitControls
      makeDefault
      target={[0, 1, 0]}
      minDistance={8}
      maxDistance={45}
      maxPolarAngle={Math.PI / 2.1}
      enablePan={false}
      autoRotate={autoRotate}
      autoRotateSpeed={0.5}
    />
  );
}

// ─── Main Arena ────────────────────────────────────────────────────────────────
interface ArenaSceneProps {
  onMatchEnd: (winnerId: number) => void;
  running: boolean;
  isHost: boolean;
  mapFile?: string;
  settings?: ArenaSettings;
}

export function ArenaScene({
  onMatchEnd,
  running,
  isHost,
  mapFile = "/models/map.glb",
  settings = DEFAULT_SETTINGS,
}: ArenaSceneProps) {
  const botsRef = useRef<BotState[]>(createBots());
  const bulletsRef = useRef<BulletData[]>(
    Array.from({ length: MAX_BULLETS }, () => ({
      active: false,
      pos: new THREE.Vector3(0, -1000, 0),
      vel: new THREE.Vector3(),
    }))
  );

  // Reset every time a new match begins (host + clients keep their refs aligned).
  useEffect(() => {
    if (!running) return;
    botsRef.current = createBots();
    bulletsRef.current.forEach((b) => (b.active = false));
    if (isHost) setState("snapshot", snapshotBots(botsRef.current), true);
  }, [running, isHost]);

  return (
    <Canvas shadows camera={{ position: [0, 16, 26], fov: 50 }} style={{ background: "#0a0613" }}>
      <ambientLight intensity={1.1} />
      <hemisphereLight intensity={0.7} groundColor="#1a1033" color="#ffffff" />
      <directionalLight position={[12, 24, 8]} intensity={2} castShadow shadow-mapSize={[2048, 2048]}>
        <orthographicCamera attach="shadow-camera" args={[-25, 25, 25, -25, 0.1, 80]} />
      </directionalLight>
      <directionalLight position={[-10, 12, -8]} intensity={0.8} />
      <pointLight position={[0, 10, 0]} intensity={1} color="#836ef9" />
      <Suspense fallback={null}>
        <Environment preset="city" />
      </Suspense>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[18, 64]} />
        <meshStandardMaterial color="#15102b" roughness={0.9} />
      </mesh>

      <Suspense fallback={null}>
        <GameMap mapFile={mapFile} />
      </Suspense>

      {[0, 1, 2].map((i) => (
        <AgentSoldier key={i} index={i} botsRef={botsRef} showHealthBar={settings.showHealthBars} />
      ))}

      <BulletSystem botsRef={botsRef} bulletsRef={bulletsRef} running={running} />

      {isHost ? (
        <HostSimulation
          botsRef={botsRef}
          running={running}
          matchSpeed={settings.matchSpeed}
          onMatchEnd={onMatchEnd}
        />
      ) : (
        <ClientMirror botsRef={botsRef} running={running} />
      )}

      <CameraRig autoRotate={settings.cameraAutoRotate && !running} />
    </Canvas>
  );
}
