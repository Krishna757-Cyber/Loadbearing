/**
 * build-dots.ts — Generate land dots for the globe.
 *
 * Uses a Fibonacci sphere to distribute ~18000 sample points evenly,
 * then uses d3-geo + world-atlas to keep only points on land.
 * Outputs public/dots.bin as Int16Array of [lat*100, lon*100] pairs.
 *
 * Usage: npx tsx scripts/build-dots.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const topojson = await import("topojson-client");
  const d3Geo = await import("d3-geo");

  // Load world-atlas topology from JSON
  const topoPath = resolve(__dirname, "..", "node_modules", "world-atlas", "land-110m.json");
  const topology = JSON.parse(readFileSync(topoPath, "utf-8"));

  const land = topojson.feature(topology, topology.objects.land);

  // Fibonacci sphere: distribute N points approximately evenly on the sphere
  const N = 18000;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const landPoints: number[] = [];

  for (let i = 0; i < N; i++) {
    const lat = Math.asin(1 - (2 * i) / (N - 1)) * (180 / Math.PI);
    const lon = ((goldenAngle * i * 180) / Math.PI) % 360;
    const normalizedLon = lon > 180 ? lon - 360 : lon;

    const point: [number, number] = [normalizedLon, lat];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (d3Geo.geoContains(land as any, point)) {
      landPoints.push(Math.round(lat * 100));
      landPoints.push(Math.round(normalizedLon * 100));
    }
  }

  const numDots = landPoints.length / 2;
  console.log(`Generated ${numDots} land dots`);

  // Write as Int16Array
  const buffer = new Int16Array(landPoints);
  const outDir = resolve(__dirname, "..", "apps", "web", "public");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "dots.bin");
  writeFileSync(outPath, Buffer.from(buffer.buffer));

  const sizeKB = (buffer.byteLength / 1024).toFixed(1);
  console.log(`Wrote ${outPath} (${sizeKB} KB, ${numDots} dots)`);
}

main().catch((err) => {
  console.error("Failed to generate dots:", err);
  process.exit(1);
});
