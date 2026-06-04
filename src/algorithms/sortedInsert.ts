import type { Metrics, NNAlgorithm, QueryResult, Step, Vec3 } from './types';
import { distSq, emptyMetrics } from './utils';

/**
 * Maintains a sorted (ascending by distance) working set of at most K stars.
 * Each candidate is placed via binary search; farther entries shift right and
 * the worst element falls off the end once the set is full.
 */
function runSortedInsert(
  points: Float32Array,
  count: number,
  q: Vec3,
  k: number,
  metrics: Metrics,
  onConsider?: (index: number, dist: number) => void,
  onEvict?: (index: number, dist: number) => void,
): { index: number; dist: number }[] {
  const idx: number[] = [];
  const dist: number[] = [];
  metrics.comparisons = 0;
  metrics.swaps = 0;

  for (let i = 0; i < count; i++) {
    const d = distSq(points, i, q);
    metrics.distChecks++;
    onConsider?.(i, d);

    const full = idx.length >= k;
    if (full) {
      metrics.comparisons!++;
      if (d >= dist[dist.length - 1]) continue;
    }

    let lo = 0;
    let hi = idx.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      metrics.comparisons!++;
      if (dist[mid] < d) lo = mid + 1;
      else hi = mid;
    }

    if (full) {
      const evictedIndex = idx[idx.length - 1];
      const evictedDist = dist[dist.length - 1];
      for (let j = idx.length - 1; j > lo; j--) {
        idx[j] = idx[j - 1];
        dist[j] = dist[j - 1];
        metrics.swaps!++;
      }
      idx[lo] = i;
      dist[lo] = d;
      onEvict?.(evictedIndex, evictedDist);
    } else {
      idx.splice(lo, 0, i);
      dist.splice(lo, 0, d);
      metrics.swaps! += idx.length - 1 - lo;
    }
  }

  metrics.nodesVisited = count;
  return idx.map((index, i) => ({ index, dist: dist[i] }));
}

export function createSortedInsert(): NNAlgorithm {
  let points: Float32Array | null = null;
  let count = 0;

  return {
    id: 'sorted-insert',
    label: 'Sorted-Insert Array',
    description: 'Keep a sorted array of K; binary-search each candidate into place and drop the farthest. Cache-friendly for small K.',
    category: 'selection',
    supportsSteps: true,

    build(pos: Float32Array, n: number) {
      points = pos;
      count = n;
    },

    query(q: Vec3, k: number): QueryResult {
      const metrics = emptyMetrics();
      const t0 = performance.now();
      const result = runSortedInsert(points!, count, q, k, metrics);
      metrics.queryMs = performance.now() - t0;
      return { resultIndices: result.map((e) => e.index), metrics };
    },

    *querySteps(q: Vec3, k: number): Generator<Step, Metrics> {
      const metrics = emptyMetrics();
      const steps: Step[] = [];
      const idx: number[] = [];
      const dist: number[] = [];
      metrics.comparisons = 0;
      metrics.swaps = 0;

      for (let i = 0; i < count; i++) {
        const d = distSq(points!, i, q);
        metrics.distChecks++;
        steps.push({ kind: 'considerPoint', index: i, dist: Math.sqrt(d) });

        const full = idx.length >= k;
        let skip = false;
        if (full) {
          metrics.comparisons!++;
          if (d >= dist[dist.length - 1]) skip = true;
        }

        let changed = false;
        if (!skip) {
          let lo = 0;
          let hi = idx.length;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            metrics.comparisons!++;
            if (dist[mid] < d) lo = mid + 1;
            else hi = mid;
          }

          if (full) {
            const evictedIndex = idx[idx.length - 1];
            const evictedDist = dist[dist.length - 1];
            for (let j = idx.length - 1; j > lo; j--) {
              idx[j] = idx[j - 1];
              dist[j] = dist[j - 1];
              metrics.swaps!++;
            }
            idx[lo] = i;
            dist[lo] = d;
            steps.push({ kind: 'evictPoint', index: evictedIndex, dist: Math.sqrt(evictedDist) });
          } else {
            idx.splice(lo, 0, i);
            dist.splice(lo, 0, d);
            metrics.swaps! += idx.length - 1 - lo;
          }
          changed = true;
        }

        if (changed) {
          steps.push({
            kind: 'updateBest',
            bestIndices: idx.slice(),
            worstDist: Math.sqrt(dist[dist.length - 1]),
          });
        }
      }

      metrics.nodesVisited = count;
      for (const step of steps) yield step;
      return metrics;
    },
  };
}
