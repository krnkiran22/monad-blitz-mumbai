"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useGraph } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, Group, LoopOnce, Mesh, MeshStandardMaterial, SkinnedMesh } from "three";
import { SkeletonUtils } from "three-stdlib";

const WEAPONS = [
  "GrenadeLauncher", "AK", "Knife_1", "Knife_2", "Pistol", "Revolver",
  "Revolver_Small", "RocketLauncher", "ShortCannon", "SMG", "Shotgun",
  "Shovel", "Sniper", "Sniper_2",
];

interface Props {
  color?: string;
  animation?: string;
  weapon?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

export function CharacterSoldier({
  color = "black",
  animation = "Idle",
  weapon = "AK",
  ...props
}: Props) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF("/models/Character_Soldier.gltf");

  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { nodes, materials } = useGraph(clone) as { nodes: any; materials: any };
  const { actions } = useAnimations(animations, group);

  const playerColorMaterial = useMemo(
    () => new MeshStandardMaterial({ color: new Color(color) }),
    [color]
  );

  useEffect(() => {
    if (actions["Death"]) {
      actions["Death"].loop = LoopOnce;
      actions["Death"].clampWhenFinished = true;
    }
  }, [actions]);

  useEffect(() => {
    const action = actions[animation] || actions["Idle"];
    if (!action) return;
    action.reset().fadeIn(0.2).play();
    return () => {
      action.fadeOut(0.2);
    };
  }, [animation, actions]);

  useEffect(() => {
    WEAPONS.forEach((wp) => {
      const node = nodes[wp] as Mesh | undefined;
      if (node) node.visible = wp === weapon;
    });
    clone.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [weapon, nodes, clone]);

  return (
    <group {...props} dispose={null} ref={group}>
      <group name="Scene">
        <group name="CharacterArmature">
          <primitive object={nodes.Root} />
          <group name="Body_1">
            <skinnedMesh
              name="Cube004"
              geometry={(nodes.Cube004 as SkinnedMesh).geometry}
              material={materials.Skin}
              skeleton={(nodes.Cube004 as SkinnedMesh).skeleton}
              castShadow
            />
            <skinnedMesh
              name="Cube004_1"
              geometry={(nodes.Cube004_1 as SkinnedMesh).geometry}
              material={materials.DarkGrey}
              skeleton={(nodes.Cube004_1 as SkinnedMesh).skeleton}
              castShadow
            />
            <skinnedMesh
              name="Cube004_2"
              geometry={(nodes.Cube004_2 as SkinnedMesh).geometry}
              material={playerColorMaterial}
              skeleton={(nodes.Cube004_2 as SkinnedMesh).skeleton}
              castShadow
            />
            <skinnedMesh
              name="Cube004_3"
              geometry={(nodes.Cube004_3 as SkinnedMesh).geometry}
              material={playerColorMaterial}
              skeleton={(nodes.Cube004_3 as SkinnedMesh).skeleton}
              castShadow
            />
            <skinnedMesh
              name="Cube004_4"
              geometry={(nodes.Cube004_4 as SkinnedMesh).geometry}
              material={materials.Black}
              skeleton={(nodes.Cube004_4 as SkinnedMesh).skeleton}
              castShadow
            />
          </group>
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/models/Character_Soldier.gltf");
