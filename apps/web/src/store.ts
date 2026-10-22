/**
 * Client-side state store (Zustand) for LoadBearing.
 * Holds the household data, viewer, clock and UI state.
 */
"use client";

import { create } from "zustand";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ClockState {
  anchorSimMs: number;
  anchorRealMs: number;
  speed: number;
  paused: boolean;
  serverRealNowMs: number;
}

export interface MemberState {
  id: string;
  name: string;
  role: "recipient" | "caregiver";
  city: string;
  lat: number;
  lon: number;
  timeZone: string;
  language: "en" | "hi";
  awakeStart: string;
  awakeEnd: string;
  isLocal: boolean;
  isBackup: boolean;
  consentShare: boolean;
}

export interface MomentState {
  id: string;
  source: "voice" | "doorstep" | "manual";
  text: string;
  capturedBy: string;
  capturedAt: string;
  classification: {
    kind: "care_task" | "memory" | "info";
    loadKind: "doing" | "planning" | "emotional" | null;
    urgency: "calm" | "soon" | "urgent_not_emergency";
    needsLocalPresence: boolean;
    summary: string;
    sensitive: boolean;
    emergency: boolean;
  };
  credits: Array<{
    label: string;
    loadKind: "doing" | "planning" | "emotional";
    evidence: string;
  }>;
  privacy: "private" | "shared" | "household";
  sharedWith: string[];
  duplicateOf: string | null;
  expiresAt: string | null;
  aiSource: "bedrock" | "rules";
  version: number;
}

export interface HandoffState {
  id: string;
  momentId: string;
  type: "task" | "memory";
  status: "awaiting_acceptance" | "accepted" | "resolved" | "unassigned" | "shared";
  assigneeId: string | null;
  skippedIds: string[];
  attempts: number;
  ackDeadline: string | null;
  explanation: {
    language: "en" | "hi";
    text: string;
  };
  reasonCodes: string[];
  history: Array<{
    at: string;
    actorId: string;
    action: string;
    details?: string;
  }>;
  createdAt: string;
  version: number;
}

export interface LoadEntryState {
  id: string;
  memberId: string;
  kind: "doing" | "planning" | "emotional";
  label: string;
  baseWeight: number;
  performedAt: string;
  inSleepWindow: boolean;
  multiplier: 1 | 2;
  effectiveWeight: number;
  momentId: string | null;
  handoffId: string | null;
}

export interface ProposalState {
  id: string;
  createdAt: string;
  expiresAt: string;
  windowDays: number;
  before: Array<{ memberId: string; share: number }>;
  after: Array<{ memberId: string; share: number }>;
  moves: Array<{ toMemberId: string; kind: string; count: number }>;
  rationale: string;
  status: "proposed" | "approved" | "expired";
  approvedBy: string | null;
}

export interface HouseholdData {
  id: string;
  members: MemberState[];
  clock: ClockState;
  moments: MomentState[];
  handoffs: HandoffState[];
  loadEntries: LoadEntryState[];
  proposals: ProposalState[];
  version: number;
}

export type SceneMode = "3d" | "2d";
export type SupportedLanguage = "en" | "hi" | "es" | "fr" | "de" | "ja";
export type ThemeMode = "dark" | "light" | "custom-cyberpunk" | "custom-emerald" | "custom-rose";

export interface AppStore {
  // Data
  household: HouseholdData | null;
  version: number;

  // UI
  viewerId: string;
  language: SupportedLanguage;
  themeMode: ThemeMode;
  sceneMode: SceneMode;
  drawerOpen: boolean;
  activeView: "map" | "handoffs" | "brief" | "privacy";
  demoControlsOpen: boolean;
  pendingAction: string | null;
  toasts: Array<{ id: string; message: string; type: "success" | "error" | "info" }>;
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;

  // Clock skew
  clockSkew: number; // serverRealNowMs - Date.now() at fetch time

  // Active handoff flight
  activeFlightHandoffId: string | null;

  // Actions
  setHousehold: (data: HouseholdData) => void;
  setViewerId: (id: string) => void;
  setLanguage: (lang: SupportedLanguage) => void;
  setThemeMode: (theme: ThemeMode) => void;
  setSceneMode: (mode: SceneMode) => void;
  setDrawerOpen: (open: boolean) => void;
  setActiveView: (view: "map" | "handoffs" | "brief" | "privacy") => void;
  setDemoControlsOpen: (open: boolean) => void;
  setPendingAction: (action: string | null) => void;
  addToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
  setHighContrast: (v: boolean) => void;
  setLargeText: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setClockSkew: (skew: number) => void;
  setActiveFlightHandoffId: (id: string | null) => void;
}

let toastCounter = 0;

export const useAppStore = create<AppStore>((set) => ({
  household: null,
  version: 0,
  viewerId: "priya",
  language: "en",
  themeMode: "dark",
  sceneMode: "3d",
  drawerOpen: false,
  activeView: "map",
  demoControlsOpen: false,
  pendingAction: null,
  toasts: [],
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  clockSkew: 0,
  activeFlightHandoffId: null,

  setHousehold: (data) =>
    set((state) => {
      // Discard stale data
      if (data.version <= state.version && state.household) return state;
      const normalizedData: HouseholdData = {
        ...data,
        loadEntries: data.loadEntries ?? [],
        proposals: data.proposals ?? [],
        moments: data.moments ?? [],
        handoffs: data.handoffs ?? [],
        members: data.members ?? [],
      };
      return { household: normalizedData, version: data.version };
    }),
  setViewerId: (id) => set({ viewerId: id }),
  setLanguage: (lang) => set({ language: lang }),
  setThemeMode: (theme) => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("dark", "light", "custom-cyberpunk", "custom-emerald", "custom-rose");
      document.documentElement.classList.add(theme);
    }
    set({ themeMode: theme });
  },
  setSceneMode: (mode) => set({ sceneMode: mode }),
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  setActiveView: (view) => set({ activeView: view }),
  setDemoControlsOpen: (open) => set({ demoControlsOpen: open }),
  setPendingAction: (action) => set({ pendingAction: action }),
  addToast: (message, type = "info") =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id: `toast-${++toastCounter}`, message, type },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  setHighContrast: (v) => set({ highContrast: v }),
  setLargeText: (v) => set({ largeText: v }),
  setReducedMotion: (v) => set({ reducedMotion: v }),
  setClockSkew: (skew) => set({ clockSkew: skew }),
  setActiveFlightHandoffId: (id) => set({ activeFlightHandoffId: id }),
}));

/**
 * Compute the current simulated time from the clock and skew.
 * Call in effects/useSyncExternalStore, never during render (hydration mismatch).
 */
export function computeSimNow(clock: ClockState, skew: number): number {
  if (clock.paused) return clock.anchorSimMs;
  return clock.anchorSimMs + (Date.now() + skew - clock.anchorRealMs) * clock.speed;
}
