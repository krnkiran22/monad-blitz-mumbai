"use client";

import { Instance, Instances } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, MathUtils, Vector3 } from "three";
/* eslint-disable @typescript-eslint/no-explicit-any */

const hitColor = new Color("#ff6a00");
hitColor.multiplyScalar(12);

function AnimatedBox({ scale, target, speed }: { scale: number; target: Vector3; speed: number }) {
  const ref = useRef<any>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    if (ref.current.scale.x > 0) {
      ref.current.scale.x = ref.current.scale.y = ref.current.scale.z -= speed * delta;
    }
    ref.current.position.lerp(target, speed);
  });
  return <Instance ref={ref} scale={scale} position={[0, 0, 0]} />;
}

export function FriendsBulletHit({
  nb = 60,
  position,
  onEnded,
}: {
  nb?: number;
  position: { x: number; y: number; z: number };
  onEnded: () => void;
}) {
  const boxes = useMemo(
    () =>
      Array.from({ length: nb }, () => ({
        target: new Vector3(
          MathUtils.randFloat(-0.6, 0.6),
          MathUtils.randFloat(-0.6, 0.6),
          MathUtils.randFloat(-0.6, 0.6)
        ),
        scale: 0.1,
        speed: MathUtils.randFloat(0.1, 0.3),
      })),
    [nb]
  );

  useEffect(() => {
    const t = setTimeout(() => onEnded(), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <group position={[position.x, position.y, position.z]}>
      <Instances>
        <boxGeometry />
        <meshStandardMaterial toneMapped={false} color={hitColor} />
        {boxes.map((box, i) => (
          <AnimatedBox key={i} {...box} />
        ))}
      </Instances>
    </group>
  );
}
