/**
 * Server-side in-memory singleton for simulated clock state on Vercel.
 * Preserves clock advances across /api/admin/clock and /api/state requests.
 */

export interface ServerSimulatedClock {
  anchorSimMs: number;
  anchorRealMs: number;
  speed: number;
  paused: boolean;
  serverRealNowMs: number;
}

declare global {
  var __LOADBEARING_CLOCK__: ServerSimulatedClock | undefined;
}

// Baseline demo instant: 2026-10-22T16:30:00Z
export const SEED_INSTANT_MS = 1792686600000;

export function getServerClock(): ServerSimulatedClock {
  if (!globalThis.__LOADBEARING_CLOCK__) {
    globalThis.__LOADBEARING_CLOCK__ = {
      anchorSimMs: SEED_INSTANT_MS,
      anchorRealMs: Date.now(),
      speed: 1,
      paused: true,
      serverRealNowMs: Date.now(),
    };
  }
  return globalThis.__LOADBEARING_CLOCK__;
}

export function updateServerClock(
  action: string,
  payload: { speed?: number; minutes?: number } = {}
): ServerSimulatedClock {
  const clock = getServerClock();
  const now = Date.now();

  if (action === "play") {
    clock.anchorRealMs = now;
    clock.paused = false;
  } else if (action === "pause") {
    if (!clock.paused) {
      clock.anchorSimMs = clock.anchorSimMs + (now - clock.anchorRealMs) * clock.speed;
    }
    clock.paused = true;
    clock.anchorRealMs = now;
  } else if (action === "speed" && typeof payload.speed === "number") {
    if (!clock.paused) {
      clock.anchorSimMs = clock.anchorSimMs + (now - clock.anchorRealMs) * clock.speed;
    }
    clock.speed = payload.speed;
    clock.anchorRealMs = now;
  } else if (action === "advance" && typeof payload.minutes === "number") {
    clock.anchorSimMs += payload.minutes * 60 * 1000;
    clock.anchorRealMs = now;
  } else if (action === "reset") {
    clock.anchorSimMs = SEED_INSTANT_MS;
    clock.anchorRealMs = now;
    clock.speed = 1;
    clock.paused = true;
  }

  clock.serverRealNowMs = now;
  return clock;
}
