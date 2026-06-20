"use client";

import { useRef, useState, useEffect, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Billboard } from "@react-three/drei";
import { getState, setState } from "playroomkit";
import * as THREE from "three";
import {
  createBots,
  tickBot,
  botAnimation,
  snapshotBots,
  applyBotSnapshot,
  respawnBot,
  BotState,
  AGENT_PERSONALITIES,
} from "../agent/brain";
import { CharacterSoldier } from "./CharacterSoldier";
import { GameMap, ObstacleBox } from "./GameMap";

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
const MATCH_DURATION = 60; // seconds — deathmatch with respawns
const RESPAWN_DELAY = 2800; // ms before a downed agent comes back

export interface MatchStats {
  timeLeft: number;
  kills: number[];
}

const AGENT_RADIUS = 0.55;

// Is the point inside any obstacle box (with optional inflation)? Used both for
// bullet hits (y-aware) and agent collision (y ignored via full height span).
function pointInObstacle(
  x: number,
  y: number,
  z: number,
  obs: ObstacleBox[],
  pad = 0
): boolean {
  for (const o of obs) {
    if (
      x > o.minX - pad &&
      x < o.maxX + pad &&
      z > o.minZ - pad &&
      z < o.maxZ + pad &&
      y >= o.minY &&
      y <= o.maxY
    ) {
      return true;
    }
  }
  return false;
}

// Push an agent out of any obstacle it ends up inside, along the shallowest axis
// so it slides along container walls instead of passing through them.
function resolveAgentCollision(pos: { x: number; z: number }, obs: ObstacleBox[]) {
  for (const o of obs) {
    const minX = o.minX - AGENT_RADIUS;
    const maxX = o.maxX + AGENT_RADIUS;
    const minZ = o.minZ - AGENT_RADIUS;
    const maxZ = o.maxZ + AGENT_RADIUS;
    if (pos.x > minX && pos.x < maxX && pos.z > minZ && pos.z < maxZ) {
      const left = pos.x - minX;
      const right = maxX - pos.x;
      const down = pos.z - minZ;
      const up = maxZ - pos.z;
      const m = Math.min(left, right, down, up);
      if (m === left) pos.x = minX;
      else if (m === right) pos.x = maxX;
      else if (m === down) pos.z = minZ;
      else pos.z = maxZ;
    }
  }
}

// Floating name label drawn on a 2D canvas → sprite. Avoids drei <Text>
// (troika) which spins up a WebGL context per label and exhausts the
// browser's ~16 context limit, blanking the whole scene.
function NameTag({ text, color }: { text: string; color: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.font = "bold 42px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(text, 128, 34);
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 34);
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }, [text, color]);

  return (
    <sprite position={[0, 2.55, 0]} scale={[1.5, 0.38, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} toneMapped={false} />
    </sprite>
  );
}

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

    // Group stays on the ground (ring/labels); only the soldier model jumps.
    posGroup.current.position.set(bot.pos.x, 0, bot.pos.z);
    rotGroup.current.rotation.y = bot.angle;
    rotGroup.current.position.y = bot.pos.y;

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

      <NameTag text={personality.name} color={personality.color} />

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
  obstaclesRef,
  running,
}: {
  botsRef: React.MutableRefObject<BotState[]>;
  bulletsRef: React.MutableRefObject<BulletData[]>;
  obstaclesRef: React.MutableRefObject<ObstacleBox[]>;
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
    const obstacles = obstaclesRef.current;
    for (let i = 0; i < MAX_BULLETS; i++) {
      const b = bullets[i];
      if (b && b.active) {
        b.pos.addScaledVector(b.vel, dt * 22);
        // Despawn when it flies off the arena or slams into a container.
        if (b.pos.length() > 40 || pointInObstacle(b.pos.x, b.pos.y, b.pos.z, obstacles)) {
          b.active = false;
        }
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
// Deathmatch format: agents respawn for MATCH_DURATION seconds; the agent with
// the most kills when the clock hits zero wins.
function HostSimulation({
  botsRef,
  obstaclesRef,
  running,
  matchSpeed,
  onMatchEnd,
  onStats,
}: {
  botsRef: React.MutableRefObject<BotState[]>;
  obstaclesRef: React.MutableRefObject<ObstacleBox[]>;
  running: boolean;
  matchSpeed: number;
  onMatchEnd: (winnerId: number) => void;
  onStats: (stats: MatchStats) => void;
}) {
  const endedRef = useRef(false);
  const lastBroadcast = useRef(0);
  const lastStats = useRef(0);
  const startedAt = useRef(0);

  // Damage application + kill crediting. Bullet visuals are handled separately.
  // Distance-based accuracy + modest damage keeps fights lasting long enough
  // to actually watch the agents run, strafe, jump and take cover.
  const applyShot = (from: BotState, target: BotState) => {
    if (target.dead) return;
    const d = Math.hypot(target.pos.x - from.pos.x, target.pos.z - from.pos.z);
    const baseDmg = from.personality.weapon === "Sniper" ? 16 : from.personality.weapon === "SMG" ? 5 : 7;
    let hitChance = Math.max(0.18, Math.min(0.8, 1 - d / 26));
    if (target.crouching) hitChance *= 0.45;
    if (target.pos.y > 0.3) hitChance *= 0.6; // mid-air dodge
    if (Math.random() > hitChance) return; // miss
    target.health = Math.max(0, target.health - baseDmg);
    if (target.health <= 0) {
      target.dead = true;
      target.deaths += 1;
      target.respawnAt = performance.now() + RESPAWN_DELAY;
      from.kills += 1;
    }
  };

  // Arm the clock for a fresh match; the actual start time is stamped on the
  // first running frame so a stale ref can never end the match instantly.
  useEffect(() => {
    endedRef.current = false;
    startedAt.current = 0;
  }, [running]);

  useFrame((_, rawDelta) => {
    if (!running) return;
    const dt = Math.min(rawDelta, 0.05) * matchSpeed;
    const bots = botsRef.current;
    const now = performance.now();
    if (startedAt.current === 0) startedAt.current = now;
    const elapsed = (now - startedAt.current) / 1000;

    // Respawn any agent whose timer has elapsed.
    bots.forEach((bot) => {
      if (bot.dead && now >= bot.respawnAt) respawnBot(bot);
    });

    const obstacles = obstaclesRef.current;
    bots.forEach((bot, i) => {
      const enemies = bots.filter((_, j) => j !== i);
      tickBot(bot, enemies, dt, now, applyShot, obstacles);
      // Safety net: if steering still let it clip a prop, push it back out.
      if (obstacles.length) resolveAgentCollision(bot.pos, obstacles);
      bot.pos.x = Math.max(-10, Math.min(10, bot.pos.x));
      bot.pos.z = Math.max(-10, Math.min(10, bot.pos.z));
    });

    // Broadcast a compact snapshot for everyone else in the room.
    if (now - lastBroadcast.current > SNAPSHOT_INTERVAL) {
      lastBroadcast.current = now;
      setState("snapshot", snapshotBots(bots), false);
    }

    // Publish the live scoreboard / countdown a few times a second.
    const timeLeft = Math.max(0, Math.ceil(MATCH_DURATION - elapsed));
    if (now - lastStats.current > 250) {
      lastStats.current = now;
      onStats({ timeLeft, kills: bots.map((b) => b.kills) });
    }

    // Time's up → most kills wins (ties broken by fewer deaths, then health).
    if (!endedRef.current && elapsed >= MATCH_DURATION) {
      endedRef.current = true;
      const winner = bots.reduce((best, b) => {
        if (b.kills !== best.kills) return b.kills > best.kills ? b : best;
        if (b.deaths !== best.deaths) return b.deaths < best.deaths ? b : best;
        return b.health > best.health ? b : best;
      });
      onStats({ timeLeft: 0, kills: bots.map((b) => b.kills) });
      setState("snapshot", snapshotBots(bots), true);
      onMatchEnd(winner.id);
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

// ─── Free orbit camera (overview) ─────────────────────────────────────────────
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

// ─── Spectator POV camera: chase-cam behind the selected agent ────────────────
// Mirrors the stellar_strike follow-cam: sits above and behind the player,
// looking slightly ahead of them. Smoothly lerps so cuts feel cinematic.
function SpectatorCamera({
  botsRef,
  index,
}: {
  botsRef: React.MutableRefObject<BotState[]>;
  index: number;
}) {
  const { camera } = useThree();
  const desired = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());

  useFrame((_, rawDelta) => {
    const bot = botsRef.current[index];
    if (!bot) return;
    const dt = Math.min(rawDelta, 0.05);

    // Behind the agent relative to its facing direction.
    const fx = Math.sin(bot.angle);
    const fz = Math.cos(bot.angle);
    const dist = 7;
    const height = 4.2;
    desired.current.set(
      bot.pos.x - fx * dist,
      bot.pos.y + height,
      bot.pos.z - fz * dist
    );
    // Look just ahead of the agent at chest height.
    look.current.set(
      bot.pos.x + fx * 2,
      bot.pos.y + 1.4,
      bot.pos.z + fz * 2
    );

    const k = 1 - Math.pow(0.001, dt); // frame-rate independent smoothing
    camera.position.lerp(desired.current, k);
    camera.lookAt(look.current);
  });

  return null;
}

// ─── Main Arena ────────────────────────────────────────────────────────────────
interface ArenaSceneProps {
  onMatchEnd: (winnerId: number) => void;
  onStats?: (stats: MatchStats) => void;
  running: boolean;
  isHost: boolean;
  mapFile?: string;
  settings?: ArenaSettings;
  spectateIndex?: number; // -1 = free orbit, 0..2 = follow that agent
}

export function ArenaScene({
  onMatchEnd,
  onStats,
  running,
  isHost,
  mapFile = "/models/map.glb",
  settings = DEFAULT_SETTINGS,
  spectateIndex = -1,
}: ArenaSceneProps) {
  const botsRef = useRef<BotState[]>(createBots());
  const obstaclesRef = useRef<ObstacleBox[]>([]);
  const bulletsRef = useRef<BulletData[]>(
    Array.from({ length: MAX_BULLETS }, () => ({
      active: false,
      pos: new THREE.Vector3(0, -1000, 0),
      vel: new THREE.Vector3(),
    }))
  );

  const handleObstacles = useMemo(
    () => (boxes: ObstacleBox[]) => {
      obstaclesRef.current = boxes;
    },
    []
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
        <GameMap mapFile={mapFile} onObstacles={handleObstacles} />
      </Suspense>

      {[0, 1, 2].map((i) => (
        <AgentSoldier key={i} index={i} botsRef={botsRef} showHealthBar={settings.showHealthBars} />
      ))}

      <BulletSystem botsRef={botsRef} bulletsRef={bulletsRef} obstaclesRef={obstaclesRef} running={running} />

      {isHost ? (
        <HostSimulation
          botsRef={botsRef}
          obstaclesRef={obstaclesRef}
          running={running}
          matchSpeed={settings.matchSpeed}
          onMatchEnd={onMatchEnd}
          onStats={onStats ?? (() => {})}
        />
      ) : (
        <ClientMirror botsRef={botsRef} running={running} />
      )}

      {spectateIndex >= 0 ? (
        <SpectatorCamera botsRef={botsRef} index={spectateIndex} />
      ) : (
        <CameraRig autoRotate={settings.cameraAutoRotate && !running} />
      )}
    </Canvas>
  );
}
