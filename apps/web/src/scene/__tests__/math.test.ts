import { describe, it, expect } from "vitest";
import {
  latLonToVector3,
  vector3ToLatLon,
  sunDirection,
  arcPoints,
  overviewDirection,
  dampingFactor,
  type Vec3,
} from "../math.js";

function approxVec(v: Vec3, expected: Vec3) {
  expect(v.x).toBeCloseTo(expected.x, 5);
  expect(v.y).toBeCloseTo(expected.y, 5);
  expect(v.z).toBeCloseTo(expected.z, 5);
}

describe("latLonToVector3", () => {
  it("(0, 0) -> (1, 0, 0)", () => {
    // phi = 90°, theta = 180°
    // x = -sin(90)*cos(180) = -1*(-1) = 1
    // y = cos(90) = 0
    // z = sin(90)*sin(180) = 1*0 = 0
    approxVec(latLonToVector3(0, 0), { x: 1, y: 0, z: 0 });
  });

  it("(90, 0) -> (0, 1, 0)", () => {
    // North pole: phi = 0
    // x = -sin(0)*cos(180) = 0
    // y = cos(0) = 1
    // z = sin(0)*sin(180) = 0
    approxVec(latLonToVector3(90, 0), { x: 0, y: 1, z: 0 });
  });

  it("(-90, 0) -> (0, -1, 0)", () => {
    approxVec(latLonToVector3(-90, 0), { x: 0, y: -1, z: 0 });
  });

  it("scales by radius", () => {
    const v = latLonToVector3(0, 0, 2);
    approxVec(v, { x: 2, y: 0, z: 0 });
  });
});

describe("vector3ToLatLon round trip", () => {
  const cases: [number, number][] = [
    [0, 0],
    [90, 0],
    [-90, 0],
    [45, 90],
    [-30, -120],
    [18.5204, 73.8567], // Pune
    [52.52, 13.405],    // Berlin
    [43.6532, -79.3832], // Toronto
  ];

  for (const [lat, lon] of cases) {
    it(`round-trips (${lat}, ${lon})`, () => {
      const v = latLonToVector3(lat, lon);
      const [rlat, rlon] = vector3ToLatLon(v);
      expect(rlat).toBeCloseTo(lat, 3);
      expect(rlon).toBeCloseTo(lon, 3);
    });
  }
});

describe("sunDirection", () => {
  it("at 2026-10-22T16:30:00Z (demo instant)", () => {
    const date = new Date("2026-10-22T16:30:00Z");
    const sun = sunDirection(date);
    // Should be a unit vector
    const len = Math.sqrt(sun.x * sun.x + sun.y * sun.y + sun.z * sun.z);
    expect(len).toBeCloseTo(1, 5);

    // subsolarLon = (12 - 16.5) * 15 = -67.5 degrees
    // dayOfYear for Oct 22 ≈ 295
    // declination = -23.44 * cos(2π * (295 + 10) / 365) ≈ -23.44 * cos(2π*305/365)
    // = -23.44 * cos(5.2517) ≈ -23.44 * 0.496 ≈ -11.6
    // So sun should be in southern hemisphere (negative y)
    expect(sun.y).toBeLessThan(0);
  });

  it("at noon UTC the subsolar point is near 0° longitude", () => {
    const date = new Date("2026-03-20T12:00:00Z"); // near equinox
    const sun = sunDirection(date);
    // At equinox, declination ≈ 0, subsolarLon = 0
    // So sun should be roughly at (1, ~0, 0)
    expect(sun.x).toBeGreaterThan(0.9);
    expect(Math.abs(sun.y)).toBeLessThan(0.15);
  });

  it("at midnight UTC the subsolar point is near 180° longitude", () => {
    const date = new Date("2026-03-20T00:00:00Z");
    const sun = sunDirection(date);
    // subsolarLon = (12 - 0) * 15 = 180 -> wraps to 180 or -180
    // latLonToVector3(~0, 180) gives x ≈ -1
    expect(sun.x).toBeLessThan(-0.9);
  });
});

describe("arcPoints", () => {
  it("returns 65 points by default (64 segments)", () => {
    const a = latLonToVector3(18.5204, 73.8567); // Pune
    const b = latLonToVector3(52.52, 13.405);     // Berlin
    const pts = arcPoints(a, b);
    expect(pts).toHaveLength(65);
  });

  it("starts at a and ends at b", () => {
    const a = latLonToVector3(18.5204, 73.8567);
    const b = latLonToVector3(52.52, 13.405);
    const pts = arcPoints(a, b);
    approxVec(pts[0], a);
    approxVec(pts[64], b);
  });

  it("midpoint is above the surface (r > 1) for nearby cities", () => {
    const a = latLonToVector3(18.5204, 73.8567);  // Pune
    const b = latLonToVector3(52.52, 13.405);      // Berlin
    const pts = arcPoints(a, b);
    const mid = pts[32];
    const r = Math.sqrt(mid.x * mid.x + mid.y * mid.y + mid.z * mid.z);
    expect(r).toBeGreaterThan(1);
  });
});

describe("overviewDirection", () => {
  it("returns normalized sum of positions", () => {
    const positions = [
      latLonToVector3(18.5204, 73.8567),   // Pune
      latLonToVector3(52.52, 13.405),       // Berlin
      latLonToVector3(43.6532, -79.3832),   // Toronto
    ];
    const dir = overviewDirection(positions);
    const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
    expect(len).toBeCloseTo(1, 5);
  });

  it("returns (0, 0, 1) for empty positions", () => {
    approxVec(overviewDirection([]), { x: 0, y: 0, z: 1 });
  });
});

describe("dampingFactor", () => {
  it("returns 0 for dt = 0", () => {
    expect(dampingFactor(0)).toBeCloseTo(0);
  });

  it("approaches 1 for large dt", () => {
    expect(dampingFactor(10)).toBeCloseTo(1, 2);
  });

  it("is between 0 and 1 for typical dt", () => {
    const f = dampingFactor(0.016); // ~60fps
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThan(1);
  });
});
