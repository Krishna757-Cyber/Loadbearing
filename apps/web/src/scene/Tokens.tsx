/**
 * Tokens — Care work tokens stacked above each pillar.
 * Shape/color encoding:
 *  - contribution = disc #5B9CFF
 *  - awaiting_acceptance = torus #FFB547 (pulsing)
 *  - urgent = octahedron #FF7A7A
 *  - family memory = star #B08CFF
 *  - resolved = disc #5FD3A0
 */
"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { latLonToVector3 } from "./math";
import type { LoadEntryState, HandoffState, MomentState, MemberState } from "../store";

// ─── Token Type Determination ───────────────────────────────────────────────

type TokenType = "contribution" | "waiting" | "urgent" | "memory" | "resolved";

interface TokenInfo {
  type: TokenType;
  memberId: string;
  lat: number;
  lon: number;
}

function getTokenColor(type: TokenType): string {
  switch (type) {
    case "contribution": return "#5B9CFF";
    case "waiting": return "#FFB547";
    case "urgent": return "#FF7A7A";
    case "memory": return "#B08CFF";
    case "resolved": return "#5FD3A0";
  }
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface TokensProps {
  members: MemberState[];
  loadEntries: LoadEntryState[];
  handoffs: HandoffState[];
  moments: MomentState[];
  simNow: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Tokens({
  members,
  loadEntries,
  handoffs,
  moments,
  simNow: _simNow,
}: TokensProps) {
  const groupRef = useRef<THREE.Group>(null);
  const pulseClock = useRef(0);

  // Build token list per member
  const tokensPerMember = useMemo(() => {
    const result = new Map<string, TokenInfo[]>();

    for (const m of members) {
      result.set(m.id, []);
    }

    // LoadEntry tokens
    for (const entry of (loadEntries ?? [])) {
      const member = members.find((m) => m.id === entry.memberId);
      if (!member) continue;

      let type: TokenType = "contribution";

      // Check if linked to a handoff
      if (entry.handoffId) {
        const handoff = handoffs.find((h) => h.id === entry.handoffId);
        if (handoff?.status === "resolved") type = "resolved";
        else if (handoff?.status === "awaiting_acceptance") type = "waiting";
      }

      // Check if linked to a memory moment
      if (entry.momentId) {
        const moment = moments.find((mo) => mo.id === entry.momentId);
        if (moment?.classification.kind === "memory") type = "memory";
      }

      const tokens = result.get(entry.memberId) ?? [];
      tokens.push({ type, memberId: entry.memberId, lat: member.lat, lon: member.lon });
      result.set(entry.memberId, tokens);
    }

    // Open handoff tokens on assignee
    for (const h of handoffs) {
      if (h.status === "awaiting_acceptance" || h.status === "accepted") {
        const memberId = h.assigneeId ?? "dadi"; // unassigned hover over dadi
        const member = members.find((m) => m.id === memberId);
        if (!member) continue;

        const moment = moments.find((mo) => mo.id === h.momentId);
        const isUrgent = moment?.classification.urgency === "urgent_not_emergency";

        const tokens = result.get(memberId) ?? [];
        tokens.push({
          type: isUrgent ? "urgent" : "waiting",
          memberId,
          lat: member.lat,
          lon: member.lon,
        });
        result.set(memberId, tokens);
      }
    }

    return result;
  }, [members, loadEntries, handoffs, moments]);

  useFrame((_, delta) => {
    pulseClock.current += delta;
  });

  // Render tokens as simple meshes (max 12 per pillar)
  const allTokenElements: React.ReactNode[] = [];

  tokensPerMember.forEach((tokens, memberId) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    // Fan out co-located
    const coLocated = members.filter(
      (m) => m.city === member.city && m.id !== member.id,
    );
    let lat = member.lat;
    let lon = member.lon;
    if (coLocated.length > 0) {
      const all = [member, ...coLocated].sort((a, b) => a.id.localeCompare(b.id));
      const idx = all.findIndex((m) => m.id === member.id);
      lon += (idx - (all.length - 1) / 2) * 1.5;
    }

    const surfaceNormal = latLonToVector3(lat, lon);
    const displayTokens = tokens.slice(0, 12);
    const _overflow = tokens.length - 12;

    // Compute base pillar top — approximate
    const pillarBasePos = latLonToVector3(lat, lon, 1.001);
    // We'll approximate pillar height as 0.15 (will be synced by actual data later)
    const pillarHeight = 0.15;

    displayTokens.forEach((token, i) => {
      const angle = i * 40 * (Math.PI / 180);
      const rise = 0.014 * i + pillarHeight + 0.03;
      const radius = 0.03;

      const x = pillarBasePos.x + surfaceNormal.x * rise + radius * Math.cos(angle) * (surfaceNormal.z > 0 ? 1 : -1);
      const y = pillarBasePos.y + surfaceNormal.y * rise + radius * Math.sin(angle);
      const z = pillarBasePos.z + surfaceNormal.z * rise;

      const color = getTokenColor(token.type);
      const isPulsing = token.type === "waiting";
      const scale = isPulsing
        ? 0.018 + Math.sin(pulseClock.current * 3) * 0.004
        : 0.018;

      allTokenElements.push(
        <mesh
          key={`${memberId}-${i}`}
          position={[x, y, z]}
          scale={[scale, scale, scale]}
        >
          {token.type === "waiting" ? (
            <torusGeometry args={[0.5, 0.2, 8, 16]} />
          ) : token.type === "urgent" ? (
            <octahedronGeometry args={[0.5]} />
          ) : token.type === "memory" ? (
            <dodecahedronGeometry args={[0.5]} />
          ) : (
            <sphereGeometry args={[0.5, 8, 8]} />
          )}
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isPulsing ? 0.8 : 0.4}
            transparent
            opacity={0.9}
          />
        </mesh>,
      );
    });
  });

  return <group ref={groupRef}>{allTokenElements}</group>;
}
