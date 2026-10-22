"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import type { HandoffState, MemberState, MomentState } from "@/store";
import { DateTime } from "luxon";

interface HandoffRowProps {
  handoff: HandoffState;
  moment?: MomentState;
  assignee?: MemberState;
  simNowMs: number;
  viewerId: string;
  onSelect: (handoff: HandoffState) => void;
  onAction: (handoffId: string, outcome: "accepted" | "declined" | "resolved") => void;
}

export function HandoffRow({
  handoff,
  moment,
  assignee,
  simNowMs,
  viewerId,
  onSelect,
  onAction,
}: HandoffRowProps) {
  const isAssignee = handoff.assigneeId === viewerId;

  // Local time for assignee
  const assigneeLocalTime = assignee
    ? DateTime.fromMillis(simNowMs, { zone: assignee.timeZone }).toFormat("HH:mm")
    : null;

  // Badge icon and style
  const getBadge = () => {
    if (handoff.status === "resolved") {
      return (
        <span
          className="w-3.5 h-3.5 rounded-full flex items-center justify-center bg-[#5FD3A0] text-[#14182B]"
          title="Resolved"
        >
          ✓
        </span>
      );
    }
    if (handoff.type === "memory") {
      return (
        <span
          className="w-3.5 h-3.5 flex items-center justify-center text-[#B08CFF]"
          title="Shared memory"
        >
          ★
        </span>
      );
    }
    if (moment?.classification.urgency === "urgent_not_emergency") {
      return (
        <span
          className="w-3.5 h-3.5 flex items-center justify-center text-[#FF7A7A] font-bold"
          title="Urgent"
        >
          ▲
        </span>
      );
    }
    if (handoff.status === "awaiting_acceptance") {
      return (
        <span
          className="w-3.5 h-3.5 rounded-full border-2 border-[#FFB547] animate-pulse-waiting"
          title="Waiting for acceptance"
        />
      );
    }
    return (
      <span
        className="w-3.5 h-3.5 rounded-full bg-[#5B9CFF]"
        title="Accepted contribution"
      />
    );
  };

  const title = moment?.classification.summary || moment?.text || "Handoff task";

  return (
    <div
      onClick={() => onSelect(handoff)}
      className="p-3 bg-[#262B52]/60 hover:bg-[#262B52] border border-[#3A4178] rounded-lg transition-all cursor-pointer flex flex-col gap-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="mt-0.5 shrink-0">{getBadge()}</div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#EDEAF6] leading-snug line-clamp-2">
              {title}
            </p>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-[#9AA3D6]">
              {assignee ? (
                <span>
                  To <strong className="text-[#EDEAF6] capitalize">{assignee.name}</strong>{" "}
                  {assigneeLocalTime && (
                    <span className="font-mono text-[10px]">({assigneeLocalTime})</span>
                  )}
                </span>
              ) : (
                <span className="text-[#FF7A7A]">Unassigned</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {handoff.status === "awaiting_acceptance" && isAssignee && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onAction(handoff.id, "accepted")}
                className="px-2 py-1 rounded bg-[#FFC66B] hover:bg-[#FFD285] text-[#14182B] text-xs font-semibold transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => onAction(handoff.id, "declined")}
                className="px-1.5 py-1 rounded bg-[#14182B] border border-[#3A4178] hover:border-[#FF7A7A] text-[#9AA3D6] hover:text-[#FF7A7A] text-xs transition-colors"
                title="Decline and reroute"
              >
                Decline
              </button>
            </div>
          )}

          {handoff.status === "accepted" && isAssignee && (
            <button
              onClick={() => onAction(handoff.id, "resolved")}
              className="px-2.5 py-1 rounded bg-[#5FD3A0] hover:bg-[#7AE0B2] text-[#14182B] text-xs font-semibold transition-colors"
            >
              Resolve
            </button>
          )}

          {handoff.status === "resolved" && (
            <span className="text-[11px] font-mono text-[#5FD3A0] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Resolved
            </span>
          )}

          {handoff.status === "awaiting_acceptance" && !isAssignee && (
            <span className="text-[11px] font-mono text-[#FFB547]">
              Waiting
            </span>
          )}

          {handoff.status === "accepted" && !isAssignee && (
            <span className="text-[11px] font-mono text-[#5B9CFF]">
              In progress
            </span>
          )}
        </div>
      </div>

      {/* Explanation snippet if available */}
      {handoff.explanation?.text && (
        <div className="text-[11px] text-[#9AA3D6] italic bg-[#14182B]/40 px-2 py-1 rounded border-l-2 border-[#FFC66B]/50 line-clamp-1">
          &ldquo;{handoff.explanation.text}&rdquo;
        </div>
      )}
    </div>
  );
}
