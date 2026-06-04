import type { Metrics, NNAlgorithm, QueryResult, Step, Vec3 } from './types';
import { distPointToBBoxSq, distSq, emptyMetrics, MaxHeap } from './utils';

interface OctreeNode {
  min: Vec3;
  max: Vec3;
  points: number[];
  children: OctreeNode[] | null;
  depth: number;
}

const MAX_POINTS = 16;
const MAX_DEPTH = 12;

function centerOf(min: Vec3, max: Vec3): Vec3 {
  return [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
}

function subdivide(node: OctreeNode, positions: Float32Array): void {
  const mid = centerOf(node.min, node.max);
  const children: OctreeNode[] = [];

  for (let oct = 0; oct < 8; oct++) {
    const cmin: Vec3 = [...node.min];
    const cmax: Vec3 = [...node.max];
    if (oct & 1) cmin[0] = mid[0]; else cmax[0] = mid[0];
    if (oct & 2) cmin[1] = mid[1]; else cmax[1] = mid[1];
    if (oct & 4) cmin[2] = mid[2]; else cmax[2] = mid[2];
    children.push({
      min: cmin,
      max: cmax,
      points: [],
      children: null,
      depth: node.depth + 1,
    });
  }

  for (const idx of node.points) {
    const x = positions[idx * 3];
    const y = positions[idx * 3 + 1];
    const z = positions[idx * 3 + 2];
    let oct = 0;
    if (x >= mid[0]) oct |= 1;
    if (y >= mid[1]) oct |= 2;
    if (z >= mid[2]) oct |= 4;
    children[oct].points.push(idx);
  }

  node.points = [];
  node.children = children;

  for (const child of children) {
    if (child.points.length > MAX_POINTS && child.depth < MAX_DEPTH) {
      subdivide(child, positions);
    }
  }
}

function buildOctree(points: Float32Array, count: number): OctreeNode {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < count; i++) {
    for (let a = 0; a < 3; a++) {
      const v = points[i * 3 + a];
      if (v < min[a]) min[a] = v;
      if (v > max[a]) max[a] = v;
    }
  }

  const root: OctreeNode = {
    min,
    max,
    points: Array.from({ length: count }, (_, i) => i),
    children: null,
    depth: 0,
  };

  if (count > MAX_POINTS) subdivide(root, points);
  return root;
}

function searchOctree(
  node: OctreeNode,
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
      reason: 'cell beyond worst distance',
    });
    return;
  }

  if (!node.children) {
    for (const idx of node.points) {
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

  const childOrder = node.children
    .map((c, i) => ({ i, dist: distPointToBBoxSq(q, c.min, c.max) }))
    .sort((a, b) => a.dist - b.dist);

  for (const { i } of childOrder) {
    searchOctree(node.children![i], positions, q, k, heap, metrics, steps);
  }
}

export function createOctree(): NNAlgorithm {
  let root: OctreeNode | null = null;
  let points: Float32Array | null = null;
  let buildMs = 0;

  return {
    id: 'octree',
    label: 'Octree',
    description: 'Hierarchical 3D spatial subdivision with cell pruning.',
    category: 'spatial',
    supportsSteps: true,

    build(pos: Float32Array, count: number) {
      const t0 = performance.now();
      points = pos;
      root = buildOctree(pos, count);
      buildMs = performance.now() - t0;
    },

    query(q: Vec3, k: number): QueryResult {
      const metrics = emptyMetrics();
      metrics.buildMs = buildMs;
      const heap = new MaxHeap();
      const t0 = performance.now();
      searchOctree(root!, points!, q, k, heap, metrics);
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
      searchOctree(root!, points!, q, k, heap, metrics, steps);
      for (const step of steps) yield step;
      return metrics;
    },
  };
}
