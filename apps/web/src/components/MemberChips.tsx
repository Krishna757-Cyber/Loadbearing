"use client";

import React from "react";
import { Moon } from "lucide-react";
import { useAppStore, computeSimNow } from "@/store";
import { DateTime } from "luxon";
import { t } from "@/lib/i18n";

export function MemberChips() {
  const household = useAppStore((s) => s.household);
  const viewerId = useAppStore((s) => s.viewerId);
  const language = useAppStore((s) => s.language);
  const clockSkew = useAppStore((s) => s.clockSkew);

  const simNowMs = household?.clock ? computeSimNow(household.clock, clockSkew) : Date.now();
  const caregivers = household?.members.filter((m) => m.role === "caregiver") ?? [];
  const loadEntries = household?.loadEntries ?? [];

  return (
    <div className="fixed top-[62px] left-1/2 -translate-x-1/2 z-10 flex flex-wrap items-center justify-center gap-2 max-w-xl px-2 select-none pointer-events-none">
      {caregivers.map((c) => {
        const dt = DateTime.fromMillis(simNowMs, { zone: c.timeZone });
        const hour = dt.hour + dt.minute / 60;
        const [startH] = c.awakeStart.split(":").map(Number);
        const [endH] = c.awakeEnd.split(":").map(Number);
        const isAwake = (startH ?? 7) <= (endH ?? 23)
          ? hour >= (startH ?? 7) && hour < (endH ?? 23)
          : hour >= (startH ?? 7) || hour < (endH ?? 23);

        // Sleep tax calculation for this member
        const memberEntries = loadEntries.filter((e) => e.memberId === c.id);
        const sleepTaxSum = memberEntries
          .filter((e) => e.inSleepWindow)
          .reduce((sum, e) => sum + e.baseWeight, 0);

        const isSelf = c.id === viewerId;

        return (
          <div
            key={c.id}
            className={`pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur border text-xs shadow-md transition-all ${
              isSelf
                ? "bg-[#262B52]/90 border-[#FFC66B] ring-1 ring-[#FFC66B]/50"
                : "bg-[#14182B]/85 border-[#3A4178]"
            }`}
          >
            {/* Awake or asleep icon */}
            {isAwake ? (
              <span className="w-2 h-2 rounded-full bg-[#FFC66B] shadow-[0_0_8px_#FFC66B]" title={t("awake", language)} />
            ) : (
              <span title={t("asleep", language)}><Moon className="w-3 h-3 text-[#9AA3D6]" /></span>
            )}

            <div>
              <div className="flex items-center gap-1.5 font-medium text-[#EDEAF6]">
                <span className="capitalize">{c.name}</span>
                <span className="text-[10px] text-[#9AA3D6] font-mono">
                  {dt.toFormat("HH:mm")}
                </span>
              </div>

              {/* Time-zone tax detail */}
              {sleepTaxSum > 0 && (
                <span className="text-[9px] text-[#FFC66B] block">
                  +{sleepTaxSum.toFixed(1)} {t("sleepTax", language)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
