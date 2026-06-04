import type { Vec3 } from './types';

export { emptyMetrics } from './types';

export function distSq(
  positions: Float32Array,
  index: number,
  q: Vec3,
): number {
  const x = positions[index * 3] - q[0];
  const y = positions[index * 3 + 1] - q[1];
  const z = positions[index * 3 + 2] - q[2];
  return x * x + y * y + z * z;
}

export function distSqRaw(x: number, y: number, z: number, q: Vec3): number {
  const dx = x - q[0];
  const dy = y - q[1];
  const dz = z - q[2];
  return dx * dx + dy * dy + dz * dz;
}

export function distPointToBBoxSq(q: Vec3, min: Vec3, max: Vec3): number {
  let dist = 0;
  for (let axis = 0; axis < 3; axis++) {
    if (q[axis] < min[axis]) {
      const d = min[axis] - q[axis];
      dist += d * d;
    } else if (q[axis] > max[axis]) {
      const d = q[axis] - max[axis];
      dist += d * d;
    }
  }
  return dist;
}

export function computeRecall(
  approximate: number[],
  exact: number[],
): number {
  if (exact.length === 0) return 1;
  const set = new Set(approximate);
  let hits = 0;
  for (const idx of exact) {
    if (set.has(idx)) hits++;
  }
  return hits / exact.length;
}

export class MaxHeap {
  private indices: number[] = [];
  private dists: number[] = [];

  comparisons = 0;
  swaps = 0;

  get size(): number {
    return this.indices.length;
  }

  peekDist(): number {
    return this.dists[0];
  }

  peekIndex(): number {
    return this.indices[0];
  }

  push(index: number, dist: number): void {
    this.indices.push(index);
    this.dists.push(dist);
    this.bubbleUp(this.indices.length - 1);
  }

  replace(index: number, dist: number): void {
    this.indices[0] = index;
    this.dists[0] = dist;
    this.bubbleDown(0);
  }

  toSortedArray(): { index: number; dist: number }[] {
    const result: { index: number; dist: number }[] = [];
    for (let i = 0; i < this.indices.length; i++) {
      result.push({ index: this.indices[i], dist: this.dists[i] });
    }
    result.sort((a, b) => a.dist - b.dist);
    return result;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      this.comparisons++;
      if (this.dists[parent] >= this.dists[i]) break;
      this.swap(parent, i);
      i = parent;
    }
  }

  private bubbleDown(i: number): void {
    const n = this.indices.length;
    while (true) {
      let largest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n) {
        this.comparisons++;
        if (this.dists[left] > this.dists[largest]) largest = left;
      }
      if (right < n) {
        this.comparisons++;
        if (this.dists[right] > this.dists[largest]) largest = right;
      }
      if (largest === i) break;
      this.swap(i, largest);
      i = largest;
    }
  }

  private swap(a: number, b: number): void {
    this.swaps++;
    [this.indices[a], this.indices[b]] = [this.indices[b], this.indices[a]];
    [this.dists[a], this.dists[b]] = [this.dists[b], this.dists[a]];
  }
}

export function kNearestHeap(
  positions: Float32Array,
  count: number,
  q: Vec3,
  k: number,
  onCheck?: (index: number, dist: number) => void,
): { heap: MaxHeap; distChecks: number; comparisons: number } {
  const heap = new MaxHeap();
  let distChecks = 0;
  let comparisons = 0;

  for (let i = 0; i < count; i++) {
    const d = distSq(positions, i, q);
    distChecks++;
    onCheck?.(i, d);

    if (heap.size < k) {
      heap.push(i, d);
    } else {
      comparisons++;
      if (d < heap.peekDist()) {
        heap.replace(i, d);
      }
    }
  }

  return { heap, distChecks, comparisons: comparisons + heap.comparisons };
}
