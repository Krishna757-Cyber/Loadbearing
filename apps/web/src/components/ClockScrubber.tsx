"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { useAppStore, computeSimNow } from "@/store";
import { DateTime } from "luxon";

export function ClockScrubber() {
  const household = useAppStore((s) => s.household);
  const clockSkew = useAppStore((s) => s.clockSkew);
  const addToast = useAppStore((s) => s.addToast);

  const [localNow, setLocalNow] = useState<number>(Date.now());

  // Update clock display every second if not paused
  useEffect(() => {
    const timer = setInterval(() => {
      if (household?.clock) {
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

  const handleAction = async (action: string, payload: Record<string, unknown> = {}) => {
    try {
      const res = await fetch("/api/admin/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      if (!res.ok) {
        const data = await res.json();
        addToast(data.error?.message ?? "Clock update failed", "error");
      }
    } catch {
      addToast("Network error updating clock", "error");
    }
  };

  const handlePlayPause = () => {
    if (!household?.clock) return;
    if (household.clock.paused) {
      handleAction("play");
    } else {
      handleAction("pause");
    }
  };

  const handleSpeed = (speed: number) => {
    handleAction("speed", { speed });
  };

  const handleAdvance = (minutes: number) => {
    handleAction("advance", { minutes });
  };

  const isPaused = household?.clock.paused ?? true;
  const currentSpeed = household?.clock.speed ?? 1;

  return (
    <div className="flex items-center gap-2 bg-[#262B52]/90 border border-[#3A4178] px-3 py-1 rounded-full shadow-sm text-xs select-none">
      <button
        onClick={handlePlayPause}
        className="p-1 rounded hover:bg-[#3A4178] text-[#EDEAF6] transition-colors"
        title={isPaused ? "Play clock" : "Pause clock"}
        aria-label={isPaused ? "Play clock" : "Pause clock"}
      >
        {isPaused ? <Play className="w-3.5 h-3.5 fill-[#EDEAF6]" /> : <Pause className="w-3.5 h-3.5 fill-[#EDEAF6]" />}
      </button>

      {/* Speed presets */}
      <div className="flex items-center gap-0.5 border-l border-r border-[#3A4178] px-1.5">
        {[1, 60, 600].map((s) => (
          <button
            key={s}
            onClick={() => handleSpeed(s)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
              currentSpeed === s
                ? "bg-[#FFC66B] text-[#14182B] font-semibold"
                : "text-[#9AA3D6] hover:text-[#EDEAF6]"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Quick steps */}
      <div className="flex items-center gap-1 text-[11px] font-mono">
        <button
          onClick={() => handleAdvance(10)}
          className="hover:text-[#FFC66B] px-1 py-0.5 text-[#9AA3D6]"
          title="Advance 10 minutes"
        >
          +10m
        </button>
        <button
          onClick={() => handleAdvance(60)}
          className="hover:text-[#FFC66B] px-1 py-0.5 text-[#9AA3D6]"
          title="Advance 1 hour"
        >
          +1h
        </button>
        <button
          onClick={() => handleAdvance(360)}
          className="hover:text-[#FFC66B] px-1 py-0.5 text-[#9AA3D6]"
          title="Advance 6 hours"
        >
          +6h
        </button>
      </div>

      <span className="font-mono text-[#FFC66B] pl-1 font-medium whitespace-nowrap">
        {dtUtc.toFormat("HH:mm:ss 'UTC'")}
      </span>
    </div>
  );
}
