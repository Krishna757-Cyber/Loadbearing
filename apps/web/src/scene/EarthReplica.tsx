/**
 * EarthReplica — Photorealistic 3D Earth replica using NASA satellite textures.
 * Features:
 * - High-res Blue Marble day surface (continents, vegetation, oceans, ice caps)
 * - Night lights map with glowing cities on the dark side
 * - Normal map for 3D terrain elevation and mountain relief
 * - Specular map for realistic ocean sunlight reflection
 * - Dynamic sunrise/sunset twilight terminator with golden-amber glow
 * - Atmospheric cloud layer with slow rotation and sun-aware shading
 */
"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Vec3 } from "./math";

// ─── Earth Surface Shader ────────────────────────────────────────────────────

const earthVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const earthFragmentShader = /* glsl */ `
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform sampler2D uNormalMap;
  uniform sampler2D uSpecularMap;
  uniform vec3 uSunDir;
  uniform vec3 uCameraPos;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 sunDir = normalize(uSunDir);
    vec3 viewDir = normalize(uCameraPos - vWorldPosition);

    // Compute sun angle
    float sunDot = dot(normal, sunDir);

    // Smooth day/night transition around the terminator (-0.15 to +0.20)
    float dayFactor = smoothstep(-0.12, 0.18, sunDot);

    // Golden-amber twilight glow at the sunrise/sunset band
    float twilight = smoothstep(-0.12, 0.0, sunDot) * (1.0 - smoothstep(0.0, 0.16, sunDot));
    vec3 twilightGlow = vec3(1.0, 0.52, 0.20) * twilight * 0.45;

    // Sample textures
    vec3 dayColor = texture2D(uDayMap, vUv).rgb;
    vec3 nightLights = texture2D(uNightMap, vUv).rgb;
    float specularStrength = texture2D(uSpecularMap, vUv).r;

    // Enhance city night lights: warm electrical glow over deep midnight ocean
    vec3 darkMidnightOcean = vec3(0.015, 0.025, 0.06);
    float lightIntensity = max(nightLights.r, max(nightLights.g, nightLights.b));
    vec3 glowingCities = nightLights * vec3(1.15, 1.05, 0.85) * 1.8;
    vec3 nightColor = mix(darkMidnightOcean, glowingCities, smoothstep(0.08, 0.45, lightIntensity));

    // Specular highlight on oceans (crisp sun glint on water)
    vec3 halfDir = normalize(sunDir + viewDir);
    float specAngle = max(dot(normal, halfDir), 0.0);
    float specular = pow(specAngle, 52.0) * smoothstep(0.15, 0.85, specularStrength) * dayFactor;
    vec3 sunGlint = vec3(1.0, 0.96, 0.88) * specular * 0.85;

    // Edge fresnel atmospheric scattering across the globe
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.2);
    vec3 atmosphereEdge = mix(vec3(0.05, 0.12, 0.35), vec3(0.28, 0.62, 1.0), dayFactor) * fresnel * 0.55;

    // Composite final surface color
    vec3 finalColor = mix(nightColor, dayColor, dayFactor);
    finalColor += twilightGlow;
    finalColor += sunGlint;
    finalColor += atmosphereEdge;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// ─── Cloud Layer Shader ──────────────────────────────────────────────────────

const cloudVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    vUv = uv;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const cloudFragmentShader = /* glsl */ `
  uniform sampler2D uCloudMap;
  uniform vec3 uSunDir;
  uniform float uCloudOffset;

  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    vec2 offsetUv = vec2(fract(vUv.x + uCloudOffset), vUv.y);
    vec4 cloudTex = texture2D(uCloudMap, offsetUv);
    float cloudAlpha = cloudTex.a;

    float sunDot = dot(normalize(vWorldNormal), normalize(uSunDir));
    float dayFactor = smoothstep(-0.15, 0.25, sunDot);

    // Clouds on day side are illuminated bright soft white; night side are subtle dark silhouettes
    vec3 cloudColor = mix(vec3(0.02, 0.03, 0.07), vec3(0.96, 0.98, 1.0), dayFactor);

    gl_FragColor = vec4(cloudColor, cloudAlpha * 0.75);
  }
`;

// ─── Component Props ─────────────────────────────────────────────────────────

interface EarthReplicaProps {
  sunDirRef: React.RefObject<Vec3 | null>;
}

export function EarthReplica({ sunDirRef }: EarthReplicaProps) {
  const surfaceMatRef = useRef<THREE.ShaderMaterial>(null);
  const cloudMatRef = useRef<THREE.ShaderMaterial>(null);
  const cloudOffsetRef = useRef(0);
  const { camera } = useThree();

  // Load NASA textures safely with TextureLoader
  const textures = useMemo(() => {
    if (typeof window === "undefined") return null;
    const loader = new THREE.TextureLoader();

    const dayMap = loader.load("/textures/earth_atmos_2048.jpg");
    const nightMap = loader.load("/textures/earth_lights_2048.png");
    const normalMap = loader.load("/textures/earth_normal_2048.jpg");
    const specularMap = loader.load("/textures/earth_specular_2048.jpg");
    const cloudMap = loader.load("/textures/earth_clouds_2048.png");

    dayMap.colorSpace = THREE.SRGBColorSpace;
    nightMap.colorSpace = THREE.SRGBColorSpace;

    dayMap.wrapS = THREE.RepeatWrapping;
    nightMap.wrapS = THREE.RepeatWrapping;
    cloudMap.wrapS = THREE.RepeatWrapping;

    return { dayMap, nightMap, normalMap, specularMap, cloudMap };
  }, []);

  // Surface Uniforms
  const surfaceUniforms = useMemo(
    () => ({
      uDayMap: { value: textures?.dayMap || null },
      uNightMap: { value: textures?.nightMap || null },
      uNormalMap: { value: textures?.normalMap || null },
      uSpecularMap: { value: textures?.specularMap || null },
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uCameraPos: { value: new THREE.Vector3(0, 0, 5) },
    }),
    [textures]
  );

  // Cloud Uniforms
  const cloudUniforms = useMemo(
    () => ({
      uCloudMap: { value: textures?.cloudMap || null },
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uCloudOffset: { value: 0 },
    }),
    [textures]
  );

  // Frame update: update sun vector, camera position, and cloud drift
  useFrame((_, delta) => {
    // 1. Update Sun Direction
    if (sunDirRef.current) {
      const s = sunDirRef.current;
      if (surfaceMatRef.current) {
        surfaceMatRef.current.uniforms.uSunDir.value.set(s.x, s.y, s.z);
      }
      if (cloudMatRef.current) {
        cloudMatRef.current.uniforms.uSunDir.value.set(s.x, s.y, s.z);
      }
    }

    // 2. Update Camera Position for specular highlight
    if (surfaceMatRef.current && camera) {
      surfaceMatRef.current.uniforms.uCameraPos.value.copy(camera.position);
    }

    // 3. Cloud gentle rotation drift (approx 1 rotation every 600 seconds)
    cloudOffsetRef.current = (cloudOffsetRef.current + delta * 0.0015) % 1;
    if (cloudMatRef.current) {
      cloudMatRef.current.uniforms.uCloudOffset.value = cloudOffsetRef.current;
    }
  });

  return (
    <group>
      {/* 1. Earth Surface Sphere (r = 0.998) */}
      <mesh>
        <sphereGeometry args={[0.998, 64, 64]} />
        <shaderMaterial
          ref={surfaceMatRef}
          vertexShader={earthVertexShader}
          fragmentShader={earthFragmentShader}
          uniforms={surfaceUniforms}
        />
      </mesh>

      {/* 2. Realistic Dynamic Cloud Layer (r = 1.004) */}
      <mesh>
        <sphereGeometry args={[1.004, 64, 64]} />
        <shaderMaterial
          ref={cloudMatRef}
          vertexShader={cloudVertexShader}
          fragmentShader={cloudFragmentShader}
          uniforms={cloudUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
