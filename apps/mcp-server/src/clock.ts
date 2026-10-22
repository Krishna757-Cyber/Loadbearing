import type { Clock } from "@loadbearing/shared";
import { DEMO_ANCHOR_MS } from "@loadbearing/shared";

export class ClockManager {
  private clock: Clock;

  constructor(initialClock?: Clock) {
    this.clock = initialClock ?? {
      anchorSimMs: DEMO_ANCHOR_MS,
      anchorRealMs: Date.now(),
      speed: 1.0,
      paused: true,
    };
  }

  getClock(): Clock {
    return { ...this.clock };
  }

  setClock(clock: Clock): void {
    this.clock = { ...clock };
  }

  /**
   * Current simulated time in epoch milliseconds.
   */
  nowMs(realNowMs = Date.now()): number {
    if (this.clock.paused) {
      return this.clock.anchorSimMs;
    }
    const elapsedReal = realNowMs - this.clock.anchorRealMs;
    return Math.round(this.clock.anchorSimMs + elapsedReal * this.clock.speed);
  }

  /**
   * Current simulated time formatted as UTC ISO string.
   */
  now(realNowMs = Date.now()): string {
    return new Date(this.nowMs(realNowMs)).toISOString();
  }

  /**
   * Set simulated time directly to a specific ISO string.
   */
  set(iso: string, realNowMs = Date.now()): Clock {
    const targetSimMs = new Date(iso).getTime();
    this.clock = {
      anchorSimMs: targetSimMs,
      anchorRealMs: realNowMs,
      speed: this.clock.speed,
      paused: this.clock.paused,
    };
    return this.getClock();
  }

  /**
   * Advance simulated time by N minutes.
   */
  advance(minutes: number, realNowMs = Date.now()): Clock {
    const currentSimMs = this.nowMs(realNowMs);
    const advanceMs = minutes * 60 * 1000;
    this.clock = {
      anchorSimMs: currentSimMs + advanceMs,
      anchorRealMs: realNowMs,
      speed: this.clock.speed,
      paused: this.clock.paused,
    };
    return this.getClock();
  }

  /**
   * Unpause simulation.
   */
  play(realNowMs = Date.now()): Clock {
    if (!this.clock.paused) return this.getClock();
    this.clock = {
      anchorSimMs: this.clock.anchorSimMs,
      anchorRealMs: realNowMs,
      speed: this.clock.speed,
      paused: false,
    };
    return this.getClock();
  }

  /**
   * Pause simulation at current instant.
   */
  pause(realNowMs = Date.now()): Clock {
    if (this.clock.paused) return this.getClock();
    const currentSimMs = this.nowMs(realNowMs);
    this.clock = {
      anchorSimMs: currentSimMs,
      anchorRealMs: realNowMs,
      speed: this.clock.speed,
      paused: true,
    };
    return this.getClock();
  }

  /**
   * Set speed multiplier.
   */
  speed(multiplier: number, realNowMs = Date.now()): Clock {
    const currentSimMs = this.nowMs(realNowMs);
    this.clock = {
      anchorSimMs: currentSimMs,
      anchorRealMs: realNowMs,
      speed: Math.max(0, multiplier),
      paused: this.clock.paused,
    };
    return this.getClock();
  }

  /**
   * Format for wire response.
   */
  getWireState(realNowMs = Date.now()) {
    return {
      ...this.clock,
      serverRealNowMs: realNowMs,
      simNow: this.now(realNowMs),
    };
  }
}
