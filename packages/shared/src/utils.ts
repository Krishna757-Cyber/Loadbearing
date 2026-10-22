// Shared utility: generate prefixed nanoid
// Node 20+ ships globalThis.crypto (Web Crypto API), no require() needed.

export function makeId(prefix: string): string {
  // 10-char random from URL-safe base64 alphabet
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  let result = prefix + "_";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  for (const b of bytes) {
    result += chars[b % 64];
  }
  return result;
}

/**
 * Clamp a number between min and max.
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Wrap degrees to [-180, 180].
 */
export function wrap180(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/**
 * Day of year (1-based, UTC).
 */
export function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = date.getTime() - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
