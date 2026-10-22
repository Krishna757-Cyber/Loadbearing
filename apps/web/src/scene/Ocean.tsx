/**
 * Ocean — Day/night sphere using a custom ShaderMaterial.
 * Mixes night (#171C3A) and day (#2A3366) by dot(worldNormal, uSunDir).
 */
"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Vec3 } from "./math";

const vertexShader = /* glsl */ `
  varying vec3 vWorldNormal;
  void main() {
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uNightColor;
  uniform vec3 uDayColor;
  varying vec3 vWorldNormal;
  void main() {
    float d = dot(normalize(vWorldNormal), uSunDir);
    float t = smoothstep(-0.12, 0.18, d);
    vec3 color = mix(uNightColor, uDayColor, t);
    gl_FragColor = vec4(color, 1.0);
  }
`;

interface OceanProps {
  sunDirRef: React.RefObject<Vec3 | null>;
}

export function Ocean({ sunDirRef }: OceanProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uNightColor: { value: new THREE.Color("#171C3A") },
      uDayColor: { value: new THREE.Color("#2A3366") },
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
      <sphereGeometry args={[0.995, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
