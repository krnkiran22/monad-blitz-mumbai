"use client";

import { BallCollider, RigidBody } from "@react-three/rapier";
import { useEffect, useRef } from "react";
import { MeshBasicMaterial } from "three";
import { WEAPON_OFFSET } from "./FriendsCharacterController";
import { playSfx, SFX } from "./sfx";
/* eslint-disable @typescript-eslint/no-explicit-any */

// Exact stellar_strike tracer: an over-bright hotpink box that blooms into a
// glowing "fire" bullet under the EffectComposer Bloom pass.
const bulletMaterial = new MeshBasicMaterial({ color: "hotpink", toneMapped: false });
bulletMaterial.color.multiplyScalar(6);

export interface BulletData {
  id: string;
  player: string;
  angle: number;
  position: { x: number; y: number; z: number };
  damage?: number;
  speed?: number;
  size?: number;
}

export function FriendsBullet({
  player,
  angle,
  position,
  onHit,
  speed = 1.5,
}: BulletData & { onHit: (pos: { x: number; y: number; z: number }, blood: boolean) => void }) {
  const rb = useRef<any>(null);
  const spawnTime = useRef(Date.now());

  useEffect(() => {
    // Gunshot on spawn — same as stellar_strike's Bullet, so every shot
    // (yours and your friends') is audible.
    playSfx(SFX.rifle, 0.5);
    rb.current?.setLinvel(
      { x: Math.sin(angle) * speed * 20, y: 0, z: Math.cos(angle) * speed * 20 },
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <group position={[position.x, position.y, position.z]} rotation-y={angle}>
      <group position-x={WEAPON_OFFSET.x} position-y={WEAPON_OFFSET.y} position-z={WEAPON_OFFSET.z}>
        <RigidBody
          ref={rb}
          gravityScale={0}
          sensor
          ccd
          colliders={false}
          userData={{ type: "bullet", player, damage: 10 }}
          onIntersectionEnter={(e: any) => {
            if (Date.now() - spawnTime.current < 120) return; // brief self-immunity
            const u = e.other.rigidBody?.userData;
            if (u?.type === "bullet" || u?.id === player || u?.player === player) return;
            // Stop the tracer on any solid hit, but only spray blood when it
            // actually strikes a player — never on the wall behind them.
            const t = rb.current?.translation();
            rb.current?.setEnabled(false);
            if (t) onHit({ x: t.x, y: t.y, z: t.z }, u?.type === "player");
          }}
        >
          {/* Fat, CCD-swept ball collider so a fast tracer can't tunnel past a
              player; the visible tracer box is purely cosmetic. */}
          <BallCollider args={[0.25]} position={[0, 0, 0.25]} />
          <mesh position-z={0.25} material={bulletMaterial} castShadow>
            <boxGeometry args={[0.05, 0.05, 0.5]} />
          </mesh>
        </RigidBody>
      </group>
    </group>
  );
}
