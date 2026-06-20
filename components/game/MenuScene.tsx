"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import * as THREE from "three";
import { CharacterSoldier } from "./CharacterSoldier";
import { AGENT_PERSONALITIES } from "../agent/brain";

// Three agents in a line; 0 = left (red), 1 = middle (blue), 2 = right (green).
const HERO_POS: [number, number, number][] = [
  [3.0, 0, 1.4],
  [5.2, 0, -0.4],
  [7.4, 0, 1.4],
];

// 3/4-view aim yaws (atan2(dx,dz) scaled so faces stay partly toward camera).
const AIM_R0 = 0.94; // agent 0 turns toward the right flank
const AIM_L2 = -0.94; // agent 2 turns toward the left flank
const AIM_R1 = 0.53; // agent 1 (middle) turns toward the right flank

// Scripted looping vignette: the right & left agents duel → left falls → the
// middle finishes the surviving right agent → both fallen agents respawn.
interface Phase {
  t: number; // ms into the cycle this phase begins
  anims: [string, string, string];
  yaws: [number, number, number];
}
const PHASES: Phase[] = [
  // duel: left (0) and right (2) trade fire, middle (1) watches
  { t: 0, anims: ["Idle_Shoot", "Idle", "Idle_Shoot"], yaws: [AIM_R0, 0, AIM_L2] },
  // left goes down
  { t: 2000, anims: ["Death", "Idle", "Idle"], yaws: [AIM_R0, 0, AIM_L2] },
  // middle turns and opens fire on the surviving right agent
  { t: 3100, anims: ["Death", "Idle_Shoot", "Idle"], yaws: [AIM_R0, AIM_R1, 0] },
  // right goes down
  { t: 5000, anims: ["Death", "Idle", "Death"], yaws: [AIM_R0, AIM_R1, 0] },
  // both fallen agents respawn and reset to the hero stance
  { t: 6300, anims: ["Idle", "Idle", "Idle"], yaws: [0, 0, 0] },
];
const CYCLE_MS = 7400;

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// Drives the timeline: flips animation state on phase changes and publishes the
// per-agent target yaws into a ref the heroes lerp toward each frame.
function Director({
  setAnims,
  yawRef,
}: {
  setAnims: (a: [string, string, string]) => void;
  yawRef: React.MutableRefObject<[number, number, number]>;
}) {
  const phaseRef = useRef(-1);
  const startRef = useRef(0);
  useFrame(({ clock }) => {
    if (startRef.current === 0) startRef.current = clock.elapsedTime;
    const t = ((clock.elapsedTime - startRef.current) * 1000) % CYCLE_MS;
    let idx = 0;
    for (let i = 0; i < PHASES.length; i++) if (t >= PHASES[i].t) idx = i;
    yawRef.current = PHASES[idx].yaws;
    if (idx !== phaseRef.current) {
      phaseRef.current = idx;
      setAnims(PHASES[idx].anims);
    }
  });
  return null;
}

// One menu agent: renders the colored ground ring + soldier and smoothly turns
// toward its scripted facing.
function Hero({
  index,
  anim,
  yawRef,
}: {
  index: number;
  anim: string;
  yawRef: React.MutableRefObject<[number, number, number]>;
}) {
  const turn = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!turn.current) return;
    const target = yawRef.current[index] ?? 0;
    turn.current.rotation.y = lerpAngle(turn.current.rotation.y, target, Math.min(1, dt * 6));
  });

  const p = AGENT_PERSONALITIES[index];
  return (
    <group ref={turn}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.5, 0.7, 32]} />
        <meshBasicMaterial color={p.color} transparent opacity={0.6} />
      </mesh>
      <Float speed={1.2} rotationIntensity={0} floatIntensity={0.15}>
        <CharacterSoldier color={p.color} animation={anim} weapon={p.weapon} scale={1.15} />
      </Float>
    </group>
  );
}

// Fixed front-on camera (no orbit) centered on the trio so the agents are the
// centerpiece of the hero card. Title/content sit on top via z-index.
function StaticCam() {
  useFrame(({ camera }) => {
    camera.position.set(5.2, 3.1, 11);
    camera.lookAt(5.2, 1.3, 0);
  });
  return null;
}

function Dust() {
  const ref = useRef<THREE.Points>(null);
  const count = 120;
  const positions = useRef<Float32Array>(
    (() => {
      const arr = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        arr[i * 3] = (Math.random() - 0.5) * 30;
        arr[i * 3 + 1] = Math.random() * 10;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
      }
      return arr;
    })()
  );

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions.current, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.06} color="#a78bfa" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

export function MenuScene() {
  const [anims, setAnims] = useState<[string, string, string]>(["Idle", "Idle", "Idle"]);
  const yawRef = useRef<[number, number, number]>([0, 0, 0]);

  return (
    <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 5, 12], fov: 42 }} style={{ background: "transparent" }}>
      <ambientLight intensity={1.6} />
      <hemisphereLight intensity={1.3} groundColor="#b9a7ff" color="#ffffff" />
      <directionalLight position={[8, 18, 6]} intensity={3} castShadow shadow-mapSize={[2048, 2048]}>
        <orthographicCamera attach="shadow-camera" args={[-15, 15, 15, -15, 0.1, 60]} />
      </directionalLight>
      <pointLight position={[0, 6, -4]} intensity={2.4} color="#a78bfa" distance={40} />
      <spotLight position={[-6, 10, 8]} intensity={2.4} angle={0.6} penumbra={0.8} color="#c4b5fd" />

      <Suspense fallback={null}>
        <Environment preset="city" />
      </Suspense>

      {/* Bright stage the heroes stand on — no map, so nothing blocks the view. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[16, 64]} />
        <meshStandardMaterial color="#d9d2ff" roughness={0.9} metalness={0.05} />
      </mesh>

      <Suspense fallback={null}>
        {HERO_POS.map((pos, i) => (
          <group key={i} position={pos}>
            <Hero index={i} anim={anims[i]} yawRef={yawRef} />
          </group>
        ))}
      </Suspense>

      <Director setAnims={setAnims} yawRef={yawRef} />
      <Dust />
      <StaticCam />
    </Canvas>
  );
}
