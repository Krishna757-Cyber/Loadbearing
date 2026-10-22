"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Languages,
  Eye,
  Sliders,
  ChevronDown,
  Inbox,
} from "lucide-react";
import { useAppStore } from "@/store";
import { ClockScrubber } from "./ClockScrubber";

export function TopBar() {
  const viewerId = useAppStore((s) => s.viewerId);
  const setViewerId = useAppStore((s) => s.setViewerId);
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const household = useAppStore((s) => s.household);
  const drawerOpen = useAppStore((s) => s.drawerOpen);
  const setDrawerOpen = useAppStore((s) => s.setDrawerOpen);
  const highContrast = useAppStore((s) => s.highContrast);
  const setHighContrast = useAppStore((s) => s.setHighContrast);
  const largeText = useAppStore((s) => s.largeText);
  const setLargeText = useAppStore((s) => s.setLargeText);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const setReducedMotion = useAppStore((s) => s.setReducedMotion);
  const sceneMode = useAppStore((s) => s.sceneMode);
  const setSceneMode = useAppStore((s) => s.setSceneMode);

  const [a11yMenuOpen, setA11yMenuOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  // Compute consent count
  const caregivers = household?.members.filter((m) => m.role === "caregiver") ?? [];
  const consentedCount = caregivers.filter((c) => c.consentShare).length;
  const totalCaregivers = caregivers.length || 3;
  const allConsented = consentedCount === totalCaregivers;

  const currentMember = household?.members.find((m) => m.id === viewerId);

  return (
    <header className="relative z-20 flex items-center justify-between h-14 px-4 bg-[#14182B]/90 backdrop-blur border-b border-[#3A4178] select-none">
      {/* Left: Brand wordmark & view navigation */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="LoadBearing Logo"
            className="w-8 h-8 rounded-full border border-[#FFC66B]/60 shadow-[0_0_12px_rgba(255,198,107,0.35)] object-cover"
          />
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg font-bold tracking-tight text-[#FFC66B]">
              LoadBearing
            </span>
            <span className="text-[11px] text-[#9AA3D6] hidden sm:inline">
              Care shared fairly
            </span>
          </div>
        </div>

        {/* View switcher tabs */}
        <nav className="flex items-center gap-1 bg-[#262B52] border border-[#3A4178] p-0.5 rounded-lg text-xs">
          {(
            [
              { id: "map", label: "Globe" },
              { id: "handoffs", label: "Handoffs" },
              { id: "brief", label: "Brief" },
              { id: "privacy", label: "Privacy" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeView === tab.id
                  ? "bg-[#FFC66B] text-[#14182B] font-semibold"
                  : "text-[#9AA3D6] hover:text-[#EDEAF6]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Centre: Clock Scrubber */}
      <div className="hidden md:flex items-center justify-center">
        <ClockScrubber />
      </div>

      {/* Right: View as, Language, A11y, Privacy Chip */}
      <div className="flex items-center gap-2">
        {/* View As Dropdown */}
        <div className="relative">
          <button
            onClick={() => setViewMenuOpen(!viewMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#262B52] border border-[#3A4178] text-xs text-[#EDEAF6] hover:border-[#FFC66B] transition-colors"
            title="Switch caregiver view"
          >
            <Eye className="w-3.5 h-3.5 text-[#FFC66B]" />
            <span>
              View as: <strong className="capitalize">{currentMember?.name ?? viewerId}</strong>
            </span>
            <ChevronDown className="w-3 h-3 text-[#9AA3D6]" />
          </button>

          {viewMenuOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-[#262B52] border border-[#3A4178] rounded-lg shadow-xl py-1 z-50 text-xs">
              <div className="px-3 py-1 text-[10px] uppercase text-[#9AA3D6] tracking-wider font-semibold">
                Caregivers
              </div>
              {caregivers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setViewerId(m.id);
                    setViewMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[#3A4178] ${
                    viewerId === m.id ? "text-[#FFC66B] font-semibold" : "text-[#EDEAF6]"
                  }`}
                >
                  <span>{m.name}</span>
                  <span className="text-[10px] text-[#9AA3D6] font-mono">{m.city}</span>
                </button>
              ))}
              <div className="border-t border-[#3A4178] my-1" />
              <button
                onClick={() => {
                  setViewerId("dadi");
                  setViewMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[#3A4178] ${
                  viewerId === "dadi" ? "text-[#FFC66B] font-semibold" : "text-[#EDEAF6]"
                }`}
              >
                <span>Dadi (Recipient)</span>
                <span className="text-[10px] text-[#9AA3D6] font-mono">Toronto</span>
              </button>
            </div>
          )}
        </div>

        {/* Language Toggle */}
        <button
          onClick={() => setLanguage(language === "en" ? "hi" : "en")}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#262B52] border border-[#3A4178] text-xs text-[#EDEAF6] hover:border-[#FFC66B] transition-colors"
          title="Toggle English / Hindi"
        >
          <Languages className="w-3.5 h-3.5 text-[#9AA3D6]" />
          <span className="font-medium">{language === "en" ? "हिन्दी" : "English"}</span>
        </button>

        {/* Accessibility Menu */}
        <div className="relative">
          <button
            onClick={() => setA11yMenuOpen(!a11yMenuOpen)}
            className="p-1.5 rounded-lg bg-[#262B52] border border-[#3A4178] text-[#9AA3D6] hover:text-[#EDEAF6] hover:border-[#FFC66B] transition-colors"
            title="Accessibility settings"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {a11yMenuOpen && (
            <div className="absolute right-0 mt-1 w-52 bg-[#262B52] border border-[#3A4178] rounded-lg shadow-xl p-2 z-50 text-xs flex flex-col gap-2">
              <div className="font-semibold text-[#EDEAF6] pb-1 border-b border-[#3A4178]">
                Display & Motion
              </div>
              <label className="flex items-center justify-between cursor-pointer">
                <span>High Contrast</span>
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => {
                    setHighContrast(e.target.checked);
                    document.documentElement.classList.toggle("high-contrast", e.target.checked);
                  }}
                  className="accent-[#FFC66B]"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span>Large Text (+12.5%)</span>
                <input
                  type="checkbox"
                  checked={largeText}
                  onChange={(e) => {
                    setLargeText(e.target.checked);
                    document.documentElement.classList.toggle("large-text-1", e.target.checked);
                  }}
                  className="accent-[#FFC66B]"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span>Reduced Motion</span>
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => {
                    setReducedMotion(e.target.checked);
                    document.documentElement.classList.toggle("reduced-motion", e.target.checked);
                  }}
                  className="accent-[#FFC66B]"
                />
              </label>
              <div className="flex items-center justify-between pt-1 border-t border-[#3A4178]">
                <span>Scene View</span>
                <button
                  onClick={() => setSceneMode(sceneMode === "3d" ? "2d" : "3d")}
                  className="px-2 py-0.5 rounded bg-[#3A4178] text-[10px] font-mono text-[#EDEAF6]"
                >
                  {sceneMode === "3d" ? "3D Globe" : "2D Strip"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Privacy Chip (closes a thin ring when all 3 consent) */}
        <button
          onClick={() => setActiveView("privacy")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all border ${
            allConsented
              ? "bg-[#5FD3A0]/15 border-[#5FD3A0] text-[#5FD3A0]"
              : "bg-[#262B52] border-[#3A4178] text-[#9AA3D6] hover:border-[#FFC66B]"
          }`}
          title="Caregiver load sharing consent"
        >
          <div className="relative w-4 h-4 flex items-center justify-center">
            <svg className="w-4 h-4 transform -rotate-90">
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                className="opacity-25"
              />
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeDasharray="37.7"
                strokeDashoffset={37.7 - (37.7 * (consentedCount / totalCaregivers))}
                className="transition-all duration-500"
              />
            </svg>
            <ShieldCheck className="w-2.5 h-2.5 absolute" />
          </div>
          <span className="font-mono text-[11px]">
            {consentedCount} of {totalCaregivers} sharing
          </span>
        </button>

        {/* Toggle Handoffs Drawer */}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors border ${
            drawerOpen
              ? "bg-[#FFC66B] text-[#14182B] font-semibold border-[#FFC66B]"
              : "bg-[#262B52] border-[#3A4178] text-[#EDEAF6] hover:border-[#FFC66B]"
          }`}
          title={drawerOpen ? "Close Handoffs Drawer" : "Open Handoffs Drawer"}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Handoffs</span>
          {(household?.handoffs?.length ?? 0) > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                drawerOpen ? "bg-[#14182B] text-[#FFC66B]" : "bg-[#14182B] text-[#EDEAF6]"
              }`}
            >
              {household?.handoffs?.length}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
