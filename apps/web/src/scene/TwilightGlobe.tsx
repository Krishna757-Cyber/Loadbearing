/**
 * TwilightGlobe — Main 3D scene composition.
 * Canvas with day/night globe, pillars, tokens, arcs, camera rig.
 */
"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { Ocean } from "./Ocean";
import { LandDots } from "./LandDots";
import { Atmosphere } from "./Atmosphere";
import { Pillars } from "./Pillars";
import { Tokens } from "./Tokens";
import { sunDirection, overviewDirection, latLonToVector3, type Vec3 } from "./math";
import { useAppStore, computeSimNow } from "../store";

// ─── Camera Rig ─────────────────────────────────────────────────────────────

function CameraRig() {
  const { camera } = useThree();
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const household = useAppStore((s) => s.household);
  const [introComplete, setIntroComplete] = useState(false);
  const introProgress = useRef(0);

  // Overview direction from member positions
  const overviewDir = useRef<Vec3>({ x: 0, y: 0, z: 1 });

  useEffect(() => {
    if (!household) return;
    const caregivers = household.members.filter((m) => m.role === "caregiver");
    const positions = caregivers.map((m) => latLonToVector3(m.lat, m.lon));
    overviewDir.current = overviewDirection(positions);
  }, [household]);

  // Intro dolly: 5 -> 3.1 over 2.5s
  useFrame((_, delta) => {
    if (!introComplete) {
      introProgress.current += delta / 2.5;
      if (introProgress.current >= 1) {
        introProgress.current = 1;
        setIntroComplete(true);
      }
      const t = introProgress.current;
      const dist = 5 - t * (5 - 3.4);
      const dir = overviewDir.current;
      camera.position.set(dir.x * dist, dir.y * dist + 0.15, dir.z * dist);
      camera.lookAt(0, 0, 0);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableDamping
      dampingFactor={0.05}
      minDistance={1.8}
      maxDistance={4}
      makeDefault
    />
  );
}

// ─── Sun Updater ────────────────────────────────────────────────────────────

function SunUpdater({
  sunDirRef,
}: {
  sunDirRef: React.RefObject<Vec3 | null>;
}) {
  const household = useAppStore((s) => s.household);
  const clockSkew = useAppStore((s) => s.clockSkew);

  useFrame(() => {
    if (!household) return;
    const simNow = computeSimNow(household.clock, clockSkew);
    const sun = sunDirection(new Date(simNow));
    if (sunDirRef.current) {
      sunDirRef.current.x = sun.x;
      sunDirRef.current.y = sun.y;
      sunDirRef.current.z = sun.z;
    }
  });

  return null;
}

// ─── Scene Content ──────────────────────────────────────────────────────────

function SceneContent() {
  const sunDirRef = useRef<Vec3>({ x: 1, y: 0, z: 0 });
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const household = useAppStore((s) => s.household);
  const viewerId = useAppStore((s) => s.viewerId);
  const clockSkew = useAppStore((s) => s.clockSkew);
  const [reducedDots, setReducedDots] = useState(false);
  const setSceneMode = useAppStore((s) => s.setSceneMode);

  const { camera } = useThree();

  useEffect(() => {
    cameraRef.current = camera as THREE.PerspectiveCamera;
  }, [camera]);

  const simNow = household
    ? computeSimNow(household.clock, clockSkew)
    : Date.now();

  return (
    <>
      <SunUpdater sunDirRef={sunDirRef} />
      <CameraRig />

      <PerformanceMonitor
        onDecline={() => setReducedDots(true)}
        onFallback={() => setSceneMode("2d")}
      />

      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 3, 5]} intensity={0.3} />

      <Ocean sunDirRef={sunDirRef} />
      <LandDots sunDirRef={sunDirRef} reduced={reducedDots} />
      <Atmosphere sunDirRef={sunDirRef} />

      {household && (
        <>
          <Pillars
            members={household.members ?? []}
            loadEntries={household.loadEntries ?? []}
            viewerId={viewerId}
            simNow={simNow}
            sunDirRef={sunDirRef}
            cameraRef={cameraRef}
          />
          <Tokens
            members={household.members ?? []}
            loadEntries={household.loadEntries ?? []}
            handoffs={household.handoffs ?? []}
            moments={household.moments ?? []}
            simNow={simNow}
          />
        </>
      )}
    </>
  );
}

// ─── Exported Globe ─────────────────────────────────────────────────────────

export function TwilightGlobe() {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1,
      }}
      camera={{ fov: 35, near: 0.1, far: 100, position: [0, 0, 5] }}
      style={{ background: "#14182B" }}
      aria-hidden="true"
    >
      <SceneContent />
    </Canvas>
  );
}
