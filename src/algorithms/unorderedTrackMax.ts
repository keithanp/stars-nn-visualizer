import type { Metrics, NNAlgorithm, QueryResult, Step, Vec3 } from './types';
import { distSq, emptyMetrics } from './utils';

/**
 * Keeps an UNORDERED array of K stars plus the index of the current farthest
 * ("worst") slot. When a closer star appears it overwrites the worst slot, then
 * the whole array is rescanned to find the new worst. No heap involved — this is
 * the "replace stars as you go" idea in its most literal form.
 */
function findWorst(dist: number[], stats: { comparisons: number }): number {
  let worst = 0;
  for (let i = 1; i < dist.length; i++) {
    stats.comparisons++;
    if (dist[i] > dist[worst]) worst = i;
  }
  return worst;
}

export function createUnorderedTrackMax(): NNAlgorithm {
  let points: Float32Array | null = null;
  let count = 0;

  return {
    id: 'unordered-track-max',
    label: 'Unordered Array + Track-Max',
    description: 'Fill K slots, remember the farthest one; when a closer star appears, overwrite that slot and rescan for the new farthest. No heap.',
    category: 'selection',
    supportsSteps: true,

    build(pos: Float32Array, n: number) {
      points = pos;
      count = n;
    },

    query(q: Vec3, k: number): QueryResult {
      const metrics = emptyMetrics();
      metrics.comparisons = 0;
      metrics.swaps = 0;
      const t0 = performance.now();

      const idx: number[] = [];
      const dist: number[] = [];
      let worst = -1;
      const stats = { comparisons: 0 };

      for (let i = 0; i < count; i++) {
        const d = distSq(points!, i, q);
        metrics.distChecks++;

        if (idx.length < k) {
          idx.push(i);
          dist.push(d);
          if (idx.length === k) worst = findWorst(dist, stats);
        } else {
          metrics.comparisons!++;
          if (d < dist[worst]) {
            idx[worst] = i;
            dist[worst] = d;
            metrics.swaps!++;
            worst = findWorst(dist, stats);
          }
        }
      }

      metrics.comparisons! += stats.comparisons;
      metrics.nodesVisited = count;
      metrics.queryMs = performance.now() - t0;

      const result = idx
        .map((index, i) => ({ index, dist: dist[i] }))
        .sort((a, b) => a.dist - b.dist);

      return { resultIndices: result.map((e) => e.index), metrics };
    },

    *querySteps(q: Vec3, k: number): Generator<Step, Metrics> {
      const metrics = emptyMetrics();
      metrics.comparisons = 0;
      metrics.swaps = 0;
      const idx: number[] = [];
      const dist: number[] = [];
      let worst = -1;
      const stats = { comparisons: 0 };

      for (let i = 0; i < count; i++) {
        const d = distSq(points!, i, q);
        metrics.distChecks++;
        yield { kind: 'considerPoint', index: i, dist: Math.sqrt(d) };

        let changed = false;
        if (idx.length < k) {
          idx.push(i);
          dist.push(d);
          if (idx.length === k) worst = findWorst(dist, stats);
          changed = true;
        } else {
          metrics.comparisons!++;
          if (d < dist[worst]) {
            const evictedIndex = idx[worst];
            const evictedDist = dist[worst];
            idx[worst] = i;
            dist[worst] = d;
            metrics.swaps!++;
            worst = findWorst(dist, stats);
            yield { kind: 'evictPoint', index: evictedIndex, dist: Math.sqrt(evictedDist) };
            changed = true;
          }
        }

        if (changed) {
          // Before the set is full there is no tracked "worst" slot yet, so
          // derive the current farthest purely for the radius display.
          const worstDist = worst >= 0 ? dist[worst] : Math.max(...dist);
          yield {
            kind: 'updateBest',
            bestIndices: idx.slice(),
            worstDist: Math.sqrt(worstDist),
          };
        }
      }

      metrics.comparisons! += stats.comparisons;
      metrics.nodesVisited = count;
      return metrics;
    },
  };
}
