"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { useAppStore, type HandoffState, type MemberState, type MomentState } from "@/store";
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
  const themeMode = useAppStore((s) => s.themeMode);
  const isLight = themeMode === "light";
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
      className={`p-3 rounded-xl transition-all cursor-pointer flex flex-col gap-2 border shadow-sm ${
        isLight
          ? "bg-slate-50 hover:bg-slate-100/90 border-slate-200 text-slate-900"
          : "bg-[#262B52]/60 hover:bg-[#262B52] border-[#3A4178] text-[#EDEAF6]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="mt-0.5 shrink-0">{getBadge()}</div>
          <div className="min-w-0">
            <p
              className={`text-xs font-semibold leading-snug line-clamp-2 ${
                isLight ? "text-slate-900" : "text-[#EDEAF6]"
              }`}
            >
              {title}
            </p>
            <div
              className={`flex items-center gap-2 mt-1 text-[11px] ${
                isLight ? "text-slate-600" : "text-[#9AA3D6]"
              }`}
            >
              {assignee ? (
                <span>
                  To <strong className={isLight ? "text-slate-900 capitalize" : "text-[#EDEAF6] capitalize"}>{assignee.name}</strong>{" "}
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
                className={`px-1.5 py-1 rounded text-xs transition-colors border ${
                  isLight
                    ? "bg-white border-slate-300 text-slate-600 hover:text-red-600 hover:border-red-400"
                    : "bg-[#14182B] border-[#3A4178] text-[#9AA3D6] hover:text-[#FF7A7A]"
                }`}
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
            <span className="text-[11px] font-mono text-[#10B981] font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Resolved
            </span>
          )}

          {handoff.status === "awaiting_acceptance" && !isAssignee && (
            <span className="text-[11px] font-mono text-[#D97706] font-medium">
              Waiting
            </span>
          )}

          {handoff.status === "accepted" && !isAssignee && (
            <span className="text-[11px] font-mono text-[#2563EB] font-medium">
              In progress
            </span>
          )}
        </div>
      </div>

      {/* Explanation snippet if available */}
      {handoff.explanation?.text && (
        <div
          className={`text-[11px] italic px-2.5 py-1.5 rounded-lg border-l-2 line-clamp-1 ${
            isLight
              ? "bg-slate-100 border-amber-500 text-slate-700"
              : "bg-[#14182B]/40 border-[#FFC66B]/50 text-[#9AA3D6]"
          }`}
        >
          &ldquo;{handoff.explanation.text}&rdquo;
        </div>
      )}
    </div>
  );
}
