import { Line, OrbitControls, Stars, TransformControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';
import { Highlights } from './Highlights';
import { StarField } from './StarField';
import { StepOverlay } from './StepOverlay';

function QueryPointGizmo() {
  const queryPoint = useAppStore((s) => s.queryPoint);
  const setQueryPoint = useAppStore((s) => s.setQueryPoint);
  const groupRef = useRef<THREE.Group>(null);
  const controls = useThree((state) => state.controls);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(queryPoint[0], queryPoint[1], queryPoint[2]);
    }
  }, [queryPoint]);

  return (
    <>
      <TransformControls
        object={groupRef as MutableRefObject<THREE.Object3D>}
        mode="translate"
        size={0.7}
        onMouseDown={() => {
          if (controls) controls.enabled = false;
        }}
        onMouseUp={() => {
          if (controls) controls.enabled = true;
        }}
        onObjectChange={() => {
          if (groupRef.current) {
            const p = groupRef.current.position;
            setQueryPoint([p.x, p.y, p.z]);
          }
        }}
      />
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[6, 16, 16]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.5} />
        </mesh>
        <mesh>
          <sphereGeometry args={[2, 8, 8]} />
          <meshBasicMaterial color="#fca5a5" />
        </mesh>
      </group>
    </>
  );
}

function ConsiderLine() {
  const currentStep = useAppStore((s) => s.currentStep);
  const queryPoint = useAppStore((s) => s.queryPoint);
  const dataset = useAppStore((s) => s.dataset);

  if (!currentStep || currentStep.kind !== 'considerPoint' || !dataset) return null;

  const starPos: [number, number, number] = [
    dataset.positions[currentStep.index * 3],
    dataset.positions[currentStep.index * 3 + 1],
    dataset.positions[currentStep.index * 3 + 2],
  ];

  return (
    <Line
      points={[queryPoint, starPos]}
      color="#fbbf24"
      lineWidth={1}
      transparent
      opacity={0.6}
    />
  );
}

function SceneContent() {
  return (
    <>
      <color attach="background" args={['#050810']} />
      <ambientLight intensity={0.3} />
      <pointLight position={[100, 100, 100]} intensity={0.5} />

      <Stars radius={2000} depth={100} count={3000} factor={2} saturation={0} fade speed={0.5} />

      <gridHelper args={[4000, 40, '#1e293b', '#0f172a']} />
      <axesHelper args={[500]} />

      <StarField />
      <QueryPointGizmo />
      <Highlights />
      <ConsiderLine />
      <StepOverlay />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={5000}
      />
    </>
  );
}

export function Scene3D() {
  return (
    <Canvas
      camera={{ position: [400, 300, 400], fov: 60, near: 0.1, far: 100000 }}
      gl={{ antialias: true, alpha: false }}
    >
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
    </Canvas>
  );
}
