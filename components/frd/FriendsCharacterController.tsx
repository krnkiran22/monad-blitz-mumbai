"use client";

import { useEffect, useRef, useState } from "react";
import { Billboard, CameraControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { isHost } from "playroomkit";
import { CharacterSoldier } from "../game/CharacterSoldier";
import { playSfx, SFX } from "./sfx";
/* eslint-disable @typescript-eslint/no-explicit-any */

// Tuned to match stellar_strike's feel exactly.
const MOVEMENT_SPEED = 260;
const FIRE_RATE = 380;
const JUMP_FORCE = 3;

export const WEAPON_OFFSET = { x: -0.2, y: 1.4, z: 1.2 };

interface Props {
  state: any; // PlayroomKit player state
  userPlayer: boolean;
  onFire: (bullet: any) => void;
  onKilled: (victim: string, killer: string) => void;
}

export function FriendsCharacterController({ state, userPlayer, onFire, onKilled }: Props) {
  const group = useRef<any>(null);
  const character = useRef<any>(null);
  const rigidbody = useRef<any>(null);
  const controls = useRef<any>(null);
  const lastShoot = useRef(0);
  const wasDead = useRef(false);
  const prevHp = useRef(100);

  const [animation, setAnimation] = useState("Idle");
  const weapon = state.getState("weapon") || state.state?.profile?.weapon || "AK";
  const color = state.state?.profile?.color || "#4ade80";

  const movement = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    fire: false,
    jump: false,
  });

  // Randomised spawn so players don't stack on the origin.
  const spawnRandomly = () => {
    const a = Math.random() * Math.PI * 2;
    const r = 4 + Math.random() * 6;
    rigidbody.current?.setTranslation({ x: Math.cos(a) * r, y: 2, z: Math.sin(a) * r }, true);
  };

  useEffect(() => {
    if (userPlayer) spawnRandomly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPlayer]);

  // Keyboard + mouse input for the local player only.
  useEffect(() => {
    if (!userPlayer) return;
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const m = movement.current;
      switch (e.code) {
        case "KeyW": case "ArrowUp": m.forward = true; break;
        case "KeyS": case "ArrowDown": m.backward = true; break;
        case "KeyA": case "ArrowLeft": m.left = true; break;
        case "KeyD": case "ArrowRight": m.right = true; break;
        case "KeyF": m.fire = true; break;
        case "Space": m.jump = true; break;
      }
    };
    const up = (e: KeyboardEvent) => {
      const m = movement.current;
      switch (e.code) {
        case "KeyW": case "ArrowUp": m.forward = false; break;
        case "KeyS": case "ArrowDown": m.backward = false; break;
        case "KeyA": case "ArrowLeft": m.left = false; break;
        case "KeyD": case "ArrowRight": m.right = false; break;
        case "KeyF": m.fire = false; break;
        case "Space": m.jump = false; break;
      }
    };
    const pointerDown = () => { movement.current.fire = true; };
    const pointerUp = () => { movement.current.fire = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("pointerdown", pointerDown);
    window.addEventListener("pointerup", pointerUp);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointerup", pointerUp);
    };
  }, [userPlayer]);

  useFrame((_, delta) => {
    if (!rigidbody.current) return;
    const t = rigidbody.current.translation();

    // Health/death is host-authoritative and synced; everyone reads it here.
    const dead = !!state.getState("dead");
    const hp = state.getState("health") ?? 100;

    // SFX on every client so hits/deaths are audible to all.
    if (dead && !wasDead.current) playSfx(SFX.dead, 0.5);
    else if (hp < prevHp.current) playSfx(SFX.hurt, 0.35);

    // On revive, the host writes a fresh spawn position; the local player
    // teleports its physics body there (remotes mirror via "pos" below).
    if (userPlayer && !dead && wasDead.current) {
      const p = state.getState("pos");
      if (p) {
        rigidbody.current.setTranslation(p, true);
        rigidbody.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
      setAnimation("Idle");
    }
    wasDead.current = dead;
    prevHp.current = hp;

    // ── CAMERA FOLLOW — identical to stellar_strike (Normal mode) ──
    if (controls.current && userPlayer) {
      const cameraDistanceY = window.innerWidth < 1024 ? 16 : 20;
      const cameraDistanceZ = window.innerWidth < 1024 ? 12 : 16;
      controls.current.setLookAt(
        t.x,
        t.y + (dead ? 12 : cameraDistanceY),
        t.z + (dead ? 2 : cameraDistanceZ),
        t.x,
        t.y + 1.5,
        t.z,
        true
      );
    }

    if (dead) {
      if (animation !== "Death") setAnimation("Death");
      return;
    }

    if (userPlayer) {
      const m = movement.current;
      const movementAngle = () => {
        if (m.forward && m.right) return (3 * Math.PI) / 4;
        if (m.forward && m.left) return (5 * Math.PI) / 4;
        if (m.backward && m.right) return Math.PI / 4;
        if (m.backward && m.left) return -(Math.PI / 4);
        if (m.forward) return Math.PI;
        if (m.backward) return 0;
        if (m.left) return -(Math.PI / 2);
        if (m.right) return Math.PI / 2;
        return null;
      };

      const angle = movementAngle();
      const isMoving = angle !== null;

      if (isMoving && angle !== null) {
        rigidbody.current.applyImpulse(
          { x: Math.sin(angle) * MOVEMENT_SPEED * delta, y: 0, z: Math.cos(angle) * MOVEMENT_SPEED * delta },
          true
        );
        if (character.current) character.current.rotation.y = angle;
        setAnimation(m.fire ? "Run_Shoot" : "Run");
      } else {
        setAnimation(m.fire ? "Idle_Shoot" : "Idle");
      }

      // Jump
      if (m.jump && t.y < 2) {
        rigidbody.current.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
      } else if (t.y > 0) {
        rigidbody.current.applyImpulse({ x: 0, y: -2, z: 0 }, true);
      }

      // Fire
      if (m.fire && Date.now() - lastShoot.current > FIRE_RATE) {
        lastShoot.current = Date.now();
        onFire({
          id: state.id + "-" + Date.now(),
          position: { x: t.x, y: t.y, z: t.z },
          angle: character.current?.rotation.y ?? 0,
          player: state.id,
          damage: 10,
          speed: 1.5,
        });
      }

      // Broadcast our transform/animation
      state.setState("pos", { x: t.x, y: t.y, z: t.z });
      state.setState("rotY", character.current?.rotation.y ?? 0);
      state.setState("animation", animation);
    } else {
      // Mirror remote players from their synced state
      const pos = state.getState("pos");
      const rotY = state.getState("rotY");
      const netAnim = state.getState("animation");
      if (pos) rigidbody.current.setTranslation(pos, true);
      if (rotY !== undefined && character.current) character.current.rotation.y = rotY;
      if (netAnim !== undefined && netAnim !== animation) setAnimation(netAnim);
    }
  });

  return (
    <group ref={group}>
      {userPlayer && <CameraControls ref={controls} makeDefault />}
      <RigidBody
        ref={rigidbody}
        colliders={false}
        linearDamping={12}
        lockRotations
        type={userPlayer ? "dynamic" : "kinematicPosition"}
        userData={{ type: "player", id: state.id }}
        onIntersectionEnter={({ other }: any) => {
          // The host is the single source of truth for damage: it can write any
          // player's state, so hits register reliably regardless of which client
          // the shooter is on (no cross-client miss from position lag).
          if (!isHost()) return;
          const u = other.rigidBody?.userData;
          if (u?.type !== "bullet" || u?.player === state.id) return;
          if (state.getState("dead")) return;

          const newHealth = (state.getState("health") ?? 100) - (u.damage ?? 10);
          if (newHealth <= 0) {
            state.setState("health", 0);
            state.setState("dead", true);
            onKilled(state.id, u.player);
            // Revive after 2s with a fresh spawn point (broadcast to everyone).
            setTimeout(() => {
              const a = Math.random() * Math.PI * 2;
              const r = 4 + Math.random() * 6;
              state.setState("pos", { x: Math.cos(a) * r, y: 2, z: Math.sin(a) * r });
              state.setState("health", 100);
              state.setState("dead", false);
            }, 2000);
          } else {
            state.setState("health", newHealth);
          }
        }}
      >
        <PlayerInfo state={state} />
        <group ref={character}>
          <CharacterSoldier color={color} animation={animation} weapon={weapon} />
          {userPlayer && <Crosshair />}
        </group>
        <CapsuleCollider args={[0.7, 0.6]} position={[0, 1.28, 0]} />
      </RigidBody>
    </group>
  );
}

function PlayerInfo({ state }: { state: any }) {
  const health = state.getState?.("health") ?? state.state?.health ?? 100;
  const color = state.state?.profile?.color || "#a3ff12";
  return (
    <Billboard position-y={2.6}>
      <mesh position-y={0.1} position-z={-0.01}>
        <planeGeometry args={[1.2, 0.16]} />
        <meshBasicMaterial color="black" transparent opacity={0.6} />
      </mesh>
      <mesh scale-x={Math.max(0, health) / 100} position-x={-0.6 * (1 - Math.max(0, health) / 100)} position-y={0.1}>
        <planeGeometry args={[1.2, 0.16]} />
        <meshBasicMaterial color={health < 30 ? "#FF3E55" : color} />
      </mesh>
    </Billboard>
  );
}

function Crosshair() {
  const dots = [1, 2, 3, 4.5, 6.5, 9];
  return (
    <group position={[WEAPON_OFFSET.x, WEAPON_OFFSET.y, WEAPON_OFFSET.z]}>
      {dots.map((z, i) => (
        <mesh key={i} position-z={z}>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshBasicMaterial color="black" transparent opacity={0.9 - i * 0.12} />
        </mesh>
      ))}
    </group>
  );
}
