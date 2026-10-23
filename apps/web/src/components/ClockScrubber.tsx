"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { useAppStore, computeSimNow } from "@/store";
import { DateTime } from "luxon";

const DEFAULT_SEED_INSTANT_MS = 1792686600000; // 2026-10-22T16:30:00Z

export function ClockScrubber() {
  const household = useAppStore((s) => s.household);
  const updateClock = useAppStore((s) => s.updateClock);
  const clockSkew = useAppStore((s) => s.clockSkew);

  const [, setTick] = useState(0);

  // Sync clock tick every second if running
  useEffect(() => {
    const timer = setInterval(() => {
      if (household?.clock && !household.clock.paused) {
        setTick((t) => t + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [household?.clock]);

  const activeSimMs = household?.clock
    ? computeSimNow(household.clock, clockSkew)
    : DEFAULT_SEED_INSTANT_MS;

  const dtUtc = DateTime.fromMillis(activeSimMs, { zone: "utc" });
  const dtPune = DateTime.fromMillis(activeSimMs, { zone: "Asia/Kolkata" });
  const dtBerlin = DateTime.fromMillis(activeSimMs, { zone: "Europe/Berlin" });
  const dtToronto = DateTime.fromMillis(activeSimMs, { zone: "America/Toronto" });

  const isPaused = household?.clock?.paused ?? true;
  const currentSpeed = household?.clock?.speed ?? 1;

  const handleAction = async (action: string, payload: Record<string, unknown> = {}) => {
    try {
      await fetch("/api/admin/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
    } catch {
      // Local fallback
    }
  };

  const handlePlayPause = () => {
    const newPaused = !isPaused;
    const now = Date.now();
    updateClock((prev) => ({
      ...prev,
      anchorSimMs: activeSimMs,
      anchorRealMs: now + clockSkew,
      paused: newPaused,
    }));
    handleAction(newPaused ? "pause" : "play");
  };

  const handleSpeed = (speed: number) => {
    const now = Date.now();
    updateClock((prev) => ({
      ...prev,
      anchorSimMs: activeSimMs,
      anchorRealMs: now + clockSkew,
      speed,
    }));
    handleAction("speed", { speed });
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 bg-[#1B2042]/95 border border-[#3A4178] px-2.5 sm:px-3 py-1 rounded-full shadow-lg text-xs select-none backdrop-blur-md">
      {/* Play / Pause Button */}
      <button
        onClick={handlePlayPause}
        className="p-1 rounded-full bg-[#262B52] hover:bg-[#3A4178] text-[#EDEAF6] transition-all cursor-pointer active:scale-90"
        title={isPaused ? "Play clock simulation" : "Pause clock simulation"}
        aria-label={isPaused ? "Play clock" : "Pause clock"}
      >
        {isPaused ? <Play className="w-3.5 h-3.5 fill-[#EDEAF6]" /> : <Pause className="w-3.5 h-3.5 fill-[#EDEAF6]" />}
      </button>

      {/* Speed presets (1x, 60x, 600x) */}
      <div className="flex items-center gap-0.5 border-l border-r border-[#3A4178]/80 px-1.5">
        {[1, 60, 600].map((s) => (
          <button
            key={s}
            onClick={() => handleSpeed(s)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer active:scale-95 ${
              currentSpeed === s
                ? "bg-[#FFC66B] text-[#14182B] font-bold shadow-xs"
                : "text-[#9AA3D6] hover:text-[#EDEAF6] hover:bg-[#262B52]"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* UTC Simulation Clock Display */}
      <div className="flex items-center px-1.5">
        <span className="font-mono text-[#FFC66B] font-semibold whitespace-nowrap text-[11px] tracking-tight">
          {dtUtc.toFormat("HH:mm:ss 'UTC'")}
        </span>
      </div>

      {/* Multi-timezone caregiver city clocks */}
      <div className="flex items-center gap-1.5 pl-1.5 border-l border-[#3A4178]/80 text-[10px] text-[#9AA3D6] whitespace-nowrap">
        <span>
          Pune <strong className="text-[#EDEAF6] font-mono font-semibold">{dtPune.toFormat("HH:mm")}</strong>
        </span>
        <span className="text-[#3A4178]">•</span>
        <span>
          Berlin <strong className="text-[#EDEAF6] font-mono font-semibold">{dtBerlin.toFormat("HH:mm")}</strong>
        </span>
        <span className="text-[#3A4178]">•</span>
        <span>
          Toronto <strong className="text-[#EDEAF6] font-mono font-semibold">{dtToronto.toFormat("HH:mm")}</strong>
        </span>
      </div>
    </div>
  );
}
