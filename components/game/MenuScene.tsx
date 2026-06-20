"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import * as THREE from "three";
import { CharacterSoldier } from "./CharacterSoldier";
import { AGENT_PERSONALITIES } from "../agent/brain";

// Hero shot like stellar_strike: the middle agent stands tall and alone while
// the two flanking agents open fire — all facing the camera.
const HEROES: {
  pos: [number, number, number];
  rot: [number, number, number];
  anim: string;
}[] = [
  { pos: [3.0, 0, 1.4], rot: [0, 0.16, 0], anim: "Idle_Shoot" },
  { pos: [5.2, 0, -0.4], rot: [0, 0, 0], anim: "Idle" },
  { pos: [7.4, 0, 1.4], rot: [0, -0.16, 0], anim: "Idle_Shoot" },
];

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
      <StaticCam />
    </Canvas>
  );
}
