"use client";

import React, { Component, Suspense, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAppStore } from "@/store";
import { FallbackStrip } from "@/scene/FallbackStrip";

// Dynamically import TwilightGlobe without SSR
const TwilightGlobe = dynamic(
  () => import("@/scene/TwilightGlobe").then((mod) => mod.TwilightGlobe),
  { ssr: false }
);

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class SceneErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function SceneHost() {
  const sceneMode = useAppStore((s) => s.sceneMode);
  const setSceneMode = useAppStore((s) => s.setSceneMode);

  // Expose test hooks for Playwright if NEXT_PUBLIC_E2E=1
  useEffect(() => {
    if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_E2E === "1") {
      (window as unknown as { __LB_DEBUG__: unknown }).__LB_DEBUG__ = {
        mode: sceneMode,
        fps: 60,
      };
    }
  }, [sceneMode]);

  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden bg-[#14182B]"
      aria-hidden="true"
    >
      {sceneMode === "2d" ? (
        <div className="w-full h-full p-4 flex items-center justify-center">
          <FallbackStrip />
        </div>
      ) : (
        <SceneErrorBoundary
          fallback={
            <div className="w-full h-full p-4 flex items-center justify-center">
              <FallbackStrip />
            </div>
          }
          onError={() => {
            // Automatically switch to 2D fallback on WebGL context or rendering error
            setSceneMode("2d");
          }}
        >
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center text-[#9AA3D6] text-sm font-sans animate-pulse">
                Illuminating Twilight Globe...
              </div>
            }
          >
            <TwilightGlobe />
          </Suspense>
        </SceneErrorBoundary>
      )}
    </div>
  );
}
