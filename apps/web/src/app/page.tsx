"use client";

import React, { useEffect, useCallback, useRef } from "react";
import { useAppStore } from "@/store";
import { SceneHost } from "@/components/SceneHost";
import { TopBar } from "@/components/TopBar";
import { MemberChips } from "@/components/MemberChips";
import { HandoffDrawer } from "@/components/HandoffDrawer";
import { VoiceOrb } from "@/components/VoiceOrb";
import { BriefView } from "@/components/BriefView";
import { PrivacyView } from "@/components/PrivacyView";
import { Legend } from "@/components/Legend";
import { DemoControls } from "@/components/DemoControls";
import { ToastContainer } from "@/components/ToastContainer";

export default function Home() {
  const viewerId = useAppStore((s) => s.viewerId);
  const activeView = useAppStore((s) => s.activeView);
  const setHousehold = useAppStore((s) => s.setHousehold);
  const setClockSkew = useAppStore((s) => s.setClockSkew);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch state for current viewer
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/state?viewer=${encodeURIComponent(viewerId)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok && data.data) {
        // Calculate clock skew: serverRealNowMs - clientNow
        if (data.data.clock?.serverRealNowMs) {
          const skew = data.data.clock.serverRealNowMs - Date.now();
          setClockSkew(skew);
        }
        setHousehold(data.data);
      }
    } catch {
      // Background poll failure
    }
  }, [viewerId, setHousehold, setClockSkew]);

  // Initial fetch on mount and whenever viewer changes
  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Real-time EventSource connection to MCP server
  useEffect(() => {
    const sseUrl =
      process.env.NEXT_PUBLIC_MCP_EVENTS_URL ??
      (typeof window !== "undefined" && window.location.hostname !== "localhost"
        ? "/events"
        : "http://localhost:8787/events");

    let es: EventSource | null = null;
    try {
      es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.addEventListener("state_changed", () => {
        fetchState();
      });

      es.onerror = () => {
        // EventSource will automatically retry connection
      };
    } catch {
      // EventSource failed to instantiate
    }

    // Polling fallback every 3 seconds to ensure sync
    const pollTimer = setInterval(() => {
      fetchState();
    }, 3000);

    return () => {
      clearInterval(pollTimer);
      if (es) {
        es.close();
      }
    };
  }, [fetchState]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#14182B] flex flex-col font-sans select-none">
      {/* Persistent 3D / 2D Scene Shell */}
      <SceneHost />

      {/* Top Bar Navigation & Controls */}
      <TopBar />

      {/* Member Timezone and Sleep Tax Chips */}
      {activeView === "map" && <MemberChips />}

      {/* View Overlays */}
      <main className="relative z-10 flex-1 overflow-y-auto pointer-events-none">
        {activeView === "brief" && (
          <div className="pointer-events-auto min-h-full py-6">
            <BriefView />
          </div>
        )}

        {activeView === "privacy" && (
          <div className="pointer-events-auto min-h-full py-6">
            <PrivacyView />
          </div>
        )}

        {/* Handoff Drawer & Voice Orb on Map / Globe view */}
        {activeView === "map" && (
          <>
            <div className="pointer-events-auto">
              <HandoffDrawer />
            </div>
            <VoiceOrb />
            <Legend />
          </>
        )}

        {/* Direct Handoffs view */}
        {activeView === "handoffs" && (
          <div className="pointer-events-auto min-h-full flex justify-center py-6">
            <div className="w-full max-w-xl px-4">
              <HandoffDrawer />
            </div>
          </div>
        )}
      </main>

      {/* Demo Controls Drawer (Key D) */}
      <DemoControls />

      {/* Bottom Right Honest Labels Notice */}
      <div className="fixed bottom-2 right-4 z-10 pointer-events-none text-[10px] text-[#9AA3D6]/70 hidden sm:block">
        Simulated Alexa+ surface and simulated doorstep events. Demo data.
      </div>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
