"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { GameMap } from "./GameMap";

// Gentle orbit so the selected map is actually visible in 3D in the lobby.
function PreviewOrbit() {
  const s = useRef({ t: 0 });
  useFrame(({ camera }, dt) => {
    s.current.t += dt * 0.14;
    const r = 27;
    camera.position.x = Math.sin(s.current.t) * r;
    camera.position.z = Math.cos(s.current.t) * r;
    camera.position.y = 17;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export function MapPreview({ mapFile }: { mapFile: string }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 17, 27], fov: 42 }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.95} />
      <hemisphereLight intensity={0.6} groundColor="#160f2e" color="#cbb6ff" />
      <directionalLight position={[8, 20, 6]} intensity={2} />
      <pointLight position={[0, 8, -4]} intensity={1.5} color="#836ef9" distance={40} />
      <Suspense fallback={null}>
        <Environment preset="night" />
      </Suspense>
      <Suspense fallback={null}>
        {/* key forces a clean remount when switching maps */}
        <GameMap key={mapFile} mapFile={mapFile} />
      </Suspense>
      <PreviewOrbit />
    </Canvas>
  );
}
