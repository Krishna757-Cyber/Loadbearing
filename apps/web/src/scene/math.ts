/**
 * Scene math helpers for the Twilight Globe.
 * All angles in degrees unless noted. All vectors are Three.js-compatible {x,y,z}.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEG = Math.PI / 180;

// ─── Core Conversions ───────────────────────────────────────────────────────

/**
 * Convert latitude/longitude (degrees) to a unit-sphere position.
 * Convention: Y-up, X towards (0,0), Z right-hand.
 * phi = colatitude from north pole, theta = azimuth from -X axis.
 */
export function latLonToVector3(latDeg: number, lonDeg: number, r = 1): Vec3 {
  const phi = (90 - latDeg) * DEG;
  const theta = (lonDeg + 180) * DEG;
  return {
    x: -r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.cos(phi),
    z: r * Math.sin(phi) * Math.sin(theta),
  };
}

/**
 * Inverse of latLonToVector3. Returns [lat, lon] in degrees.
 */
export function vector3ToLatLon(v: Vec3): [number, number] {
  const r = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (r < 1e-12) return [0, 0];
  const lat = 90 - Math.acos(Math.max(-1, Math.min(1, v.y / r))) / DEG;
  const lon = Math.atan2(v.z, -v.x) / DEG - 180;
  // Normalize lon to [-180, 180]
  return [lat, ((lon + 540) % 360) - 180];
}

/**
 * Normalize a vector to unit length.
 */
export function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 1e-12) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/**
 * Dot product of two vectors.
 */
export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Add two vectors.
 */
export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

/**
 * Scale a vector.
 */
export function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

/**
 * Distance between two vectors.
 */
export function distance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// ─── Sun Direction ──────────────────────────────────────────────────────────

/**
 * Wrap value to [-180, 180].
 */
function wrap180(deg: number): number {
  return ((deg + 540) % 360) - 180;
}

/**
 * Day of year (1-based) for a UTC date.
 */
function dayOfYear(date: Date): number {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.floor((date.getTime() - start.getTime()) / 86400000) + 1;
}

/**
 * Compute the sun direction unit vector for a given UTC instant.
 * subsolarLon = (12 - utcHours) * 15  (wrapped to [-180, 180])
 * declination = -23.44 * cos(2π * (dayOfYear + 10) / 365)
 */
export function sunDirection(utcDate: Date): Vec3 {
  const utcHours =
    utcDate.getUTCHours() +
    utcDate.getUTCMinutes() / 60 +
    utcDate.getUTCSeconds() / 3600;
  const subsolarLon = wrap180((12 - utcHours) * 15);
  const doy = dayOfYear(utcDate);
  const declination = -23.44 * Math.cos((2 * Math.PI * (doy + 10)) / 365);
  return normalize(latLonToVector3(declination, subsolarLon));
}

// ─── Arc ────────────────────────────────────────────────────────────────────

/**
 * Quadratic Bezier arc between two unit-sphere positions.
 * Control point = normalize(a + b) * 1.35
 * Returns `segments + 1` points.
 */
export function arcPoints(a: Vec3, b: Vec3, segments = 64): Vec3[] {
  const mid = normalize(add(a, b));
  const control = scale(mid, 1.35);
  const points: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const u = 1 - t;
    points.push({
      x: u * u * a.x + 2 * u * t * control.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * control.y + t * t * b.y,
      z: u * u * a.z + 2 * u * t * control.z + t * t * b.z,
    });
  }
  return points;
}

// ─── Token Layout ───────────────────────────────────────────────────────────

/**
 * Compute position for the i-th token above a pillar.
 * Spiral layout: angle = i * 40°, radius = 0.03, rise = 0.014 * i.
 */
export function tokenPosition(
  pillarTop: Vec3,
  surfaceNormal: Vec3,
  i: number,
): Vec3 {
  const angle = i * 40 * DEG;
  const rise = 0.014 * i;

  // Create a local coordinate system on the surface
  // tangent = some vector perpendicular to normal
  let tangent: Vec3;
  if (Math.abs(surfaceNormal.y) < 0.99) {
    tangent = normalize({
      x: -surfaceNormal.z,
      y: 0,
      z: surfaceNormal.x,
    });
  } else {
    tangent = { x: 1, y: 0, z: 0 };
  }
  const bitangent = normalize({
    x: surfaceNormal.y * tangent.z - surfaceNormal.z * tangent.y,
    y: surfaceNormal.z * tangent.x - surfaceNormal.x * tangent.z,
    z: surfaceNormal.x * tangent.y - surfaceNormal.y * tangent.x,
  });

  const r = 0.03;
  return {
    x: pillarTop.x + surfaceNormal.x * rise + tangent.x * r * Math.cos(angle) + bitangent.x * r * Math.sin(angle),
    y: pillarTop.y + surfaceNormal.y * rise + tangent.y * r * Math.cos(angle) + bitangent.y * r * Math.sin(angle),
    z: pillarTop.z + surfaceNormal.z * rise + tangent.z * r * Math.cos(angle) + bitangent.z * r * Math.sin(angle),
  };
}

// ─── Camera ─────────────────────────────────────────────────────────────────

/**
 * Compute the overview camera target direction:
 * normalized sum of the caregivers' unit vectors.
 */
export function overviewDirection(positions: Vec3[]): Vec3 {
  if (positions.length === 0) return { x: 0, y: 0, z: 1 };
  const sum = positions.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }),
    { x: 0, y: 0, z: 0 },
  );
  return normalize(sum);
}

/**
 * Frame-rate-independent exponential damping factor.
 * Returns 1 - exp(-dt * speed) clamped to [0, 1].
 */
export function dampingFactor(dt: number, speed = 4): number {
  return Math.min(1, 1 - Math.exp(-dt * speed));
}
