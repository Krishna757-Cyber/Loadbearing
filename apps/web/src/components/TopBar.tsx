"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Languages,
  Eye,
  Sliders,
  ChevronDown,
  Inbox,
  Sun,
  Moon,
  Palette,
  Check,
} from "lucide-react";
import { useAppStore } from "@/store";
import { ClockScrubber } from "./ClockScrubber";
import { t, LANGUAGES } from "@/lib/i18n";

export function TopBar() {
  const viewerId = useAppStore((s) => s.viewerId);
  const setViewerId = useAppStore((s) => s.setViewerId);
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);
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
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

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
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="LoadBearing Logo"
            className="w-9 h-9 rounded-full object-contain shrink-0 drop-shadow-[0_0_8px_rgba(255,198,107,0.4)]"
          />
          <div className="flex flex-col justify-center">
            {/* 3D Gradient Wordmark: Load in Ice-White, Bearing in Metallic Gold */}
            <div className="flex items-center font-display text-[19px] leading-none font-extrabold tracking-tight">
              <span className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Load
              </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#FFE7A8] via-[#FFB84C] to-[#E58F10] drop-shadow-[0_2px_6px_rgba(229,143,16,0.35)]">
                Bearing
              </span>
            </div>

            {/* Accent divider: Dual gold & sky-blue bar */}
            <div className="flex items-center my-0.5">
              <span className="h-[2px] w-6 rounded-l-full bg-[#FFB84C] shadow-[0_0_4px_#FFB84C]" />
              <span className="h-[2px] w-6 rounded-r-full bg-[#5B9CFF] shadow-[0_0_4px_#5B9CFF]" />
            </div>

            {/* Tagline */}
            <span className="text-[10px] text-[#EDEAF6]/90 font-medium tracking-normal whitespace-nowrap hidden md:inline">
              {t("brandTagline", language)}
            </span>
          </div>
        </div>

        {/* View switcher tabs */}
        <nav className="flex items-center gap-1 bg-[#262B52] border border-[#3A4178] p-0.5 rounded-lg text-xs shrink-0">
          {(
            [
              { id: "map", label: t("globe", language) },
              { id: "handoffs", label: t("handoffs", language) },
              { id: "brief", label: t("brief", language) },
              { id: "privacy", label: t("privacy", language) },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
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
      <div className="hidden lg:flex items-center justify-center shrink-0">
        <ClockScrubber />
      </div>

      {/* Right: View as, Language, Theme, A11y, Privacy Chip, Handoffs */}
      <div className="flex items-center gap-2 shrink-0">
        {/* View As Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setViewMenuOpen(!viewMenuOpen)}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[#262B52] border border-[#3A4178] text-xs text-[#EDEAF6] hover:border-[#FFC66B] transition-colors whitespace-nowrap"
            title="Switch caregiver view"
          >
            <Eye className="w-3.5 h-3.5 text-[#FFC66B] shrink-0" />
            <span className="capitalize font-medium">
              {currentMember?.name ?? viewerId}
            </span>
            <ChevronDown className="w-3 h-3 text-[#9AA3D6] shrink-0" />
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

        {/* Language Dropdown (International) */}
        <div className="relative shrink-0">
          <button
            onClick={() => {
              setLangMenuOpen(!langMenuOpen);
              setThemeMenuOpen(false);
              setViewMenuOpen(false);
              setA11yMenuOpen(false);
            }}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[#262B52] border border-[#3A4178] text-xs text-[#EDEAF6] hover:border-[#FFC66B] transition-colors whitespace-nowrap"
            title="Select Language / भाषा चुनें"
          >
            <Languages className="w-3.5 h-3.5 text-[#FFC66B] shrink-0" />
            <span className="font-medium">
              {LANGUAGES.find((l) => l.code === language)?.flag}{" "}
              {LANGUAGES.find((l) => l.code === language)?.nativeName}
            </span>
            <ChevronDown className="w-3 h-3 text-[#9AA3D6] shrink-0" />
          </button>

          {langMenuOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-[#262B52] border border-[#3A4178] rounded-lg shadow-xl py-1 z-50 text-xs">
              <div className="px-3 py-1 text-[10px] uppercase text-[#9AA3D6] tracking-wider font-semibold">
                Language / भाषा
              </div>
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLanguage(l.code);
                    setLangMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[#3A4178] ${
                    language === l.code ? "text-[#FFC66B] font-semibold bg-[#14182B]/60" : "text-[#EDEAF6]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{l.flag}</span>
                    <span>{l.nativeName}</span>
                  </span>
                  <span className="text-[10px] text-[#9AA3D6] uppercase font-mono">{l.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Mode Selector (Dark, Light, Custom) */}
        <div className="relative shrink-0">
          <button
            onClick={() => {
              setThemeMenuOpen(!themeMenuOpen);
              setLangMenuOpen(false);
              setViewMenuOpen(false);
              setA11yMenuOpen(false);
            }}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[#262B52] border border-[#3A4178] text-xs text-[#EDEAF6] hover:border-[#FFC66B] transition-colors whitespace-nowrap"
            title="Theme Mode: Dark, Light, Custom"
          >
            {themeMode === "light" ? (
              <Sun className="w-3.5 h-3.5 text-[#FFC66B] shrink-0" />
            ) : themeMode === "dark" ? (
              <Moon className="w-3.5 h-3.5 text-[#9AA3D6] shrink-0" />
            ) : (
              <Palette className="w-3.5 h-3.5 text-[#FFC66B] shrink-0" />
            )}
            <span className="capitalize">
              {themeMode === "dark" ? t("dark", language) : themeMode === "light" ? t("light", language) : t("custom", language)}
            </span>
            <ChevronDown className="w-3 h-3 text-[#9AA3D6] shrink-0" />
          </button>

          {themeMenuOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-[#262B52] border border-[#3A4178] rounded-lg shadow-xl py-1 z-50 text-xs">
              <div className="px-3 py-1 text-[10px] uppercase text-[#9AA3D6] tracking-wider font-semibold">
                {t("theme", language)}
              </div>
              <button
                onClick={() => {
                  setThemeMode("dark");
                  setThemeMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[#3A4178] ${
                  themeMode === "dark" ? "text-[#FFC66B] font-semibold bg-[#14182B]/60" : "text-[#EDEAF6]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Moon className="w-3.5 h-3.5 text-[#9AA3D6]" />
                  <span>{t("dark", language)}</span>
                </span>
                {themeMode === "dark" && <Check className="w-3.5 h-3.5 text-[#FFC66B]" />}
              </button>
              <button
                onClick={() => {
                  setThemeMode("light");
                  setThemeMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[#3A4178] ${
                  themeMode === "light" ? "text-[#FFC66B] font-semibold bg-[#14182B]/60" : "text-[#EDEAF6]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Sun className="w-3.5 h-3.5 text-[#FFC66B]" />
                  <span>{t("light", language)}</span>
                </span>
                {themeMode === "light" && <Check className="w-3.5 h-3.5 text-[#FFC66B]" />}
              </button>
              <div className="border-t border-[#3A4178] my-1" />
              <div className="px-3 py-0.5 text-[10px] uppercase text-[#9AA3D6] tracking-wider font-semibold">
                {t("custom", language)} Themes
              </div>
              <button
                onClick={() => {
                  setThemeMode("custom-cyberpunk");
                  setThemeMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[#3A4178] ${
                  themeMode === "custom-cyberpunk" ? "text-[#FFC66B] font-semibold bg-[#14182B]/60" : "text-[#EDEAF6]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]" />
                  <span>{t("neonCyber", language)}</span>
                </span>
                {themeMode === "custom-cyberpunk" && <Check className="w-3.5 h-3.5 text-[#FFC66B]" />}
              </button>
              <button
                onClick={() => {
                  setThemeMode("custom-emerald");
                  setThemeMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[#3A4178] ${
                  themeMode === "custom-emerald" ? "text-[#FFC66B] font-semibold bg-[#14182B]/60" : "text-[#EDEAF6]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                  <span>{t("emeraldForest", language)}</span>
                </span>
                {themeMode === "custom-emerald" && <Check className="w-3.5 h-3.5 text-[#FFC66B]" />}
              </button>
              <button
                onClick={() => {
                  setThemeMode("custom-rose");
                  setThemeMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[#3A4178] ${
                  themeMode === "custom-rose" ? "text-[#FFC66B] font-semibold bg-[#14182B]/60" : "text-[#EDEAF6]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FB7185]" />
                  <span>{t("roseTwilight", language)}</span>
                </span>
                {themeMode === "custom-rose" && <Check className="w-3.5 h-3.5 text-[#FFC66B]" />}
              </button>
            </div>
          )}
        </div>

        {/* Accessibility Menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => setA11yMenuOpen(!a11yMenuOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#262B52] border border-[#3A4178] text-[#9AA3D6] hover:text-[#EDEAF6] hover:border-[#FFC66B] transition-colors shrink-0"
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
          className={`flex items-center gap-1.5 h-8 px-2.5 rounded-full text-xs transition-all border whitespace-nowrap shrink-0 ${
            allConsented
              ? "bg-[#5FD3A0]/15 border-[#5FD3A0] text-[#5FD3A0]"
              : "bg-[#262B52] border-[#3A4178] text-[#9AA3D6] hover:border-[#FFC66B]"
          }`}
          title="Caregiver load sharing consent"
        >
          <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
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
          <span className="font-mono text-[11px] whitespace-nowrap">
            {consentedCount} of {totalCaregivers} {t("sharing", language)}
          </span>
        </button>

        {/* Toggle Handoffs Drawer */}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs transition-colors border whitespace-nowrap shrink-0 ${
            drawerOpen
              ? "bg-[#FFC66B] text-[#14182B] font-semibold border-[#FFC66B]"
              : "bg-[#262B52] border-[#3A4178] text-[#EDEAF6] hover:border-[#FFC66B]"
          }`}
          title={drawerOpen ? "Close Handoffs Drawer" : "Open Handoffs Drawer"}
        >
          <Inbox className="w-3.5 h-3.5 shrink-0" />
          <span>{t("handoffs", language)}</span>
          {(household?.handoffs?.length ?? 0) > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono shrink-0 ${
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
