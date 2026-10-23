"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { useAppStore, computeSimNow } from "@/store";
import { DateTime } from "luxon";

const DEFAULT_SEED_INSTANT_MS = new Date("2026-10-22T16:30:00Z").getTime();

export function ClockScrubber() {
  const household = useAppStore((s) => s.household);
  const setHousehold = useAppStore((s) => s.setHousehold);
  const clockSkew = useAppStore((s) => s.clockSkew);
  const addToast = useAppStore((s) => s.addToast);

  const [localNow, setLocalNow] = useState<number>(DEFAULT_SEED_INSTANT_MS);

  // Sync clock display
  useEffect(() => {
    if (household?.clock) {
      setLocalNow(computeSimNow(household.clock, clockSkew));
    }
    const timer = setInterval(() => {
      if (household?.clock && !household.clock.paused) {
        setLocalNow(computeSimNow(household.clock, clockSkew));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [household?.clock, clockSkew]);

  const activeSimMs = household?.clock ? computeSimNow(household.clock, clockSkew) : localNow;

  const dtUtc = DateTime.fromMillis(activeSimMs, { zone: "utc" });
  const dtPune = DateTime.fromMillis(activeSimMs, { zone: "Asia/Kolkata" });
  const dtBerlin = DateTime.fromMillis(activeSimMs, { zone: "Europe/Berlin" });
  const dtToronto = DateTime.fromMillis(activeSimMs, { zone: "America/Toronto" });

  const getEffectiveClock = () => {
    return (
      household?.clock ?? {
        anchorSimMs: activeSimMs,
        anchorRealMs: Date.now() + clockSkew,
        speed: 1,
        paused: true,
        serverRealNowMs: Date.now() + clockSkew,
      }
    );
  };

  const handleAction = async (action: string, payload: Record<string, unknown> = {}) => {
    try {
      const res = await fetch("/api/admin/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (data.error?.message) {
          addToast(data.error.message, "error");
        }
      }
    } catch {
      // Local fallback handled
    }
  };

  const handlePlayPause = () => {
    const clock = getEffectiveClock();
    const now = Date.now();
    const activeMs = computeSimNow(clock, clockSkew);
    const newPaused = !clock.paused;
    const updatedClock = {
      ...clock,
      anchorSimMs: activeMs,
      anchorRealMs: now + clockSkew,
      paused: newPaused,
    };
    if (household) {
      setHousehold({ ...household, clock: updatedClock });
    }
    setLocalNow(activeMs);
    handleAction(newPaused ? "pause" : "play");
  };

  const handleSpeed = (speed: number) => {
    const clock = getEffectiveClock();
    const now = Date.now();
    const activeMs = computeSimNow(clock, clockSkew);
    const updatedClock = {
      ...clock,
      anchorSimMs: activeMs,
      anchorRealMs: now + clockSkew,
      speed,
    };
    if (household) {
      setHousehold({ ...household, clock: updatedClock });
    }
    setLocalNow(activeMs);
    handleAction("speed", { speed });
  };

  const handleAdvance = (minutes: number) => {
    const clock = getEffectiveClock();
    const activeMs = computeSimNow(clock, clockSkew);
    const newAnchorMs = activeMs + minutes * 60 * 1000;
    const updatedClock = {
      ...clock,
      anchorSimMs: newAnchorMs,
      anchorRealMs: Date.now() + clockSkew,
    };
    if (household) {
      setHousehold({ ...household, clock: updatedClock });
    }
    // Update local state immediately so visual change is instantaneous
    setLocalNow(newAnchorMs);
    handleAction("advance", { minutes });
    addToast(`Clock advanced +${minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}`, "info");
  };

  const isPaused = household?.clock?.paused ?? true;
  const currentSpeed = household?.clock?.speed ?? 1;

  return (
    <div className="flex items-center gap-2 bg-[#262B52]/95 border border-[#3A4178] px-3 py-1.5 rounded-full shadow-lg text-xs select-none">
      {/* Play / Pause Button */}
      <button
        onClick={handlePlayPause}
        className="p-1 rounded-md hover:bg-[#3A4178] text-[#EDEAF6] transition-colors cursor-pointer active:scale-95"
        title={isPaused ? "Play clock simulation" : "Pause clock simulation"}
        aria-label={isPaused ? "Play clock" : "Pause clock"}
      >
        {isPaused ? <Play className="w-3.5 h-3.5 fill-[#EDEAF6]" /> : <Pause className="w-3.5 h-3.5 fill-[#EDEAF6]" />}
      </button>

      {/* Speed presets (1x, 60x, 600x) */}
      <div className="flex items-center gap-1 border-l border-r border-[#3A4178]/80 px-2">
        {[1, 60, 600].map((s) => (
          <button
            key={s}
            onClick={() => handleSpeed(s)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer active:scale-95 ${
              currentSpeed === s
                ? "bg-[#FFC66B] text-[#14182B] font-bold shadow-xs"
                : "bg-[#1B2042] text-[#9AA3D6] hover:text-[#EDEAF6] border border-[#3A4178]/60"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Quick steps (+10m, +1h, +6h) */}
      <div className="flex items-center gap-1 border-r border-[#3A4178]/80 pr-2">
        <button
          onClick={() => handleAdvance(10)}
          className="px-1.5 py-0.5 rounded-md bg-[#1B2042] hover:bg-[#FFC66B] hover:text-[#14182B] text-[#9AA3D6] font-mono text-[10px] font-medium border border-[#3A4178] hover:border-[#FFC66B] transition-all cursor-pointer active:scale-95 shadow-xs"
          title="Advance 10 minutes"
        >
          +10m
        </button>
        <button
          onClick={() => handleAdvance(60)}
          className="px-1.5 py-0.5 rounded-md bg-[#1B2042] hover:bg-[#FFC66B] hover:text-[#14182B] text-[#9AA3D6] font-mono text-[10px] font-medium border border-[#3A4178] hover:border-[#FFC66B] transition-all cursor-pointer active:scale-95 shadow-xs"
          title="Advance 1 hour"
        >
          +1h
        </button>
        <button
          onClick={() => handleAdvance(360)}
          className="px-1.5 py-0.5 rounded-md bg-[#1B2042] hover:bg-[#FFC66B] hover:text-[#14182B] text-[#9AA3D6] font-mono text-[10px] font-medium border border-[#3A4178] hover:border-[#FFC66B] transition-all cursor-pointer active:scale-95 shadow-xs"
          title="Advance 6 hours"
        >
          +6h
        </button>
      </div>

      {/* UTC Simulation Clock Display */}
      <div className="flex items-center px-1.5 border-r border-[#3A4178]/80">
        <span className="font-mono text-[#FFC66B] font-semibold whitespace-nowrap text-[11px] tracking-tight">
          {dtUtc.toFormat("HH:mm:ss 'UTC'")}
        </span>
      </div>

      {/* Multi-timezone caregiver city clocks */}
      <div className="flex items-center gap-2 pl-1.5 text-[10px] text-[#9AA3D6] whitespace-nowrap">
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
