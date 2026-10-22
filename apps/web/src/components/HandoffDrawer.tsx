"use client";

import React, { useState } from "react";
import { ChevronRight, ChevronLeft, Inbox } from "lucide-react";
import { useAppStore, computeSimNow, type HandoffState } from "@/store";
import { HandoffRow } from "./HandoffRow";
import { HandoffDetail } from "./HandoffDetail";
import { t } from "@/lib/i18n";

export function HandoffDrawer() {
  const household = useAppStore((s) => s.household);
  const viewerId = useAppStore((s) => s.viewerId);
  const language = useAppStore((s) => s.language);
  const themeMode = useAppStore((s) => s.themeMode);
  const clockSkew = useAppStore((s) => s.clockSkew);
  const drawerOpen = useAppStore((s) => s.drawerOpen);
  const setDrawerOpen = useAppStore((s) => s.setDrawerOpen);
  const addToast = useAppStore((s) => s.addToast);

  const isLight = themeMode === "light";
  const [activeTab, setActiveTab] = useState<"all" | "awaiting" | "accepted" | "resolved">("all");
  const [selectedHandoff, setSelectedHandoff] = useState<HandoffState | null>(null);

  const simNowMs = household?.clock ? computeSimNow(household.clock, clockSkew) : Date.now();
  const handoffs = household?.handoffs ?? [];
  const moments = household?.moments ?? [];
  const members = household?.members ?? [];

  const filteredHandoffs = handoffs.filter((h) => {
    if (activeTab === "awaiting") return h.status === "awaiting_acceptance";
    if (activeTab === "accepted") return h.status === "accepted";
    if (activeTab === "resolved") return h.status === "resolved";
    return true;
  });

  const handleAction = async (
    handoffId: string,
    outcome: "accepted" | "declined" | "resolved",
    note?: string
  ) => {
    try {
      const res = await fetch("/api/tools/record_resolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handoff_id: handoffId,
          actor_id: viewerId,
          outcome,
          note,
        }),
      });
      const data = await res.json();
      if (data.isError) {
        addToast(data.error?.message || "Failed to record action", "error");
      } else {
        addToast(`Handoff ${outcome} successfully`, "success");
      }
    } catch {
      addToast("Network error executing action", "error");
    }
  };

  return (
    <>
      {/* Drawer Toggle Tab for Desktop/Tablet */}
      <button
        onClick={() => setDrawerOpen(!drawerOpen)}
        className={`fixed right-0 top-20 z-20 p-2 rounded-l-lg shadow-md transition-all border-l border-y ${
          isLight
            ? "bg-white border-slate-300 text-slate-700 hover:text-slate-900"
            : "bg-[#262B52] border-[#3A4178] text-[#9AA3D6] hover:text-[#EDEAF6]"
        }`}
        title={drawerOpen ? "Close handoffs drawer" : "Open handoffs drawer"}
      >
        {drawerOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Slide-out Drawer Panel */}
      <aside
        className={`fixed top-14 bottom-0 right-0 z-20 w-full sm:w-[360px] shadow-2xl flex flex-col transition-transform duration-300 border-l ${
          isLight
            ? "bg-white/98 backdrop-blur border-slate-200 text-slate-900"
            : "bg-[#262B52]/95 backdrop-blur border-[#3A4178] text-[#EDEAF6]"
        } ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Drawer Header */}
        <div
          className={`p-3 border-b flex items-center justify-between ${
            isLight ? "border-slate-200" : "border-[#3A4178]"
          }`}
        >
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-sm">
              {t("careHandoffs", language)}
            </h2>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                isLight ? "bg-amber-100 text-amber-800" : "bg-[#14182B] text-[#FFC66B]"
              }`}
            >
              {handoffs.length}
            </span>
          </div>

          {/* Filter tabs and Close */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1 p-0.5 rounded-lg text-[10px] font-medium ${
                isLight ? "bg-slate-100 border border-slate-200" : "bg-[#14182B]"
              }`}
            >
              {(["all", "awaiting", "accepted", "resolved"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-0.5 rounded capitalize transition-colors ${
                    activeTab === tab
                      ? isLight
                        ? "bg-white text-slate-900 font-semibold shadow-xs"
                        : "bg-[#3A4178] text-[#EDEAF6] font-semibold"
                      : isLight
                      ? "text-slate-500 hover:text-slate-900"
                      : "text-[#9AA3D6] hover:text-[#EDEAF6]"
                  }`}
                >
                  {t(tab, language)}
                </button>
              ))}
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className={`p-1 rounded transition-colors ${
                isLight ? "text-slate-400 hover:text-slate-800 hover:bg-slate-100" : "text-[#9AA3D6] hover:text-[#EDEAF6] hover:bg-[#14182B]"
              }`}
              title="Close drawer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Handoffs List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredHandoffs.length === 0 ? (
            <div
              className={`h-48 flex flex-col items-center justify-center text-center p-4 ${
                isLight ? "text-slate-500" : "text-[#9AA3D6]"
              }`}
            >
              <Inbox className={`w-8 h-8 stroke-1 mb-2 ${isLight ? "text-slate-300" : "text-[#3A4178]"}`} />
              <p className={`text-xs font-medium ${isLight ? "text-slate-900" : "text-[#EDEAF6]"}`}>
                {t("nothingWaiting", language)}
              </p>
              <p className={`text-[11px] mt-1 ${isLight ? "text-slate-500" : "text-[#9AA3D6]"}`}>
                {t("allInSafeHands", language)}
              </p>
            </div>
          ) : (
            filteredHandoffs.map((handoff) => {
              const moment = moments.find((m) => m.id === handoff.momentId);
              const assignee = members.find((m) => m.id === handoff.assigneeId);
              return (
                <HandoffRow
                  key={handoff.id}
                  handoff={handoff}
                  moment={moment}
                  assignee={assignee}
                  simNowMs={simNowMs}
                  viewerId={viewerId}
                  onSelect={(h) => setSelectedHandoff(h)}
                  onAction={handleAction}
                />
              );
            })
          )}
        </div>
      </aside>

      {/* Detail Modal */}
      {selectedHandoff && (
        <HandoffDetail
          handoff={selectedHandoff}
          moment={moments.find((m) => m.id === selectedHandoff.momentId)}
          members={members}
          simNowMs={simNowMs}
          viewerId={viewerId}
          onClose={() => setSelectedHandoff(null)}
          onAction={handleAction}
        />
      )}
    </>
  );
}
