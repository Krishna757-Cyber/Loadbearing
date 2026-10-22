/**
 * Atmosphere — Additive-blending fresnel glow on a slightly larger sphere.
 * Day side: Lantern #FFC66B, night side: Indigo #4B55A8.
 */
"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Vec3 } from "./math";

const vertexShader = /* glsl */ `
  varying vec3 vViewNormal;
  varying vec3 vWorldNormal;
  void main() {
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewPos;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uDayGlow;
  uniform vec3 uNightGlow;
  varying vec3 vViewNormal;
  varying vec3 vWorldNormal;
  void main() {
    float fresnel = pow(1.0 - abs(dot(vViewNormal, vec3(0.0, 0.0, 1.0))), 3.0);
    float sunFactor = smoothstep(-0.12, 0.18, dot(normalize(vWorldNormal), uSunDir));
    vec3 color = mix(uNightGlow, uDayGlow, sunFactor);
    gl_FragColor = vec4(color, fresnel * 0.6);
  }
`;

interface AtmosphereProps {
  sunDirRef: React.RefObject<Vec3 | null>;
}

export function Atmosphere({ sunDirRef }: AtmosphereProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uDayGlow: { value: new THREE.Color("#4BA2FF") },
      uNightGlow: { value: new THREE.Color("#2E3875") },
    }),
    [],
  );

  useFrame(() => {
    if (matRef.current && sunDirRef.current) {
      const s = sunDirRef.current;
      matRef.current.uniforms.uSunDir.value.set(s.x, s.y, s.z);
    }
  });

  return (
    <mesh>
      <sphereGeometry args={[1.07, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.BackSide}
      />
    </mesh>
  );
}
