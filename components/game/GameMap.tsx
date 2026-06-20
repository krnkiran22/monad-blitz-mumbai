"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { Box3, Mesh, Vector3 } from "three";

export const MAPS: Record<string, string> = {
  "Free Arena": "/models/map.glb",
  "Knife Fight": "/models/knife_fight_map.glb",
  "Living Room": "/models/living_room.glb",
  "Grave House": "/models/grave_house_map.glb",
  "Broken House": "/models/broken_house_map.glb",
};

const TARGET_SIZE = 34; // fit the map's largest horizontal dimension to this many world units

export function GameMap({ mapFile }: { mapFile: string }) {
  const { scene } = useGLTF(mapFile);

  const { scale, position } = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.z);
    // Guard against degenerate / empty bounding boxes
    const s = Number.isFinite(maxDim) && maxDim > 0.01 ? TARGET_SIZE / maxDim : 1;

    const px = Number.isFinite(center.x) ? -center.x * s : 0;
    const py = Number.isFinite(box.min.y) ? -box.min.y * s : 0;
    const pz = Number.isFinite(center.z) ? -center.z * s : 0;

    return { scale: s, position: [px, py, pz] as [number, number, number] };
  }, [scene]);

  useEffect(() => {
    scene.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [scene]);

  return (
    <group scale={scale} position={position}>
      <primitive object={scene} />
    </group>
  );
}

Object.values(MAPS).forEach((m) => useGLTF.preload(m));
