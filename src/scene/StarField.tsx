import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';

const vertexShader = `
  attribute float highlight;
  attribute float magnitude;
  varying float vHighlight;
  varying float vMag;

  void main() {
    vHighlight = highlight;
    vMag = magnitude;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (vHighlight > 0.5 ? 8.0 : 2.5) * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying float vHighlight;
  varying float vMag;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    if (dot(c, c) > 0.25) discard;

    vec3 baseColor = vec3(0.7, 0.85, 1.0);
    if (vMag < 5.0) baseColor = mix(vec3(1.0, 0.95, 0.8), baseColor, vMag / 5.0);
    if (vHighlight > 0.5) baseColor = vec3(1.0, 0.85, 0.2);

    float alpha = vHighlight > 0.5 ? 1.0 : 0.75;
    gl_FragColor = vec4(baseColor, alpha);
  }
`;

export function StarField() {
  const dataset = useAppStore((s) => s.dataset);
  const highlightIndices = useAppStore((s) => s.highlightIndices);
  const clickToQuery = useAppStore((s) => s.clickToQuery);
  const setQueryPoint = useAppStore((s) => s.setQueryPoint);
  const pointsRef = useRef<THREE.Points>(null);
  const highlightAttrRef = useRef<THREE.BufferAttribute | null>(null);

  const highlightSet = useMemo(() => new Set(highlightIndices), [highlightIndices]);

  const { geometry, material } = useMemo(() => {
    if (!dataset) return { geometry: null, material: null };

    const count = dataset.count;
    const highlights = new Float32Array(count);
    const magnitudes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      highlights[i] = highlightSet.has(i) ? 1 : 0;
      magnitudes[i] = dataset.stars[i]?.mag ?? 8;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(dataset.positions.slice(), 3));
    const highlightAttr = new THREE.BufferAttribute(highlights, 1);
    geo.setAttribute('highlight', highlightAttr);
    geo.setAttribute('magnitude', new THREE.BufferAttribute(magnitudes, 1));
    highlightAttrRef.current = highlightAttr;

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, [dataset]);

  useEffect(() => {
    if (!dataset || !highlightAttrRef.current) return;
    const attr = highlightAttrRef.current;
    for (let i = 0; i < dataset.count; i++) {
      attr.setX(i, highlightSet.has(i) ? 1 : 0);
    }
    attr.needsUpdate = true;
  }, [dataset, highlightSet]);

  const handleClick = (event: THREE.Event & { index?: number; stopPropagation: () => void }) => {
    if (!clickToQuery || !dataset) return;
    event.stopPropagation();
    const idx = event.index;
    if (idx !== undefined && idx >= 0) {
      setQueryPoint([
        dataset.positions[idx * 3],
        dataset.positions[idx * 3 + 1],
        dataset.positions[idx * 3 + 2],
      ]);
    }
  };

  if (!geometry || !material) return null;

  return <points ref={pointsRef} geometry={geometry} material={material} onClick={handleClick} />;
}
