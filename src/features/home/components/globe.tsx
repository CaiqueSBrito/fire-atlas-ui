"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { latLonToVector3 } from "@/lib/utils/geo";

// Focos ilustrativos (não são dados reais): [lat, lon].
const HOTSPOTS: Array<[number, number]> = [
  [-8, -60],
  [37, -120],
  [-33, 148],
  [60, 105],
  [-3, 22],
  [-2, 113],
  [39, 22],
  [-15, -47],
];

function Hotspot({
  lat,
  lon,
  phase,
  animate,
}: {
  lat: number;
  lon: number;
  phase: number;
  animate: boolean;
}) {
  const pulse = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!animate || !pulse.current) return;
    pulse.current.scale.setScalar(
      1 + 0.7 * ((Math.sin(clock.elapsedTime * 2 + phase) + 1) / 2),
    );
  });
  return (
    <group position={latLonToVector3(lat, lon, 1.004)}>
      <mesh>
        <sphereGeometry args={[0.014, 12, 12]} />
        <meshBasicMaterial color="#ff4a3d" />
      </mesh>
      <mesh ref={pulse}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshBasicMaterial
          color="#ff4a3d"
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Earth({ reduceMotion }: { reduceMotion: boolean }) {
  const root = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const map = useTexture("/textures/earth.jpg");

  useFrame(({ pointer, camera, size }, delta) => {
    const aspect = size.width / size.height;
    // Enquadramento responsivo: afasta a câmera em telas estreitas e desloca
    // o globo (direita no desktop, parte superior no celular).
    camera.position.z = Math.max(3.6, 3.2 / aspect);
    const halfH = camera.position.z * Math.tan(THREE.MathUtils.degToRad(22.5));
    root.current?.position.set(
      aspect > 1.2 ? halfH * aspect * 0.32 : 0,
      aspect > 1.2 ? 0 : halfH * 0.32,
      0,
    );

    // Resposta ao mouse (CA02): o ponteiro inclina o globo e acelera a rotação.
    if (tilt.current) {
      tilt.current.rotation.x = THREE.MathUtils.damp(
        tilt.current.rotation.x,
        -pointer.y * 0.45,
        4,
        delta,
      );
    }
    if (spin.current) {
      spin.current.rotation.y +=
        delta * ((reduceMotion ? 0 : 0.1) + pointer.x * 0.7);
    }
  });

  return (
    <group ref={root}>
      <group rotation={[0, 0, 0.2]}>
        <group ref={tilt}>
          <group ref={spin}>
            <mesh>
              <sphereGeometry args={[1, 64, 64]} />
              <meshStandardMaterial map={map} roughness={1} />
            </mesh>
            {HOTSPOTS.map(([lat, lon], i) => (
              <Hotspot
                key={i}
                lat={lat}
                lon={lon}
                phase={i * 1.3}
                animate={!reduceMotion}
              />
            ))}
          </group>
        </group>
      </group>
      {/* Atmosfera */}
      <mesh>
        <sphereGeometry args={[1.1, 64, 64]} />
        <meshBasicMaterial
          color="#3aa6ff"
          transparent
          opacity={0.14}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default function Globe() {
  const reduceMotion = usePrefersReducedMotion();
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 3.6], fov: 45 }}
      // Escuta o mouse na página toda (o texto do hero fica por cima do canvas).
      eventSource={document.body}
      eventPrefix="client"
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 2, 5]} intensity={2.2} />
      <Stars
        radius={60}
        depth={40}
        count={2500}
        factor={3}
        fade
        speed={reduceMotion ? 0 : 0.6}
      />
      <Suspense fallback={null}>
        <Earth reduceMotion={reduceMotion} />
      </Suspense>
    </Canvas>
  );
}
