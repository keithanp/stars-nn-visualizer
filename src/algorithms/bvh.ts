import type { Metrics, NNAlgorithm, QueryResult, Step, Vec3 } from './types';
import { distPointToBBoxSq, distSq, emptyMetrics, MaxHeap } from './utils';

interface BVHNode {
  min: Vec3;
  max: Vec3;
  left: BVHNode | null;
  right: BVHNode | null;
  indices: number[] | null;
  depth: number;
}

function computeBounds(indices: number[], positions: Float32Array): [Vec3, Vec3] {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const idx of indices) {
    for (let a = 0; a < 3; a++) {
      const v = positions[idx * 3 + a];
      if (v < min[a]) min[a] = v;
      if (v > max[a]) max[a] = v;
    }
  }
  return [min, max];
}

function buildBVH(indices: number[], positions: Float32Array, depth: number): BVHNode {
  const [min, max] = computeBounds(indices, positions);

  if (indices.length <= 8) {
    return { min, max, left: null, right: null, indices, depth };
  }

  let longestAxis = 0;
  let longestSpan = max[0] - min[0];
  for (let a = 1; a < 3; a++) {
    const span = max[a] - min[a];
    if (span > longestSpan) {
      longestSpan = span;
      longestAxis = a;
    }
  }

  indices.sort((a, b) => positions[a * 3 + longestAxis] - positions[b * 3 + longestAxis]);
  const mid = (indices.length / 2) | 0;

  return {
    min,
    max,
    left: buildBVH(indices.slice(0, mid), positions, depth + 1),
    right: buildBVH(indices.slice(mid), positions, depth + 1),
    indices: null,
    depth,
  };
}

function searchBVH(
  node: BVHNode,
  positions: Float32Array,
  q: Vec3,
  k: number,
  heap: MaxHeap,
  metrics: Metrics,
  steps?: Step[],
): void {
  metrics.nodesVisited++;
  steps?.push({ kind: 'visitNode', bbox: [node.min, node.max], depth: node.depth });

  const worstDist = heap.size >= k ? heap.peekDist() : Infinity;
  const nodeDist = distPointToBBoxSq(q, node.min, node.max);

  if (nodeDist > worstDist && heap.size >= k) {
    metrics.nodesPruned++;
    steps?.push({
      kind: 'pruneNode',
      bbox: [node.min, node.max],
      reason: 'AABB beyond worst distance',
    });
    return;
  }

  if (node.indices) {
    for (const idx of node.indices) {
      const d = distSq(positions, idx, q);
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
    return;
  }

  const children: BVHNode[] = [];
  if (node.left) children.push(node.left);
  if (node.right) children.push(node.right);

  children.sort((a, b) => distPointToBBoxSq(q, a.min, a.max) - distPointToBBoxSq(q, b.min, b.max));

  for (const child of children) {
    searchBVH(child, positions, q, k, heap, metrics, steps);
  }
}

export function createBVH(): NNAlgorithm {
  let root: BVHNode | null = null;
  let points: Float32Array | null = null;
  let buildMs = 0;

  return {
    id: 'bvh',
    label: 'BVH',
    description: 'Bounding volume hierarchy with axis-aligned bounding box pruning.',
    category: 'spatial',
    supportsSteps: true,

    build(pos: Float32Array, count: number) {
      const t0 = performance.now();
      points = pos;
      const indices = Array.from({ length: count }, (_, i) => i);
      root = buildBVH(indices, pos, 0);
      buildMs = performance.now() - t0;
    },

    query(q: Vec3, k: number): QueryResult {
      const metrics = emptyMetrics();
      metrics.buildMs = buildMs;
      const heap = new MaxHeap();
      const t0 = performance.now();
      searchBVH(root!, points!, q, k, heap, metrics);
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
      searchBVH(root!, points!, q, k, heap, metrics, steps);
      for (const step of steps) yield step;
      return metrics;
    },
  };
}
