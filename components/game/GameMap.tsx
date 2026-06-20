"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { Box3, Group, Mesh, Vector3 } from "three";
import { SkeletonUtils } from "three-stdlib";

export const MAPS: Record<string, string> = {
  "Free Arena": "/models/map.glb",
  "Knife Fight": "/models/knife_fight_map.glb",
  "Living Room": "/models/living_room.glb",
  "Grave House": "/models/grave_house_map.glb",
  "Broken House": "/models/broken_house_map.glb",
};

const TARGET_SIZE = 34; // fit the map's largest horizontal dimension to this many world units
const PLAY_EXTENT = 11; // only props within the play area can block movement

// World-space, axis-aligned bounding box of a solid prop agents/bullets collide with.
export interface ObstacleBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

export function GameMap({
  mapFile,
  onObstacles,
}: {
  mapFile: string;
  onObstacles?: (boxes: ObstacleBox[]) => void;
}) {
  const { scene: cached } = useGLTF(mapFile);
  const groupRef = useRef<Group>(null);

  // Clone per-instance: the cached scene is shared, and a three.js object can
  // only live in one scene graph at a time. Without this, mounting a second
  // Canvas (menu -> arena) steals the map out of the first and blanks it.
  const scene = useMemo(() => SkeletonUtils.clone(cached), [cached]);

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

  // Derive collision volumes from the map's solid props (containers, crates).
  // Runs once the group's transform is applied so the boxes are in the same
  // world space the agents and bullets live in.
  useEffect(() => {
    const group = groupRef.current;
    if (!onObstacles || !group) return;

    group.updateWorldMatrix(true, true);
    const boxes: ObstacleBox[] = [];
    const tmp = new Box3();
    const size = new Vector3();

    group.traverse((child) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh) return;
      tmp.setFromObject(mesh);
      tmp.getSize(size);
      const footprint = Math.max(size.x, size.z);
      // Skip the floor/rugs (flat), tiny debris, and the ground/walls (huge).
      if (size.y < 0.5 || footprint < 0.6 || footprint > 16) return;
      // Skip anything entirely outside the play area.
      if (
        tmp.min.x > PLAY_EXTENT ||
        tmp.max.x < -PLAY_EXTENT ||
        tmp.min.z > PLAY_EXTENT ||
        tmp.max.z < -PLAY_EXTENT
      )
        return;
      boxes.push({
        minX: tmp.min.x,
        maxX: tmp.max.x,
        minZ: tmp.min.z,
        maxZ: tmp.max.z,
        minY: tmp.min.y,
        maxY: tmp.max.y,
      });
    });

    onObstacles(boxes);
  }, [scene, scale, position, onObstacles]);

  return (
    <group ref={groupRef} scale={scale} position={position}>
      <primitive object={scene} />
    </group>
  );
}

Object.values(MAPS).forEach((m) => useGLTF.preload(m));
