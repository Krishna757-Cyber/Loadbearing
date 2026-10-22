/**
 * LandDots — Instanced land dots loaded from dots.bin.
 * Custom shader for day/night terminator on each dot.
 */
"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLonToVector3, type Vec3 } from "./math";

const dotVertexShader = /* glsl */ `
  attribute vec3 instanceNorm;
  varying vec3 vWorldNormal;
  varying vec3 vInstancePos;
  void main() {
    // InstancedMesh provides instanceMatrix automatically
    vec4 worldPos = instanceMatrix * vec4(position, 1.0);
    vWorldNormal = normalize((instanceMatrix * vec4(normal, 0.0)).xyz);
    vInstancePos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const dotFragmentShader = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uDayColor;
  uniform vec3 uNightColor;
  varying vec3 vWorldNormal;
  void main() {
    float d = dot(normalize(vWorldNormal), uSunDir);
    float t = smoothstep(-0.12, 0.18, d);
    vec3 dayC = uDayColor;
    vec3 nightC = uNightColor;
    vec3 color = mix(nightC * 0.35, dayC, t);
    float alpha = mix(0.35, 1.0, t);
    gl_FragColor = vec4(color, alpha);
  }
`;

interface LandDotsProps {
  sunDirRef: React.RefObject<Vec3 | null>;
  reduced?: boolean;
}

export function LandDots({ sunDirRef, reduced = false }: LandDotsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const [dotsData, setDotsData] = useState<{ lat: number; lon: number }[]>([]);

  // Load dots.bin
  useEffect(() => {
    fetch("/dots.bin")
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const int16 = new Int16Array(buf);
        const dots: { lat: number; lon: number }[] = [];
        const step = reduced ? 2 : 1; // skip every other dot for perf mode
        for (let i = 0; i < int16.length; i += 2 * step) {
          dots.push({ lat: int16[i] / 100, lon: int16[i + 1] / 100 });
        }
        setDotsData(dots);
      })
      .catch(console.error);
  }, [reduced]);

  // Set up instance matrices
  useEffect(() => {
    if (!meshRef.current || dotsData.length === 0) return;

    const mesh = meshRef.current;
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion();

    for (let i = 0; i < dotsData.length; i++) {
      const { lat, lon } = dotsData[i];
      const pos = latLonToVector3(lat, lon, 1.001);
      const normal = new THREE.Vector3(pos.x, pos.y, pos.z).normalize();

      dummy.position.set(pos.x, pos.y, pos.z);
      q.setFromUnitVectors(up, normal);
      dummy.quaternion.copy(q);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = dotsData.length;
  }, [dotsData]);

  const uniforms = useMemo(
    () => ({
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uDayColor: { value: new THREE.Color("#EDEAF6") },
      uNightColor: { value: new THREE.Color("#9AA3D6") },
    }),
    [],
  );

  // Update sun direction each frame (no React state)
  useFrame(() => {
    if (matRef.current && sunDirRef.current) {
      const s = sunDirRef.current;
      matRef.current.uniforms.uSunDir.value.set(s.x, s.y, s.z);
    }
  });

  if (dotsData.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, dotsData.length]}>
      <circleGeometry args={[0.004, 6]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={dotVertexShader}
        fragmentShader={dotFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}
