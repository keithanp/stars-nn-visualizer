import { useMemo } from 'react';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';

function BBoxWireframe({
  min,
  max,
  color,
  opacity = 0.5,
}: {
  min: [number, number, number];
  max: [number, number, number];
  color: string;
  opacity?: number;
}) {
  const geometry = useMemo(() => {
    const box = new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [min, max]);

  const center: [number, number, number] = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];

  return (
    <lineSegments geometry={geometry} position={center}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
}

export function Highlights() {
  const worstDist = useAppStore((s) => s.worstDist);
  const queryPoint = useAppStore((s) => s.queryPoint);
  const currentStep = useAppStore((s) => s.currentStep);
  const dataset = useAppStore((s) => s.dataset);

  const visitedBboxes = useMemo(() => {
    if (!currentStep) return [];
    if (currentStep.kind === 'visitNode') {
      return [{ bbox: currentStep.bbox, pruned: false }];
    }
    if (currentStep.kind === 'pruneNode') {
      return [{ bbox: currentStep.bbox, pruned: true }];
    }
    return [];
  }, [currentStep]);

  const evictedPos = useMemo<[number, number, number] | null>(() => {
    if (!currentStep || currentStep.kind !== 'evictPoint' || !dataset) return null;
    const i = currentStep.index;
    return [dataset.positions[i * 3], dataset.positions[i * 3 + 1], dataset.positions[i * 3 + 2]];
  }, [currentStep, dataset]);

  return (
    <group>
      {worstDist > 0 && (
        <mesh position={queryPoint}>
          <sphereGeometry args={[worstDist, 32, 32]} />
          <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.15} />
        </mesh>
      )}

      {visitedBboxes.map((item, i) => (
        <BBoxWireframe
          key={i}
          min={item.bbox[0]}
          max={item.bbox[1]}
          color={item.pruned ? '#ef4444' : '#22c55e'}
          opacity={item.pruned ? 0.3 : 0.6}
        />
      ))}

      {evictedPos && (
        <mesh position={evictedPos}>
          <sphereGeometry args={[7, 16, 16]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}
