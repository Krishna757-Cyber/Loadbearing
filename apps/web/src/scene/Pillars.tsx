/**
 * Pillars — One emissive cylinder per caregiver, height = share of load.
 * Awake: Lantern glow. Asleep: Moon muted.
 * Ghost outline for hidden load pillars.
 */
"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { latLonToVector3, type Vec3 } from "./math";
import type { MemberState, LoadEntryState } from "../store";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PillarData {
  member: MemberState;
  share: number;
  isAwake: boolean;
  isViewer: boolean;
  loadVisible: boolean;
}

interface PillarsProps {
  members: MemberState[];
  loadEntries: LoadEntryState[];
  viewerId: string;
  simNow: number;
  sunDirRef: React.RefObject<Vec3 | null>;
  cameraRef: React.RefObject<THREE.PerspectiveCamera | null>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Check if all caregivers have consentShare = true.
 */
function allConsented(members: MemberState[]): boolean {
  return members
    .filter((m) => m.role === "caregiver")
    .every((m) => m.consentShare);
}

/**
 * Check if a member is awake based on their timezone and simulated time.
 */
function isMemberAwake(member: MemberState, simNow: number): boolean {
  const date = new Date(simNow);
  // Get local time in member's timezone
  const localTimeStr = date.toLocaleString("en-US", {
    timeZone: member.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [h, m] = localTimeStr.split(":").map(Number);
  const minutes = h * 60 + m;

  const [awH, awM] = member.awakeStart.split(":").map(Number);
  const [asH, asM] = member.awakeEnd.split(":").map(Number);
  const awakeStart = awH * 60 + awM;
  const awakeEnd = asH * 60 + asM;

  if (awakeStart <= awakeEnd) {
    return minutes >= awakeStart && minutes < awakeEnd;
  }
  // Overnight window (e.g. night-shift)
  return minutes >= awakeStart || minutes < awakeEnd;
}

/**
 * Compute load shares for each caregiver.
 */
function computeShares(
  members: MemberState[],
  loadEntries: LoadEntryState[],
  simNow: number,
): Map<string, number> {
  const caregivers = members.filter((m) => m.role === "caregiver");
  const windowStart = simNow - 7 * 24 * 60 * 60 * 1000;

  const totals = new Map<string, number>();
  for (const cg of caregivers) totals.set(cg.id, 0);

  let totalWeight = 0;
  for (const entry of (loadEntries ?? [])) {
    const t = new Date(entry.performedAt).getTime();
    if (t >= windowStart && totals.has(entry.memberId)) {
      totals.set(entry.memberId, (totals.get(entry.memberId) ?? 0) + entry.effectiveWeight);
      totalWeight += entry.effectiveWeight;
    }
  }

  const shares = new Map<string, number>();
  for (const cg of caregivers) {
    shares.set(cg.id, totalWeight > 0 ? ((totals.get(cg.id) ?? 0) / totalWeight) * 100 : 0);
  }
  return shares;
}

/**
 * Fan out co-located members by offsetting longitude slightly.
 */
function fanOutPosition(
  member: MemberState,
  allMembers: MemberState[],
): { lat: number; lon: number } {
  const coLocated = allMembers.filter(
    (m) => m.city === member.city && m.id !== member.id,
  );
  if (coLocated.length === 0) return { lat: member.lat, lon: member.lon };

  const all = [member, ...coLocated].sort((a, b) => a.id.localeCompare(b.id));
  const idx = all.findIndex((m) => m.id === member.id);
  const offset = (idx - (all.length - 1) / 2) * 1.5;
  return { lat: member.lat, lon: member.lon + offset };
}

// ─── Pillar Component ───────────────────────────────────────────────────────

function Pillar({
  data,
  cameraRef,
}: {
  data: PillarData;
  cameraRef: React.RefObject<THREE.PerspectiveCamera | null>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const targetHeight = useRef(0.08);
  const currentHeight = useRef(0.08);
  const labelOpacity = useRef(1);

  const position = useMemo(() => {
    return latLonToVector3(data.member.lat, data.member.lon, 1.001);
  }, [data.member.lat, data.member.lon]);

  const quaternion = useMemo(() => {
    const normal = new THREE.Vector3(position.x, position.y, position.z).normalize();
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    return q;
  }, [position]);

  // Smoothly animate pillar height
  const showHeight = data.loadVisible || data.isViewer;
  targetHeight.current = showHeight
    ? 0.08 + (data.share / 100) * 0.5
    : 0.15; // ghost neutral height

  const color = data.isAwake ? "#FFC66B" : "#9AA3D6";
  const opacity = data.isAwake ? 1.0 : 0.55;

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Spring towards target height
    const diff = targetHeight.current - currentHeight.current;
    currentHeight.current += diff * Math.min(1, delta * 5);

    groupRef.current.scale.set(1, currentHeight.current, 1);

    // Update label opacity based on facing
    if (cameraRef.current) {
      const camDir = new THREE.Vector3();
      cameraRef.current.getWorldDirection(camDir);
      const normal = new THREE.Vector3(position.x, position.y, position.z).normalize();
      const d = normal.dot(camDir.negate());
      labelOpacity.current = THREE.MathUtils.smoothstep(d, 0.05, 0.3);
    }
  });

  const isRecipient = data.member.role === "recipient";

  return (
    <group
      position={[position.x, position.y, position.z]}
      quaternion={quaternion}
    >
      <group ref={groupRef}>
        {isRecipient ? (
          // Dadi marker: small house shape (box)
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[0.02, 0.02, 0.02]} />
            <meshStandardMaterial
              color="#FFC66B"
              emissive="#FFC66B"
              emissiveIntensity={0.3}
            />
          </mesh>
        ) : showHeight ? (
          // Normal pillar
          <mesh>
            <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={data.isAwake ? 0.5 : 0.2}
              transparent
              opacity={opacity}
            />
          </mesh>
        ) : (
          // Ghost outline pillar
          <mesh>
            <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
            <meshStandardMaterial
              color="#9AA3D6"
              transparent
              opacity={0.2}
              wireframe
            />
          </mesh>
        )}

        {/* Awake halo ring */}
        {data.isAwake && !isRecipient && (
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
            <ringGeometry args={[0.015, 0.025, 16]} />
            <meshBasicMaterial
              color="#FFC66B"
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>

      {/* Label */}
      <Html
        position={[0, currentHeight.current + 0.05, 0]}
        center
        style={{
          opacity: labelOpacity.current,
          pointerEvents: "none",
          transition: "opacity 0.3s",
        }}
        distanceFactor={2}
      >
        <div
          style={{
            color: "#EDEAF6",
            fontSize: "10px",
            fontFamily: "sans-serif",
            textAlign: "center",
            whiteSpace: "nowrap",
            textShadow: "0 1px 3px rgba(0,0,0,0.8)",
          }}
        >
          <div style={{ fontWeight: 600 }}>{data.member.name}</div>
          <div style={{ fontSize: "9px", color: "#9AA3D6" }}>
            {data.isAwake ? "☀ Awake" : "☽ Asleep"}
          </div>
          {showHeight && !isRecipient && (
            <div style={{ fontSize: "9px", color: "#FFC66B" }}>
              {data.share.toFixed(1)}%
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

// ─── Pillars Group ──────────────────────────────────────────────────────────

export function Pillars({
  members,
  loadEntries,
  viewerId,
  simNow,
  sunDirRef: _sunDirRef,
  cameraRef,
}: PillarsProps) {
  const loadVisible = allConsented(members);
  const shares = useMemo(
    () => computeShares(members, loadEntries, simNow),
    [members, loadEntries, simNow],
  );

  const pillars: PillarData[] = useMemo(
    () =>
      members.map((member) => {
        const pos = fanOutPosition(member, members);
        return {
          member: { ...member, lat: pos.lat, lon: pos.lon },
          share: shares.get(member.id) ?? 0,
          isAwake: isMemberAwake(member, simNow),
          isViewer: member.id === viewerId,
          loadVisible,
        };
      }),
    [members, shares, simNow, viewerId, loadVisible],
  );

  return (
    <group>
      {pillars.map((data) => (
        <Pillar key={data.member.id} data={data} cameraRef={cameraRef} />
      ))}
    </group>
  );
}
