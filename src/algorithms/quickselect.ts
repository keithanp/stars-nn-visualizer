import type { Metrics, NNAlgorithm, QueryResult, Step, Vec3 } from './types';
import { distSq, emptyMetrics } from './utils';

interface Entry {
  index: number;
  dist: number;
}

/**
 * Partition entries[left..right] around a pivot (Lomuto scheme) and return the
 * final pivot position. Mutates `entries` in place.
 */
function partition(entries: Entry[], left: number, right: number, stats: { comparisons: number; swaps: number }): number {
  const pivot = entries[right].dist;
  let i = left;
  for (let j = left; j < right; j++) {
    stats.comparisons++;
    if (entries[j].dist < pivot) {
      [entries[i], entries[j]] = [entries[j], entries[i]];
      stats.swaps++;
      i++;
    }
  }
  [entries[i], entries[right]] = [entries[right], entries[i]];
  stats.swaps++;
  return i;
}

/** Reorders entries so the K smallest occupy indices [0, k). O(n) average. */
function quickselectInPlace(entries: Entry[], k: number, stats: { comparisons: number; swaps: number }): void {
  let left = 0;
  let right = entries.length - 1;
  const target = k - 1;

  while (left < right) {
    const pivotIndex = partition(entries, left, right, stats);
    if (pivotIndex === target) break;
    else if (pivotIndex < target) left = pivotIndex + 1;
    else right = pivotIndex - 1;
  }
}

export function createQuickselect(): NNAlgorithm {
  let points: Float32Array | null = null;
  let count = 0;

  return {
    id: 'quickselect',
    label: 'Quickselect (nth_element)',
    description: 'Partition all N distances around the K-th smallest in O(N) average, then sort just the K survivors.',
    category: 'selection',
    supportsSteps: true,

    build(pos: Float32Array, n: number) {
      points = pos;
      count = n;
    },

    query(q: Vec3, k: number): QueryResult {
      const metrics = emptyMetrics();
      const t0 = performance.now();

      const entries: Entry[] = new Array(count);
      for (let i = 0; i < count; i++) {
        entries[i] = { index: i, dist: distSq(points!, i, q) };
        metrics.distChecks++;
      }

      const stats = { comparisons: 0, swaps: 0 };
      const kk = Math.min(k, count);
      quickselectInPlace(entries, kk, stats);

      const top = entries.slice(0, kk);
      top.sort((a, b) => {
        stats.comparisons++;
        return a.dist - b.dist;
      });

      metrics.comparisons = stats.comparisons;
      metrics.swaps = stats.swaps;
      metrics.nodesVisited = count;
      metrics.queryMs = performance.now() - t0;

      return { resultIndices: top.map((e) => e.index), metrics };
    },

    *querySteps(q: Vec3, k: number): Generator<Step, Metrics> {
      const metrics = emptyMetrics();
      const entries: Entry[] = new Array(count);
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

      const stats = { comparisons: 0, swaps: 0 };
      const kk = Math.min(k, count);
      quickselectInPlace(entries, kk, stats);

      const top = entries.slice(0, kk);
      top.sort((a, b) => {
        stats.comparisons++;
        return a.dist - b.dist;
      });

      metrics.comparisons = stats.comparisons;
      metrics.swaps = stats.swaps;
      metrics.nodesVisited = count;

      yield {
        kind: 'updateBest',
        bestIndices: top.map((e) => e.index),
        worstDist: top.length ? Math.sqrt(top[top.length - 1].dist) : 0,
      };

      return metrics;
    },
  };
}
