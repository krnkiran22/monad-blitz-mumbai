"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { FriendsExperience } from "./FriendsExperience";

// Full-screen playable canvas. The follow camera lives in the character
// controller (CameraControls), so the initial Canvas camera is just a seed.
export function FriendsGame({ mapFile }: { mapFile: string }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 20, 16], fov: 45, near: 0.1, far: 1000 }}
      style={{ background: "linear-gradient(#bcd4ff, #f3d9b8)" }}
    >
      <Suspense fallback={null}>
        <Physics>
          <FriendsExperience mapFile={mapFile} />
        </Physics>
      </Suspense>
    </Canvas>
  );
}
