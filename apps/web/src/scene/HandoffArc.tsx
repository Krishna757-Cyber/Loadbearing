/**
 * HandoffArc — Animated token flight between two members.
 * Uses a quadratic Bezier arc with spring easing and fading ghost trail.
 */
"use client";

import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { latLonToVector3, arcPoints as computeArcPoints } from "./math";

interface HandoffArcProps {
  fromLatLon: [number, number];
  toLatLon: [number, number];
  color?: string;
  duration?: number;
  onComplete?: () => void;
  active: boolean;
}

export function HandoffArc({
  fromLatLon,
  toLatLon,
  color = "#FFB547",
  duration = 1.2,
  onComplete,
  active,
}: HandoffArcProps) {
  const progressRef = useRef(0);
  const tokenRef = useRef<THREE.Mesh>(null);
  const ghostsRef = useRef<THREE.Mesh[]>([]);
  const [complete, setComplete] = useState(false);
  const [fadeOut, setFadeOut] = useState(0);

  const fromPos = useMemo(
    () => latLonToVector3(fromLatLon[0], fromLatLon[1], 1.001),
    [fromLatLon],
  );
  const toPos = useMemo(
    () => latLonToVector3(toLatLon[0], toLatLon[1], 1.001),
    [toLatLon],
  );

  const arcPts = useMemo(
    () => computeArcPoints(fromPos, toPos, 64),
    [fromPos, toPos],
  );

  const linePoints = useMemo(
    () => arcPts.map((p) => new THREE.Vector3(p.x, p.y, p.z)),
    [arcPts],
  );

  // Spring easing function
  function springEase(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
        ? 1
        : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  useFrame((_, delta) => {
    if (!active || complete) {
      // Fade out the arc line
      if (fadeOut < 1) {
        setFadeOut((f) => Math.min(1, f + delta * 2));
      }
      return;
    }

    progressRef.current += delta / duration;

    if (progressRef.current >= 1) {
      progressRef.current = 1;
      setComplete(true);
      onComplete?.();
      return;
    }

    const t = springEase(Math.min(1, progressRef.current));
    const idx = Math.floor(t * 64);
    const pt = arcPts[Math.min(idx, 64)];

    if (tokenRef.current) {
      tokenRef.current.position.set(pt.x, pt.y, pt.z);
    }

    // Update ghost positions (trail of 6 fading positions)
    ghostsRef.current.forEach((ghost, gi) => {
      const trailT = Math.max(0, t - (gi + 1) * 0.03);
      const trailIdx = Math.floor(trailT * 64);
      const trailPt = arcPts[Math.min(Math.max(0, trailIdx), 64)];
      ghost.position.set(trailPt.x, trailPt.y, trailPt.z);
      const mat = ghost.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - (gi + 1) / 7) * 0.6;
    });
  });

  if (!active && fadeOut >= 1) return null;

  return (
    <group>
      {/* Arc line */}
      <Line
        points={linePoints}
        color={color}
        lineWidth={1.5}
        transparent
        opacity={Math.max(0, 0.4 - fadeOut * 0.4)}
      />

      {/* Flying token */}
      {active && !complete && (
        <mesh ref={tokenRef}>
          <torusGeometry args={[0.015, 0.005, 8, 16]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.8}
          />
        </mesh>
      )}

      {/* Ghost trail */}
      {active &&
        !complete &&
        Array.from({ length: 6 }).map((_, i) => (
          <mesh
            key={i}
            ref={(el) => {
              if (el) ghostsRef.current[i] = el;
            }}
          >
            <sphereGeometry args={[0.008, 6, 6]} />
            <meshBasicMaterial color={color} transparent opacity={0.3} />
          </mesh>
        ))}
    </group>
  );
}
