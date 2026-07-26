"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import {
  Group,
  MathUtils,
  Mesh,
  PCFSoftShadowMap,
  SRGBColorSpace,
} from "three";
import { useGLTF } from "@react-three/drei";

export type BasketballRotation = {
  x: number;
  y: number;
};

type BasketballSceneProps = {
  rotation: MutableRefObject<BasketballRotation>;
  interacting: MutableRefObject<boolean>;
  visible: boolean;
  reducedMotion: boolean;
};

function BasketballModel({
  rotation,
  interacting,
  visible,
  reducedMotion,
}: BasketballSceneProps) {
  const groupRef = useRef<Group>(null);
  const renderedRotation = useRef<BasketballRotation>({ ...rotation.current });
  const automaticYaw = useRef(0);
  const gltf = useGLTF("/models/balon-san-juan.glb", false, true);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    scene.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = true;
    });
  }, [scene]);

  useFrame((_, rawDelta) => {
    if (!groupRef.current || !visible) return;
    const delta = Math.min(rawDelta, 0.05);

    if (!interacting.current) {
      automaticYaw.current += delta * (reducedMotion ? 0.13 : 0.34);
    }

    renderedRotation.current.x = MathUtils.damp(
      renderedRotation.current.x,
      rotation.current.x,
      interacting.current ? 19 : 6,
      delta,
    );
    renderedRotation.current.y = MathUtils.damp(
      renderedRotation.current.y,
      rotation.current.y + automaticYaw.current,
      interacting.current ? 19 : 6,
      delta,
    );
    groupRef.current.rotation.set(
      renderedRotation.current.x,
      renderedRotation.current.y,
      0,
    );
  });

  return (
    <group ref={groupRef}>
      <group scale={2.46}>
        <primitive object={scene} position={[0, -0.593, 0]} />
      </group>
    </group>
  );
}

export default function BasketballScene(props: BasketballSceneProps) {
  return (
    <Canvas
      aria-hidden="true"
      camera={{ fov: 34, near: 0.1, far: 40, position: [0, 0.08, 5.05] }}
      dpr={[1, 1.5]}
      frameloop={props.visible ? "always" : "demand"}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = SRGBColorSpace;
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = PCFSoftShadowMap;
      }}
      shadows
    >
      <ambientLight intensity={0.68} color="#7da9d8" />
      <hemisphereLight args={["#99cfff", "#16080a", 1.05]} />
      <directionalLight
        castShadow
        color="#ffd0a0"
        intensity={3.2}
        position={[3.7, 4.2, 4.6]}
        shadow-bias={-0.00025}
        shadow-mapSize-height={1024}
        shadow-mapSize-width={1024}
      />
      <pointLight color="#45b8f1" intensity={7.5} position={[-4, 1.2, 2.4]} />
      <pointLight color="#f02a37" intensity={3.2} position={[3, -2.2, -1.8]} />

      <BasketballModel {...props} />

      <mesh position={[0, -1.66, -0.45]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.05, 64]} />
        <shadowMaterial transparent opacity={0.2} />
      </mesh>
    </Canvas>
  );
}
