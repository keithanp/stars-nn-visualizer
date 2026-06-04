import type { Metrics, NNAlgorithm, QueryResult, Step, Vec3 } from './types';
import { distPointToBBoxSq, distSq, emptyMetrics, MaxHeap } from './utils';

interface KDNode {
  index: number;
  axis: 0 | 1 | 2;
  left: KDNode | null;
  right: KDNode | null;
  min: Vec3;
  max: Vec3;
}

function buildKD(
  indices: number[],
  positions: Float32Array,
  depth: number,
  min: Vec3,
  max: Vec3,
): KDNode | null {
  if (indices.length === 0) return null;

  const axis = (depth % 3) as 0 | 1 | 2;
  indices.sort((a, b) => positions[a * 3 + axis] - positions[b * 3 + axis]);
  const mid = (indices.length / 2) | 0;
  const index = indices[mid];

  const leftMin: Vec3 = [...min];
  const leftMax: Vec3 = [...max];
  leftMax[axis] = positions[index * 3 + axis];

  const rightMin: Vec3 = [...min];
  const rightMax: Vec3 = [...max];
  rightMin[axis] = positions[index * 3 + axis];

  return {
    index,
    axis,
    min: [...min],
    max: [...max],
    left: buildKD(indices.slice(0, mid), positions, depth + 1, leftMin, leftMax),
    right: buildKD(indices.slice(mid + 1), positions, depth + 1, rightMin, rightMax),
  };
}

function searchKD(
  node: KDNode | null,
  positions: Float32Array,
  q: Vec3,
  k: number,
  heap: MaxHeap,
  metrics: Metrics,
  steps?: Step[],
): void {
  if (!node) return;

  metrics.nodesVisited++;

  const d = distSq(positions, node.index, q);
  metrics.distChecks++;
  steps?.push({ kind: 'considerPoint', index: node.index, dist: Math.sqrt(d) });

  let changed = false;
  if (heap.size < k) {
    heap.push(node.index, d);
    changed = true;
  } else if (d < heap.peekDist()) {
    heap.replace(node.index, d);
    changed = true;
  }

  if (changed) {
    steps?.push({
      kind: 'updateBest',
      bestIndices: heap.toSortedArray().map((s) => s.index),
      worstDist: Math.sqrt(heap.peekDist()),
    });
  }

  const axis = node.axis;
  const diff = q[axis] - positions[node.index * 3 + axis];
  const near = diff < 0 ? node.left : node.right;
  const far = diff < 0 ? node.right : node.left;

  steps?.push({
    kind: 'splitPlane',
    axis,
    value: positions[node.index * 3 + axis],
    bbox: [node.min, node.max],
  });

  searchKD(near, positions, q, k, heap, metrics, steps);

  const worstDist = heap.size >= k ? heap.peekDist() : Infinity;
  const farDist = far ? distPointToBBoxSq(q, far.min, far.max) : Infinity;

  if (far && farDist <= worstDist) {
    steps?.push({ kind: 'visitNode', bbox: [far.min, far.max], depth: 0 });
    searchKD(far, positions, q, k, heap, metrics, steps);
  } else if (far) {
    metrics.nodesPruned++;
    steps?.push({
      kind: 'pruneNode',
      bbox: [far.min, far.max],
      reason: 'bbox beyond worst distance',
    });
  }
}

export function createKDTree(): NNAlgorithm {
  let root: KDNode | null = null;
  let points: Float32Array | null = null;
  let buildMs = 0;

  return {
    id: 'kd-tree',
    label: 'K-D Tree',
    description: 'Balanced k-d tree with axis-aligned splits and branch pruning.',
    category: 'spatial',
    supportsSteps: true,

    build(pos: Float32Array, count: number) {
      const t0 = performance.now();
      points = pos;
      const indices = Array.from({ length: count }, (_, i) => i);
      const min: Vec3 = [Infinity, Infinity, Infinity];
      const max: Vec3 = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < count; i++) {
        for (let a = 0; a < 3; a++) {
          const v = pos[i * 3 + a];
          if (v < min[a]) min[a] = v;
          if (v > max[a]) max[a] = v;
        }
      }
      root = buildKD(indices, pos, 0, min, max);
      buildMs = performance.now() - t0;
    },

    query(q: Vec3, k: number): QueryResult {
      const metrics = emptyMetrics();
      metrics.buildMs = buildMs;
      const heap = new MaxHeap();
      const t0 = performance.now();
      searchKD(root, points!, q, k, heap, metrics);
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
      searchKD(root, points!, q, k, heap, metrics, steps);
      for (const step of steps) yield step;
      return metrics;
    },
  };
}
