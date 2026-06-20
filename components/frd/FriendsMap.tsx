"use client";

import { useGLTF } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useEffect } from "react";
/* eslint-disable @typescript-eslint/no-explicit-any */

// Loads the selected map GLB and wraps it in a fixed trimesh collider so
// players and bullets actually collide with the level geometry.
export function FriendsMap({ mapFile }: { mapFile: string }) {
  const map = useGLTF(mapFile);

  useEffect(() => {
    map.scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [map]);

  return (
    <RigidBody colliders="trimesh" type="fixed">
      <primitive object={map.scene} />
    </RigidBody>
  );
}

useGLTF.preload("/models/map.glb");
