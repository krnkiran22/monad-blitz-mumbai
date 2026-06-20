"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import * as THREE from "three";
import { CharacterSoldier } from "./CharacterSoldier";
import { GameMap } from "./GameMap";
import { AGENT_PERSONALITIES } from "../agent/brain";

// Three hero soldiers posed for the main-menu hero shot.
const HEROES: {
  pos: [number, number, number];
  rot: [number, number, number];
  anim: string;
}[] = [
  { pos: [-3.2, 0, 1.5], rot: [0, 0.5, 0], anim: "Idle_Shoot" },
  { pos: [0, 0, 0], rot: [0, 0.1, 0], anim: "Idle" },
  { pos: [3.2, 0, 1.4], rot: [0, -0.5, 0], anim: "Idle_Shoot" },
];

function SlowOrbit() {
  const { current: state } = useRef({ t: 0 });
  useFrame(({ camera }, delta) => {
    state.t += delta * 0.08;
    const r = 11;
    camera.position.x = Math.sin(state.t) * r;
    camera.position.z = Math.cos(state.t) * r + 2;
    camera.position.y = 4.5 + Math.sin(state.t * 0.6) * 0.6;
    camera.lookAt(0, 1.4, 0);
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

export function MenuScene({ mapFile = "/models/map.glb" }: { mapFile?: string }) {
  return (
    <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 5, 12], fov: 42 }} style={{ background: "transparent" }}>
      <fog attach="fog" args={["#0a0613", 14, 34]} />
      <ambientLight intensity={0.9} />
      <hemisphereLight intensity={0.6} groundColor="#160f2e" color="#cbb6ff" />
      <directionalLight position={[8, 18, 6]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]}>
        <orthographicCamera attach="shadow-camera" args={[-15, 15, 15, -15, 0.1, 60]} />
      </directionalLight>
      <pointLight position={[0, 6, -4]} intensity={2} color="#836ef9" distance={30} />
      <spotLight position={[-6, 10, 8]} intensity={2} angle={0.6} penumbra={0.8} color="#a78bfa" />

      <Suspense fallback={null}>
        <Environment preset="night" />
      </Suspense>

      {/* Ground catch for shadows + reflection-ish base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[16, 64]} />
        <meshStandardMaterial color="#120c26" roughness={0.85} metalness={0.2} />
      </mesh>

      <Suspense fallback={null}>
        <GameMap mapFile={mapFile} />
      </Suspense>

      <Suspense fallback={null}>
        {HEROES.map((h, i) => (
          <group key={i} position={h.pos} rotation={h.rot}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
              <ringGeometry args={[0.5, 0.7, 32]} />
              <meshBasicMaterial color={AGENT_PERSONALITIES[i].color} transparent opacity={0.6} />
            </mesh>
            <Float speed={1.2} rotationIntensity={0} floatIntensity={0.15}>
              <CharacterSoldier
                color={AGENT_PERSONALITIES[i].color}
                animation={h.anim}
                weapon={AGENT_PERSONALITIES[i].weapon}
                scale={1.15}
              />
            </Float>
          </group>
        ))}
      </Suspense>

      <Dust />
      <SlowOrbit />
    </Canvas>
  );
}
