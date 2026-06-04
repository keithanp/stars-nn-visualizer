import type { Metrics, NNAlgorithm, QueryResult, Step, Vec3 } from './types';
import { computeRecall, distSq, emptyMetrics, kNearestHeap, MaxHeap } from './utils';

function cellKey(
  x: number,
  y: number,
  z: number,
  gridMin: Vec3,
  cellSize: number,
): string {
  const ix = Math.floor((x - gridMin[0]) / cellSize);
  const iy = Math.floor((y - gridMin[1]) / cellSize);
  const iz = Math.floor((z - gridMin[2]) / cellSize);
  return `${ix},${iy},${iz}`;
}

function cellCoords(q: Vec3, gridMin: Vec3, cellSize: number): [number, number, number] {
  return [
    Math.floor((q[0] - gridMin[0]) / cellSize),
    Math.floor((q[1] - gridMin[1]) / cellSize),
    Math.floor((q[2] - gridMin[2]) / cellSize),
  ];
}

function cellBBox(
  cx: number,
  cy: number,
  cz: number,
  gridMin: Vec3,
  cellSize: number,
): [Vec3, Vec3] {
  const min: Vec3 = [
    gridMin[0] + cx * cellSize,
    gridMin[1] + cy * cellSize,
    gridMin[2] + cz * cellSize,
  ];
  return [min, [min[0] + cellSize, min[1] + cellSize, min[2] + cellSize]];
}

export function createApproxGrid(): NNAlgorithm {
  let points: Float32Array | null = null;
  let count = 0;
  let grid: Map<string, number[]> | null = null;
  let gridMin: Vec3 = [0, 0, 0];
  let cellSize = 100;
  let buildMs = 0;

  return {
    id: 'approx-grid',
    label: 'Approximate Grid',
    description: 'Coarse grid buckets — fast but may miss exact nearest neighbors.',
    category: 'spatial',
    supportsSteps: true,

    build(pos: Float32Array, n: number) {
      const t0 = performance.now();
      points = pos;
      count = n;

      const min: Vec3 = [Infinity, Infinity, Infinity];
      const max: Vec3 = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < n; i++) {
        for (let a = 0; a < 3; a++) {
          const v = pos[i * 3 + a];
          if (v < min[a]) min[a] = v;
          if (v > max[a]) max[a] = v;
        }
      }

      const span = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
      cellSize = Math.max(span / Math.cbrt(n / 2), 5);
      gridMin = min;
      grid = new Map();

      for (let i = 0; i < n; i++) {
        const key = cellKey(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], gridMin, cellSize);
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key)!.push(i);
      }

      buildMs = performance.now() - t0;
    },

    query(q: Vec3, k: number): QueryResult {
      const metrics = emptyMetrics();
      metrics.buildMs = buildMs;
      metrics.approximate = true;
      const heap = new MaxHeap();
      const t0 = performance.now();

      const [cx, cy, cz] = cellCoords(q, gridMin, cellSize);
      const searchRadius = 2;

      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
          for (let dz = -searchRadius; dz <= searchRadius; dz++) {
            const key = `${cx + dx},${cy + dy},${cz + dz}`;
            metrics.nodesVisited++;

            const indices = grid!.get(key);
            if (!indices) {
              metrics.nodesPruned++;
              continue;
            }

            for (const idx of indices) {
              const d = distSq(points!, idx, q);
              metrics.distChecks++;
              if (heap.size < k) heap.push(idx, d);
              else if (d < heap.peekDist()) heap.replace(idx, d);
            }
          }
        }
      }

      metrics.queryMs = performance.now() - t0;

      const exact = kNearestHeap(points!, count, q, k).heap.toSortedArray().map((x) => x.index);
      const result = heap.toSortedArray().map((x) => x.index);
      metrics.recall = computeRecall(result, exact);

      return { resultIndices: result, metrics };
    },

    *querySteps(q: Vec3, k: number): Generator<Step, Metrics> {
      const metrics = emptyMetrics();
      metrics.buildMs = buildMs;
      metrics.approximate = true;
      const heap = new MaxHeap();
      const [cx, cy, cz] = cellCoords(q, gridMin, cellSize);
      const searchRadius = 2;

      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
          for (let dz = -searchRadius; dz <= searchRadius; dz++) {
            const bbox = cellBBox(cx + dx, cy + dy, cz + dz, gridMin, cellSize);
            yield { kind: 'visitNode', bbox, depth: Math.abs(dx) + Math.abs(dy) + Math.abs(dz) };

            const key = `${cx + dx},${cy + dy},${cz + dz}`;
            const indices = grid!.get(key);
            if (!indices) {
              metrics.nodesPruned++;
              yield { kind: 'pruneNode', bbox, reason: 'empty cell (approx)' };
              continue;
            }

            metrics.nodesVisited++;
            for (const idx of indices) {
              const d = distSq(points!, idx, q);
              metrics.distChecks++;
              yield { kind: 'considerPoint', index: idx, dist: Math.sqrt(d) };
              let changed = false;
              if (heap.size < k) {
                heap.push(idx, d);
                changed = true;
              } else if (d < heap.peekDist()) {
                heap.replace(idx, d);
                changed = true;
              }
              if (changed) {
                yield {
                  kind: 'updateBest',
                  bestIndices: heap.toSortedArray().map((s) => s.index),
                  worstDist: Math.sqrt(heap.peekDist()),
                };
              }
            }
          }
        }
      }

      const exact = kNearestHeap(points!, count, q, k).heap.toSortedArray().map((x) => x.index);
      metrics.recall = computeRecall(heap.toSortedArray().map((x) => x.index), exact);

      return metrics;
    },
  };
}
