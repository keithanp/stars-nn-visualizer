import type { Metrics, NNAlgorithm, QueryResult, Step, Vec3 } from './types';
import { distSq, emptyMetrics, MaxHeap } from './utils';

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

function minDistToCell(
  q: Vec3,
  cx: number,
  cy: number,
  cz: number,
  gridMin: Vec3,
  cellSize: number,
): number {
  let dist = 0;
  const coords = [cx, cy, cz];
  for (let a = 0; a < 3; a++) {
    const cellMin = gridMin[a] + coords[a] * cellSize;
    const cellMax = cellMin + cellSize;
    if (q[a] < cellMin) {
      const d = cellMin - q[a];
      dist += d * d;
    } else if (q[a] > cellMax) {
      const d = q[a] - cellMax;
      dist += d * d;
    }
  }
  return dist;
}

function searchGrid(
  points: Float32Array,
  grid: Map<string, number[]>,
  gridMin: Vec3,
  cellSize: number,
  q: Vec3,
  k: number,
  heap: MaxHeap,
  metrics: Metrics,
  steps?: Step[],
): void {
  const [cx, cy, cz] = cellCoords(q, gridMin, cellSize);
  const visited = new Set<string>();
  let radius = 0;
  const maxRadius = 100;

  while (heap.size < k && radius <= maxRadius) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (
            radius > 0 &&
            Math.abs(dx) !== radius &&
            Math.abs(dy) !== radius &&
            Math.abs(dz) !== radius
          ) {
            continue;
          }
          const key = `${cx + dx},${cy + dy},${cz + dz}`;
          if (visited.has(key)) continue;
          visited.add(key);
          metrics.nodesVisited++;

          const bbox = cellBBox(cx + dx, cy + dy, cz + dz, gridMin, cellSize);
          steps?.push({ kind: 'visitNode', bbox, depth: radius });

          const indices = grid.get(key);
          if (!indices) {
            metrics.nodesPruned++;
            steps?.push({ kind: 'pruneNode', bbox, reason: 'empty cell' });
            continue;
          }

          for (const idx of indices) {
            const d = distSq(points, idx, q);
            metrics.distChecks++;
            steps?.push({ kind: 'considerPoint', index: idx, dist: Math.sqrt(d) });
            let changed = false;
            if (heap.size < k) {
              heap.push(idx, d);
              changed = true;
            } else if (d < heap.peekDist()) {
              heap.replace(idx, d);
              changed = true;
            }
            if (changed && steps) {
              steps.push({
                kind: 'updateBest',
                bestIndices: heap.toSortedArray().map((s) => s.index),
                worstDist: Math.sqrt(heap.peekDist()),
              });
            }
          }
        }
      }
    }
    radius++;
  }

  while (radius <= maxRadius) {
    let foundNew = false;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius && Math.abs(dz) !== radius) {
            continue;
          }
          const key = `${cx + dx},${cy + dy},${cz + dz}`;
          if (visited.has(key)) continue;
          visited.add(key);
          metrics.nodesVisited++;

          const bbox = cellBBox(cx + dx, cy + dy, cz + dz, gridMin, cellSize);
          const cellMinDist = minDistToCell(q, cx + dx, cy + dy, cz + dz, gridMin, cellSize);
          const worstDist = heap.peekDist();

          if (cellMinDist > worstDist) {
            metrics.nodesPruned++;
            steps?.push({ kind: 'pruneNode', bbox, reason: 'cell beyond worst distance' });
            continue;
          }

          steps?.push({ kind: 'visitNode', bbox, depth: radius });
          const indices = grid.get(key);
          if (indices) {
            for (const idx of indices) {
              const d = distSq(points, idx, q);
              metrics.distChecks++;
              steps?.push({ kind: 'considerPoint', index: idx, dist: Math.sqrt(d) });
              if (d < heap.peekDist()) {
                heap.replace(idx, d);
                foundNew = true;
                if (steps) {
                  steps.push({
                    kind: 'updateBest',
                    bestIndices: heap.toSortedArray().map((s) => s.index),
                    worstDist: Math.sqrt(heap.peekDist()),
                  });
                }
              }
            }
          }
        }
      }
    }
    if (!foundNew) break;
    radius++;
  }
}

export function createSpatialGrid(): NNAlgorithm {
  let points: Float32Array | null = null;
  let grid: Map<string, number[]> | null = null;
  let gridMin: Vec3 = [0, 0, 0];
  let cellSize = 50;
  let buildMs = 0;

  return {
    id: 'spatial-grid',
    label: 'Spatial Grid',
    description: 'Uniform grid with expanding shell search from query cell.',
    category: 'spatial',
    supportsSteps: true,

    build(pos: Float32Array, count: number) {
      const t0 = performance.now();
      points = pos;

      const min: Vec3 = [Infinity, Infinity, Infinity];
      const max: Vec3 = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < count; i++) {
        for (let a = 0; a < 3; a++) {
          const v = pos[i * 3 + a];
          if (v < min[a]) min[a] = v;
          if (v > max[a]) max[a] = v;
        }
      }

      const span = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
      cellSize = Math.max(span / Math.cbrt(count / 8), 1);
      gridMin = min;
      grid = new Map();

      for (let i = 0; i < count; i++) {
        const key = cellKey(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], gridMin, cellSize);
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key)!.push(i);
      }

      buildMs = performance.now() - t0;
    },

    query(q: Vec3, k: number): QueryResult {
      const metrics = emptyMetrics();
      metrics.buildMs = buildMs;
      const heap = new MaxHeap();
      const t0 = performance.now();
      searchGrid(points!, grid!, gridMin, cellSize, q, k, heap, metrics);
      metrics.queryMs = performance.now() - t0;
      return {
        resultIndices: heap.toSortedArray().map((x) => x.index),
        metrics,
      };
    },

    *querySteps(q: Vec3, k: number): Generator<Step, Metrics> {
      const metrics = emptyMetrics();
      metrics.buildMs = buildMs;
      const heap = new MaxHeap();
      const steps: Step[] = [];
      searchGrid(points!, grid!, gridMin, cellSize, q, k, heap, metrics, steps);
      for (const step of steps) yield step;
      return metrics;
    },
  };
}
