"use client";

import React, { useState } from "react";
import { ChevronRight, ChevronLeft, Inbox } from "lucide-react";
import { useAppStore, computeSimNow, type HandoffState } from "@/store";
import { HandoffRow } from "./HandoffRow";
import { HandoffDetail } from "./HandoffDetail";

export function HandoffDrawer() {
  const household = useAppStore((s) => s.household);
  const viewerId = useAppStore((s) => s.viewerId);
  const clockSkew = useAppStore((s) => s.clockSkew);
  const drawerOpen = useAppStore((s) => s.drawerOpen);
  const setDrawerOpen = useAppStore((s) => s.setDrawerOpen);
  const addToast = useAppStore((s) => s.addToast);

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
        className="fixed right-0 top-20 z-20 p-2 bg-[#262B52] border-l border-y border-[#3A4178] rounded-l-lg text-[#9AA3D6] hover:text-[#EDEAF6] shadow-md transition-all"
        title={drawerOpen ? "Close handoffs drawer" : "Open handoffs drawer"}
      >
        {drawerOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Slide-out Drawer Panel */}
      <aside
        className={`fixed top-14 bottom-0 right-0 z-20 w-full sm:w-[360px] bg-[#262B52]/95 backdrop-blur border-l border-[#3A4178] shadow-2xl flex flex-col transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-3 border-b border-[#3A4178] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-sm text-[#EDEAF6]">
              Care Handoffs
            </h2>
            <span className="px-1.5 py-0.5 rounded-full bg-[#14182B] text-[10px] font-mono text-[#FFC66B]">
              {handoffs.length}
            </span>
          </div>

          {/* Filter tabs and Close */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#14182B] p-0.5 rounded-lg text-[10px] font-medium">
              {(["all", "awaiting", "accepted", "resolved"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-0.5 rounded capitalize transition-colors ${
                    activeTab === tab
                      ? "bg-[#3A4178] text-[#EDEAF6] font-semibold"
                      : "text-[#9AA3D6] hover:text-[#EDEAF6]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1 rounded text-[#9AA3D6] hover:text-[#EDEAF6] hover:bg-[#14182B] transition-colors"
              title="Close drawer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Handoffs List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredHandoffs.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-[#9AA3D6]">
              <Inbox className="w-8 h-8 stroke-1 text-[#3A4178] mb-2" />
              <p className="text-xs font-medium text-[#EDEAF6]">Nothing is waiting on anyone.</p>
              <p className="text-[11px] mt-1 text-[#9AA3D6]">
                All care tasks and moments are in safe hands.
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
