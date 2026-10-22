/**
 * FallbackStrip — 2D SVG time-zone strip when WebGL is unavailable.
 * Shows 24-hour strips with awake windows, now markers, and load bars.
 */
"use client";

import { useAppStore, computeSimNow } from "../store";

function formatLocalTime(simNow: number, timeZone: string): string {
  return new Date(simNow).toLocaleString("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function parseHHMM(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

export function FallbackStrip() {
  const household = useAppStore((s) => s.household);
  const clockSkew = useAppStore((s) => s.clockSkew);
  const viewerId = useAppStore((s) => s.viewerId);

  if (!household) {
    return (
      <div
        style={{
          color: "#9AA3D6",
          textAlign: "center",
          padding: "2rem",
          fontFamily: "sans-serif",
        }}
      >
        Loading household data...
      </div>
    );
  }

  const simNow = computeSimNow(household.clock, clockSkew);
  const caregivers = household.members.filter((m) => m.role === "caregiver");

  // Check all consented
  const allConsented = caregivers.every((m) => m.consentShare);

  // Compute shares
  const windowStart = simNow - 7 * 24 * 60 * 60 * 1000;
  const totals = new Map<string, number>();
  let totalWeight = 0;
  for (const cg of caregivers) totals.set(cg.id, 0);
  for (const entry of (household.loadEntries ?? [])) {
    const t = new Date(entry.performedAt).getTime();
    if (t >= windowStart && totals.has(entry.memberId)) {
      totals.set(entry.memberId, (totals.get(entry.memberId) ?? 0) + entry.effectiveWeight);
      totalWeight += entry.effectiveWeight;
    }
  }

  const stripWidth = 600;
  const stripHeight = 60;
  const hourWidth = stripWidth / 24;

  return (
    <div
      style={{
        padding: "1.5rem",
        background: "#14182B",
        color: "#EDEAF6",
        fontFamily: "'Atkinson Hyperlegible', sans-serif",
        minHeight: "100vh",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <h2
          style={{
            fontSize: "20px",
            fontWeight: 600,
            fontFamily: "'Bricolage Grotesque', sans-serif",
            margin: 0,
          }}
        >
          Time Zone Overview
        </h2>
        <span
          style={{
            fontSize: "11px",
            padding: "2px 8px",
            borderRadius: "4px",
            background: "#262B52",
            border: "1px solid #3A4178",
            color: "#9AA3D6",
          }}
        >
          2D fallback
        </span>
      </div>

      {household.members.map((member) => {
        const localTime = formatLocalTime(simNow, member.timeZone);
        const [localH] = localTime.split(":").map(Number);
        const awakeStart = parseHHMM(member.awakeStart);
        const awakeEnd = parseHHMM(member.awakeEnd);
        const isCaregiver = member.role === "caregiver";

        const share =
          isCaregiver && totalWeight > 0
            ? ((totals.get(member.id) ?? 0) / totalWeight) * 100
            : 0;

        const showShare = isCaregiver && (allConsented || member.id === viewerId);

        return (
          <div key={member.id} style={{ marginBottom: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.25rem",
              }}
            >
              <span style={{ fontWeight: 600 }}>
                {member.name}{" "}
                <span style={{ color: "#9AA3D6", fontWeight: 400 }}>
                  {member.city} · {localTime}
                </span>
              </span>
              {showShare && (
                <span style={{ color: "#FFC66B" }}>{share.toFixed(1)}%</span>
              )}
            </div>

            <svg
              width={stripWidth}
              height={stripHeight}
              viewBox={`0 0 ${stripWidth} ${stripHeight}`}
              style={{ display: "block" }}
            >
              {/* Background (sleep) */}
              <rect
                width={stripWidth}
                height={stripHeight}
                fill="#171C3A"
                rx={4}
              />

              {/* Awake window */}
              {awakeStart <= awakeEnd ? (
                <rect
                  x={(awakeStart / (24 * 60)) * stripWidth}
                  y={0}
                  width={((awakeEnd - awakeStart) / (24 * 60)) * stripWidth}
                  height={stripHeight}
                  fill="#262B52"
                  rx={4}
                />
              ) : (
                <>
                  <rect
                    x={(awakeStart / (24 * 60)) * stripWidth}
                    y={0}
                    width={((24 * 60 - awakeStart) / (24 * 60)) * stripWidth}
                    height={stripHeight}
                    fill="#262B52"
                  />
                  <rect
                    x={0}
                    y={0}
                    width={(awakeEnd / (24 * 60)) * stripWidth}
                    height={stripHeight}
                    fill="#262B52"
                  />
                </>
              )}

              {/* Hour markers */}
              {Array.from({ length: 25 }).map((_, i) => (
                <g key={i}>
                  <line
                    x1={i * hourWidth}
                    y1={0}
                    x2={i * hourWidth}
                    y2={stripHeight}
                    stroke="#3A4178"
                    strokeWidth={0.5}
                  />
                  {i % 6 === 0 && i < 24 && (
                    <text
                      x={i * hourWidth + 3}
                      y={stripHeight - 4}
                      fill="#9AA3D6"
                      fontSize={8}
                    >
                      {String(i).padStart(2, "0")}:00
                    </text>
                  )}
                </g>
              ))}

              {/* Now marker */}
              <line
                x1={(localH / 24) * stripWidth}
                y1={0}
                x2={(localH / 24) * stripWidth}
                y2={stripHeight}
                stroke="#FFC66B"
                strokeWidth={2}
              />
              <circle
                cx={(localH / 24) * stripWidth}
                cy={5}
                r={3}
                fill="#FFC66B"
              />

              {/* Load bar (bottom) */}
              {showShare && (
                <rect
                  x={0}
                  y={stripHeight - 4}
                  width={(share / 100) * stripWidth}
                  height={4}
                  fill="#FFC66B"
                  rx={2}
                />
              )}
            </svg>
          </div>
        );
      })}

      {/* Handoff list */}
      <h3
        style={{
          fontSize: "16px",
          fontWeight: 600,
          marginTop: "2rem",
          marginBottom: "0.75rem",
          fontFamily: "'Bricolage Grotesque', sans-serif",
        }}
      >
        Active Handoffs
      </h3>
      {household.handoffs.filter((h) =>
        ["awaiting_acceptance", "accepted"].includes(h.status),
      ).length === 0 ? (
        <p style={{ color: "#9AA3D6" }}>Nothing is waiting on anyone.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {household.handoffs
            .filter((h) =>
              ["awaiting_acceptance", "accepted"].includes(h.status),
            )
            .map((h) => {
              const moment = household.moments.find(
                (m) => m.id === h.momentId,
              );
              const assignee = household.members.find(
                (m) => m.id === h.assigneeId,
              );

              return (
                <li
                  key={h.id}
                  style={{
                    padding: "0.75rem",
                    background: "#262B52",
                    borderRadius: "4px",
                    border: "1px solid #3A4178",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    {moment?.classification.summary ?? "Task"}
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#9AA3D6",
                      marginTop: "0.25rem",
                    }}
                  >
                    {h.status === "awaiting_acceptance"
                      ? `Waiting for ${assignee?.name ?? "someone"}`
                      : `Accepted by ${assignee?.name ?? "someone"}`}
                  </div>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
