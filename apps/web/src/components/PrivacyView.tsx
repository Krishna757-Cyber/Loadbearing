"use client";

import React, { useState } from "react";
import { ShieldCheck, Lock } from "lucide-react";
import { useAppStore } from "@/store";

export function PrivacyView() {
  const viewerId = useAppStore((s) => s.viewerId);
  const themeMode = useAppStore((s) => s.themeMode);
  const household = useAppStore((s) => s.household);
  const addToast = useAppStore((s) => s.addToast);
  const setHousehold = useAppStore((s) => s.setHousehold);

  const isLight = themeMode === "light";
  const [toggling, setToggling] = useState(false);

  const caregivers = household?.members.filter((m) => m.role === "caregiver") ?? [];
  const moments = household?.moments ?? [];

  const handleToggleConsent = async (memberId: string, currentVal: boolean) => {
    if (viewerId !== memberId) {
      addToast(`You can only change your own consent. Switch 'View as' to ${memberId}.`, "error");
      return;
    }

    setToggling(true);
    try {
      const res = await fetch("/api/admin/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: memberId,
          consent_share: !currentVal,
          viewer_id: viewerId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.ok === false) {
        addToast(data.error?.message || "Failed to update consent", "error");
      } else {
        const nextState = !currentVal;
        addToast(
          nextState
            ? "Consent enabled. Load data shared with household."
            : "Consent revoked. Load view made private.",
          "success"
        );
        // Deterministically refresh state for viewer
        try {
          const sRes = await fetch(`/api/state?viewer=${encodeURIComponent(viewerId)}`);
          if (sRes.ok) {
            const sData = await sRes.json();
            if (sData.ok && sData.data) {
              setHousehold(sData.data);
            }
          }
        } catch {
          // ignore background fetch error
        }
      }
    } catch {
      addToast("Network error updating consent", "error");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="relative z-10 max-w-2xl mx-auto p-6 flex flex-col gap-6 text-xs select-none">
      {/* Consent Control Card */}
      <div
        className={`rounded-2xl p-6 shadow-2xl space-y-4 border transition-colors ${
          isLight
            ? "bg-white/98 backdrop-blur border-slate-200 text-slate-900"
            : "bg-[#262B52]/90 backdrop-blur border-[#3A4178] text-[#EDEAF6]"
        }`}
      >
        <div className={`flex items-center gap-2 pb-3 border-b ${isLight ? "border-slate-200" : "border-[#3A4178]"}`}>
          <ShieldCheck className="w-5 h-5 text-[#FFC66B]" />
          <div>
            <h2 className="font-display text-base font-semibold">
              Caregiver Load Sharing Consent
            </h2>
            <p className={`text-[11px] ${isLight ? "text-slate-600" : "text-[#9AA3D6]"}`}>
              Exact pillar heights and burden percentages are hidden until all three caregivers mutually consent.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {caregivers.map((c) => {
            const isSelf = c.id === viewerId;
            return (
              <div
                key={c.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                  isSelf
                    ? isLight
                      ? "bg-amber-50/70 border-amber-300"
                      : "bg-[#14182B] border-[#FFC66B]"
                    : isLight
                    ? "bg-slate-50 border-slate-200"
                    : "bg-[#14182B]/60 border-[#3A4178]"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm capitalize">
                      {c.name}
                    </span>
                    {isSelf && (
                      <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                        isLight ? "bg-amber-200 text-amber-900" : "bg-[#FFC66B]/20 text-[#FFC66B]"
                      }`}>
                        YOU
                      </span>
                    )}
                  </div>
                  <span className={`text-[11px] ${isLight ? "text-slate-600" : "text-[#9AA3D6]"}`}>
                    {c.consentShare
                      ? "Consents to share load entries with family"
                      : "Load entries kept private"}
                  </span>
                </div>

                <button
                  onClick={() => handleToggleConsent(c.id, c.consentShare)}
                  disabled={toggling || !isSelf}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    c.consentShare
                      ? "bg-[#10B981]"
                      : isLight
                      ? "bg-slate-300"
                      : "bg-[#3A4178]"
                  } ${!isSelf ? "opacity-50 cursor-not-allowed" : ""}`}
                  title={
                    isSelf
                      ? `Toggle your sharing consent`
                      : `Switch 'View as' to ${c.name} to change their consent`
                  }
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      c.consentShare ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Doorstep & Moment Privacy Policies */}
      <div
        className={`rounded-2xl p-5 shadow-xl space-y-3 border transition-colors ${
          isLight
            ? "bg-white/98 backdrop-blur border-slate-200 text-slate-900"
            : "bg-[#262B52]/90 backdrop-blur border-[#3A4178] text-[#EDEAF6]"
        }`}
      >
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          <Lock className={`w-4 h-4 ${isLight ? "text-slate-600" : "text-[#9AA3D6]"}`} />
          Privacy & Visibility Rules
        </h3>

        <div className={`space-y-2 text-[11px] leading-relaxed ${isLight ? "text-slate-600" : "text-[#9AA3D6]"}`}>
          <p className={`p-3 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#14182B]/60 border-[#3A4178]/60"}`}>
            <strong className={`block mb-0.5 ${isLight ? "text-slate-900" : "text-[#EDEAF6]"}`}>Doorstep Events:</strong>
            Doorstep camera and bell events are automatically classified and shared with all three caregivers. To protect family privacy, unacknowledged doorstep events expire after 48 hours.
          </p>
          <p className={`p-3 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#14182B]/60 border-[#3A4178]/60"}`}>
            <strong className={`block mb-0.5 ${isLight ? "text-slate-900" : "text-[#EDEAF6]"}`}>Sensitive Moments:</strong>
            Spoken notes containing private health or relationship observations are tagged as sensitive and remain strictly private unless you explicitly confirm a shared handoff.
          </p>
        </div>
      </div>

      {/* Visible Moments List for Current Viewer */}
      <div
        className={`rounded-2xl p-5 shadow-xl space-y-3 border transition-colors ${
          isLight
            ? "bg-white/98 backdrop-blur border-slate-200 text-slate-900"
            : "bg-[#262B52]/90 backdrop-blur border-[#3A4178] text-[#EDEAF6]"
        }`}
      >
        <div className={`flex items-center justify-between pb-2 border-b ${isLight ? "border-slate-200" : "border-[#3A4178]"}`}>
          <h3 className="font-display font-semibold text-sm">
            Moments Visible to You ({moments.length})
          </h3>
          <span className={`text-[10px] font-mono ${isLight ? "text-slate-500" : "text-[#9AA3D6]"}`}>
            Filtered by server-side policy
          </span>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {moments.map((m) => (
            <div
              key={m.id}
              className={`p-2.5 rounded-lg border flex items-start justify-between gap-2 ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-[#14182B]/60 border-[#3A4178]"
              }`}
            >
              <div className="space-y-1 min-w-0">
                <p className={`text-xs font-medium truncate ${isLight ? "text-slate-900" : "text-[#EDEAF6]"}`}>
                  {m.classification?.summary || m.text}
                </p>
                <div className={`flex items-center gap-2 text-[10px] ${isLight ? "text-slate-500" : "text-[#9AA3D6]"}`}>
                  <span>Source: {m.source}</span>
                  <span>•</span>
                  <span>Kind: {m.classification?.kind}</span>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono shrink-0 uppercase font-medium ${
                  m.privacy === "household"
                    ? isLight ? "bg-blue-100 text-blue-700" : "bg-[#5B9CFF]/20 text-[#5B9CFF]"
                    : m.privacy === "shared"
                    ? isLight ? "bg-emerald-100 text-emerald-700" : "bg-[#5FD3A0]/20 text-[#5FD3A0]"
                    : isLight ? "bg-amber-100 text-amber-800" : "bg-[#FFB547]/20 text-[#FFB547]"
                }`}
              >
                {m.privacy}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
