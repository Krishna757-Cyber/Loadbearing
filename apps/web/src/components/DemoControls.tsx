"use client";

import React, { useState, useEffect } from "react";
import { Sliders, RotateCcw, Package, UserCheck, Bell, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { useAppStore } from "@/store";

export function DemoControls() {
  const demoControlsOpen = useAppStore((s) => s.demoControlsOpen);
  const setDemoControlsOpen = useAppStore((s) => s.setDemoControlsOpen);
  const addToast = useAppStore((s) => s.addToast);

  const [simulating, setSimulating] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Keyboard shortcut 'D' to toggle demo controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "d" || e.key === "D") {
        setDemoControlsOpen(!demoControlsOpen);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [demoControlsOpen, setDemoControlsOpen]);

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/admin/reset", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        addToast("Demo state and clock reset to seed instant (2026-10-22T16:30Z)", "success");
      } else {
        addToast("Failed to reset demo state", "error");
      }
    } catch {
      addToast("Network error resetting demo", "error");
    } finally {
      setResetting(false);
    }
  };

  const handleSimulateDoorstep = async (type: "delivery" | "visitor" | "courier") => {
    setSimulating(true);
    try {
      const res = await fetch("/api/simulate/doorstep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (data.ok) {
        addToast(`Doorstep event '${type}' triggered and routed`, "success");
      } else {
        addToast("Failed to simulate doorstep event", "error");
      }
    } catch {
      addToast("Network error simulating doorstep", "error");
    } finally {
      setSimulating(false);
    }
  };

  return (
    <>
      {/* Floating Toggle on Left Edge */}
      <button
        onClick={() => setDemoControlsOpen(!demoControlsOpen)}
        className="fixed left-0 top-20 z-20 p-2 bg-[#262B52] border-r border-y border-[#3A4178] rounded-r-lg text-[#9AA3D6] hover:text-[#EDEAF6] shadow-md transition-all flex items-center gap-1 text-xs"
        title="Toggle Demo Controls (Key: D)"
      >
        <Sliders className="w-3.5 h-3.5 text-[#FFC66B]" />
        <span className="font-mono text-[10px] hidden sm:inline">DEMO (D)</span>
        {demoControlsOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* Demo Controls Drawer */}
      {demoControlsOpen && (
        <aside className="fixed left-0 top-14 bottom-0 z-20 w-72 bg-[#262B52]/95 backdrop-blur border-r border-[#3A4178] shadow-2xl p-4 flex flex-col justify-between text-xs select-none">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#3A4178]">
              <div className="flex items-center gap-1.5 font-semibold text-[#EDEAF6]">
                <Sparkles className="w-4 h-4 text-[#FFC66B]" />
                <span>Demo Controls (Key D)</span>
              </div>
              <button
                onClick={() => setDemoControlsOpen(false)}
                className="text-[#9AA3D6] hover:text-[#EDEAF6]"
              >
                ✕
              </button>
            </div>

            {/* Reset Demo Button */}
            <div>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#14182B] border border-[#3A4178] hover:border-[#FFC66B] text-[#EDEAF6] font-medium transition-colors"
              >
                <RotateCcw className={`w-3.5 h-3.5 text-[#FFC66B] ${resetting ? "animate-spin" : ""}`} />
                <span>{resetting ? "Resetting..." : "Reset Demo World (Seed)"}</span>
              </button>
              <span className="block text-[10px] text-[#9AA3D6] text-center mt-1">
                Restores Priya 60%, Arjun 18.6%, Meera 21.4%
              </span>
            </div>

            {/* Doorstep Simulator Presets */}
            <div className="space-y-2 pt-2 border-t border-[#3A4178]">
              <span className="text-[10px] uppercase font-semibold text-[#9AA3D6] tracking-wider block">
                Doorstep Camera Events
              </span>

              <button
                onClick={() => handleSimulateDoorstep("delivery")}
                disabled={simulating}
                className="w-full flex items-start gap-2.5 p-2 rounded-lg bg-[#14182B]/60 hover:bg-[#14182B] border border-[#3A4178] text-left transition-colors"
              >
                <Package className="w-4 h-4 text-[#5B9CFF] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#EDEAF6] block">Package Delivery</strong>
                  <span className="text-[10px] text-[#9AA3D6]">
                    Needs local presence &rarr; routes to Meera (Toronto)
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleSimulateDoorstep("visitor")}
                disabled={simulating}
                className="w-full flex items-start gap-2.5 p-2 rounded-lg bg-[#14182B]/60 hover:bg-[#14182B] border border-[#3A4178] text-left transition-colors"
              >
                <Bell className="w-4 h-4 text-[#FFB547] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#EDEAF6] block">Unexpected Visitor</strong>
                  <span className="text-[10px] text-[#9AA3D6]">
                    Late evening check &rarr; alerts available local contact
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleSimulateDoorstep("courier")}
                disabled={simulating}
                className="w-full flex items-start gap-2.5 p-2 rounded-lg bg-[#14182B]/60 hover:bg-[#14182B] border border-[#3A4178] text-left transition-colors"
              >
                <UserCheck className="w-4 h-4 text-[#9AA3D6] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#EDEAF6] block">Regular Courier</strong>
                  <span className="text-[10px] text-[#9AA3D6]">
                    Classified as info &rarr; logged only without handoff
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Footer Honest Labels */}
          <div className="p-3 bg-[#14182B]/80 rounded-xl border border-[#3A4178] text-[10px] text-[#9AA3D6] space-y-1">
            <span className="font-semibold text-[#EDEAF6] block">Honest Labels Notice:</span>
            <p>
              Simulated Alexa+ voice surface and simulated doorstep events. Demo data only. Role switch instead of auth.
            </p>
          </div>
        </aside>
      )}
    </>
  );
}
