import { createAlgorithm } from '../algorithms';
import type { AlgorithmResult } from '../store/useAppStore';
import type { Vec3 } from '../algorithms/types';

interface WorkerQueryMessage {
  type: 'query';
  positions: Float32Array;
  count: number;
  queryPoint: Vec3;
  k: number;
  algorithmIds: string[];
}

self.onmessage = (e: MessageEvent<WorkerQueryMessage>) => {
  const { positions, count, queryPoint, k, algorithmIds } = e.data;

  try {
    const results: AlgorithmResult[] = [];

    for (const id of algorithmIds) {
      const alg = createAlgorithm(id);
      if (!alg) continue;

      const buildStart = performance.now();
      alg.build(positions, count);
      const buildMs = performance.now() - buildStart;
      const { resultIndices, metrics } = alg.query(queryPoint, k);
      if (!metrics.buildMs) metrics.buildMs = buildMs;

      results.push({
        algorithmId: id,
        label: alg.label,
        resultIndices,
        metrics,
      });
    }

    self.postMessage({ results });
  } catch (err) {
    self.postMessage({ error: String(err) });
  }
};

export {};
