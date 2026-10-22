"use client";

import React, { useState } from "react";
import { X, Shield, Sparkles } from "lucide-react";
import { useAppStore, type HandoffState, type MemberState, type MomentState } from "@/store";
import { DateTime } from "luxon";

interface HandoffDetailProps {
  handoff: HandoffState;
  moment?: MomentState;
  members: MemberState[];
  simNowMs?: number;
  viewerId: string;
  onClose: () => void;
  onAction: (handoffId: string, outcome: "accepted" | "declined" | "resolved", note?: string) => void;
}

export function HandoffDetail({
  handoff,
  moment,
  members,
  simNowMs: _simNowMs,
  viewerId,
  onClose,
  onAction,
}: HandoffDetailProps) {
  const themeMode = useAppStore((s) => s.themeMode);
  const isLight = themeMode === "light";
  const [resolutionNote, setResolutionNote] = useState("");
  const isAssignee = handoff.assigneeId === viewerId;
  const assignee = members.find((m) => m.id === handoff.assigneeId);
  const captor = members.find((m) => m.id === moment?.capturedBy);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className={`w-full max-w-lg rounded-2xl shadow-2xl p-5 flex flex-col gap-4 text-xs select-none border transition-colors ${
          isLight
            ? "bg-white border-slate-200 text-slate-900"
            : "bg-[#262B52] border-[#3A4178] text-[#EDEAF6]"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase ${
                isLight ? "bg-slate-100 text-slate-700 border border-slate-200" : "bg-[#3A4178] text-[#9AA3D6]"
              }`}
            >
              {handoff.type} • {handoff.status.replace("_", " ")}
            </span>
            {moment?.classification.sensitive && (
              <span className="px-2 py-0.5 rounded bg-[#FF7A7A]/20 text-[#FF7A7A] text-[10px] font-semibold flex items-center gap-1">
                <Shield className="w-3 h-3" /> Sensitive
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded transition-colors ${
              isLight ? "text-slate-400 hover:text-slate-900 hover:bg-slate-100" : "text-[#9AA3D6] hover:text-[#EDEAF6] hover:bg-[#3A4178]"
            }`}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Moment Summary & Original Text */}
        <div className="flex flex-col gap-1.5">
          <h2
            className={`text-base font-display font-semibold ${
              isLight ? "text-slate-900" : "text-[#EDEAF6]"
            }`}
          >
            {moment?.classification.summary || moment?.text || "Care Task"}
          </h2>
          {moment?.text && moment.text !== moment.classification.summary && (
            <p
              className={`italic p-2.5 rounded-lg border ${
                isLight
                  ? "bg-slate-50 border-slate-200 text-slate-700"
                  : "bg-[#14182B]/60 border-[#3A4178] text-[#9AA3D6]"
              }`}
            >
              &ldquo;{moment.text}&rdquo;
            </p>
          )}
        </div>

        {/* Assigned Agent Explanation */}
        {handoff.explanation?.text && (
          <div
            className={`p-3 rounded-lg border-l-2 ${
              isLight
                ? "bg-amber-50/70 border-amber-500"
                : "bg-[#14182B]/80 border-[#FFC66B]"
            }`}
          >
            <div
              className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                isLight ? "text-amber-800" : "text-[#FFC66B]"
              }`}
            >
              <Sparkles className="w-3 h-3" /> Follow-the-Sun Rationale
            </div>
            <p className={isLight ? "text-slate-800 leading-relaxed" : "text-[#EDEAF6] leading-relaxed"}>
              {handoff.explanation.text}
            </p>
          </div>
        )}

        {/* Context metadata */}
        <div
          className={`grid grid-cols-2 gap-3 p-3 rounded-lg border ${
            isLight
              ? "bg-slate-50 border-slate-200"
              : "bg-[#14182B]/40 border-[#3A4178]/60"
          }`}
        >
          <div>
            <span className={`text-[10px] block uppercase ${isLight ? "text-slate-500" : "text-[#9AA3D6]"}`}>
              Captured By
            </span>
            <span className={`font-medium capitalize ${isLight ? "text-slate-900" : "text-[#EDEAF6]"}`}>
              {captor?.name ?? moment?.capturedBy ?? "System"}
            </span>
          </div>
          <div>
            <span className={`text-[10px] block uppercase ${isLight ? "text-slate-500" : "text-[#9AA3D6]"}`}>
              Assignee
            </span>
            <span className={`font-medium capitalize ${isLight ? "text-slate-900" : "text-[#EDEAF6]"}`}>
              {assignee?.name ?? "Unassigned"}
            </span>
          </div>
          <div>
            <span className={`text-[10px] block uppercase ${isLight ? "text-slate-500" : "text-[#9AA3D6]"}`}>
              Load Kind
            </span>
            <span className={`font-medium capitalize ${isLight ? "text-slate-900" : "text-[#EDEAF6]"}`}>
              {moment?.classification.loadKind ?? "Doing"}
            </span>
          </div>
          <div>
            <span className={`text-[10px] block uppercase ${isLight ? "text-slate-500" : "text-[#9AA3D6]"}`}>
              Local Presence
            </span>
            <span className={`font-medium ${isLight ? "text-slate-900" : "text-[#EDEAF6]"}`}>
              {moment?.classification.needsLocalPresence ? "Required (Toronto)" : "Remote eligible"}
            </span>
          </div>
        </div>

        {/* Action section */}
        {isAssignee && handoff.status !== "resolved" && (
          <div className={`flex flex-col gap-2 pt-2 border-t ${isLight ? "border-slate-200" : "border-[#3A4178]"}`}>
            {handoff.status === "accepted" && (
              <div className="flex flex-col gap-1.5">
                <label className={`text-[11px] ${isLight ? "text-slate-600" : "text-[#9AA3D6]"}`}>
                  Resolution note (optional, up to 280 chars):
                </label>
                <input
                  type="text"
                  maxLength={280}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g. Dadi is resting comfortably, next checkup scheduled."
                  className={`px-3 py-1.5 rounded-lg border outline-none text-xs ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-amber-500"
                      : "bg-[#14182B] border-[#3A4178] text-[#EDEAF6] placeholder-[#9AA3D6]/50 focus:border-[#FFC66B]"
                  }`}
                />
              </div>
            )}
            <div className="flex items-center justify-end gap-2 mt-1">
              {handoff.status === "awaiting_acceptance" && (
                <>
                  <button
                    onClick={() => {
                      onAction(handoff.id, "declined");
                      onClose();
                    }}
                    className={`px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                      isLight
                        ? "bg-white border-slate-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                        : "bg-[#14182B] border-[#3A4178] hover:border-[#FF7A7A] text-[#FF7A7A]"
                    }`}
                  >
                    Decline & Reroute
                  </button>
                  <button
                    onClick={() => {
                      onAction(handoff.id, "accepted");
                      onClose();
                    }}
                    className="px-4 py-1.5 rounded-lg bg-[#FFC66B] hover:bg-[#FFD285] text-[#14182B] font-semibold"
                  >
                    Accept Responsibility
                  </button>
                </>
              )}
              {handoff.status === "accepted" && (
                <button
                  onClick={() => {
                    onAction(handoff.id, "resolved", resolutionNote);
                    onClose();
                  }}
                  className="px-4 py-1.5 rounded-lg bg-[#5FD3A0] hover:bg-[#7AE0B2] text-[#14182B] font-semibold"
                >
                  Mark as Resolved
                </button>
              )}
            </div>
          </div>
        )}

        {/* Audit history */}
        {handoff.history && handoff.history.length > 0 && (
          <div className={`flex flex-col gap-1.5 pt-2 border-t ${isLight ? "border-slate-200" : "border-[#3A4178]"}`}>
            <span className={`text-[10px] uppercase tracking-wider font-semibold ${isLight ? "text-slate-500" : "text-[#9AA3D6]"}`}>
              Audit History
            </span>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {handoff.history.map((h, i) => (
                <div key={i} className={`flex items-baseline gap-2 text-[11px] ${isLight ? "text-slate-600" : "text-[#9AA3D6]"}`}>
                  <span className={`font-mono text-[10px] ${isLight ? "text-amber-700 font-semibold" : "text-[#FFC66B]"}`}>
                    {DateTime.fromISO(h.at).toFormat("HH:mm:ss")}
                  </span>
                  <span className={`capitalize font-medium ${isLight ? "text-slate-900" : "text-[#EDEAF6]"}`}>{h.actorId}</span>
                  <span>{h.action}</span>
                  {h.details && <span className={isLight ? "text-slate-400 italic" : "text-[#9AA3D6]/70 italic"}>({h.details})</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
