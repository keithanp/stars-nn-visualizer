import type { Metrics, NNAlgorithm, QueryResult, Step, Vec3 } from './types';
import { emptyMetrics, MaxHeap, kNearestHeap } from './utils';

export function createBruteForce(): NNAlgorithm {
  let points: Float32Array | null = null;
  let count = 0;

  return {
    id: 'brute-force',
    label: 'Brute Force (Max-Heap)',
    description: 'Scan all stars, maintain a max-heap of size K; replace the root when a closer star appears.',
    category: 'selection',
    supportsSteps: true,

    build(pos: Float32Array, n: number) {
      points = pos;
      count = n;
    },

    query(q: Vec3, k: number): QueryResult {
      const metrics = emptyMetrics();
      const t0 = performance.now();
      const { heap, distChecks, comparisons } = kNearestHeap(points!, count, q, k);
      metrics.queryMs = performance.now() - t0;
      metrics.distChecks = distChecks;
      metrics.comparisons = comparisons;
      metrics.swaps = heap.swaps;
      metrics.nodesVisited = count;
      return {
        resultIndices: heap.toSortedArray().map((x) => x.index),
        metrics,
      };
    },

    *querySteps(q: Vec3, k: number): Generator<Step, Metrics> {
      const metrics = emptyMetrics();
      metrics.comparisons = 0;
      const heap = new MaxHeap();

      for (let i = 0; i < count; i++) {
        const x = points![i * 3] - q[0];
        const y = points![i * 3 + 1] - q[1];
        const z = points![i * 3 + 2] - q[2];
        const d = x * x + y * y + z * z;
        metrics.distChecks++;

        yield { kind: 'considerPoint', index: i, dist: Math.sqrt(d) };

        let changed = false;
        if (heap.size < k) {
          heap.push(i, d);
          changed = true;
        } else {
          metrics.comparisons!++;
          if (d < heap.peekDist()) {
            const evicted = heap.peekIndex();
            const evictedDist = heap.peekDist();
            heap.replace(i, d);
            yield { kind: 'evictPoint', index: evicted, dist: Math.sqrt(evictedDist) };
            changed = true;
          }
        }

        if (changed) {
          yield {
            kind: 'updateBest',
            bestIndices: heap.toSortedArray().map((s) => s.index),
            worstDist: Math.sqrt(heap.peekDist()),
          };
        }
      }

      metrics.comparisons! += heap.comparisons;
      metrics.swaps = heap.swaps;
      metrics.nodesVisited = count;
      return metrics;
    },
  };
}
