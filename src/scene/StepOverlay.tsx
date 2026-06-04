import { useMemo } from 'react';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';

export function StepOverlay() {
  const currentStep = useAppStore((s) => s.currentStep);

  const splitPlane = useMemo(() => {
    if (!currentStep || currentStep.kind !== 'splitPlane') return null;
    const { axis, value, bbox } = currentStep;
    const [min, max] = bbox;
    const size = [
      max[0] - min[0],
      max[1] - min[1],
      max[2] - min[2],
    ] as [number, number, number];

    const center: [number, number, number] = [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    ];
    center[axis] = value;

    const planeSize: [number, number] = [
      axis === 0 ? size[1] : size[0],
      axis === 2 ? size[1] : size[2],
    ];

    return { center, axis, planeSize };
  }, [currentStep]);

  if (!splitPlane) return null;

  const rotation: [number, number, number] =
    splitPlane.axis === 0
      ? [0, Math.PI / 2, 0]
      : splitPlane.axis === 1
        ? [Math.PI / 2, 0, 0]
        : [0, 0, 0];

  return (
    <mesh position={splitPlane.center} rotation={rotation}>
      <planeGeometry args={splitPlane.planeSize} />
      <meshBasicMaterial color="#8b5cf6" transparent opacity={0.2} side={THREE.DoubleSide} />
    </mesh>
  );
}
