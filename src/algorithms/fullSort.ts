import type { Metrics, NNAlgorithm, QueryResult, Step, Vec3 } from './types';
import { distSq, emptyMetrics } from './utils';

export function createFullSort(): NNAlgorithm {
  let points: Float32Array | null = null;
  let count = 0;

  return {
    id: 'full-sort',
    label: 'Full Sort',
    description: 'Compute all N distances, sort everything, then take the first K. Simple but wasteful for K << N.',
    category: 'selection',
    supportsSteps: true,

    build(pos: Float32Array, n: number) {
      points = pos;
      count = n;
    },

    query(q: Vec3, k: number): QueryResult {
      const metrics = emptyMetrics();
      const t0 = performance.now();

      const entries = new Array<{ index: number; dist: number }>(count);
      for (let i = 0; i < count; i++) {
        entries[i] = { index: i, dist: distSq(points!, i, q) };
        metrics.distChecks++;
      }

      let comparisons = 0;
      entries.sort((a, b) => {
        comparisons++;
        return a.dist - b.dist;
      });

      metrics.comparisons = comparisons;
      metrics.nodesVisited = count;
      metrics.queryMs = performance.now() - t0;

      return {
        resultIndices: entries.slice(0, k).map((e) => e.index),
        metrics,
      };
    },

    *querySteps(q: Vec3, k: number): Generator<Step, Metrics> {
      const metrics = emptyMetrics();
      const entries = new Array<{ index: number; dist: number }>(count);
      const stepInterval = Math.max(1, Math.floor(count / 80));

      for (let i = 0; i < count; i++) {
        const d = distSq(points!, i, q);
        entries[i] = { index: i, dist: d };
        metrics.distChecks++;
        yield { kind: 'considerPoint', index: i, dist: Math.sqrt(d) };
        if (i % stepInterval === 0 || i === count - 1) {
          yield { kind: 'updateBest', bestIndices: [], worstDist: 0 };
        }
      }

      let comparisons = 0;
      entries.sort((a, b) => {
        comparisons++;
        return a.dist - b.dist;
      });

      const best = entries.slice(0, k);
      metrics.comparisons = comparisons;
      metrics.nodesVisited = count;

      yield {
        kind: 'updateBest',
        bestIndices: best.map((e) => e.index),
        worstDist: best.length ? Math.sqrt(best[best.length - 1].dist) : 0,
      };

      return metrics;
    },
  };
}
