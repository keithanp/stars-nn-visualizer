import type { Distribution, Star, StarDataset, Vec3 } from './types';

export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  gaussian(): number {
    const u1 = this.next();
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
  }
}

function computeBounds(positions: Float32Array, count: number): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    if (x < min[0]) min[0] = x;
    if (y < min[1]) min[1] = y;
    if (z < min[2]) min[2] = z;
    if (x > max[0]) max[0] = x;
    if (y > max[1]) max[1] = y;
    if (z > max[2]) max[2] = z;
  }
  return { min, max };
}

function buildDataset(positions: Float32Array, count: number, stars?: Star[]): StarDataset {
  return {
    positions,
    stars: stars ?? Array.from({ length: count }, (_, i) => ({
      pos: [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]] as Vec3,
    })),
    count,
    bounds: computeBounds(positions, count),
  };
}

export function generateUniform(count: number, seed = 42, range = 1000): StarDataset {
  const rng = new SeededRNG(seed);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = rng.range(-range, range);
    positions[i * 3 + 1] = rng.range(-range, range);
    positions[i * 3 + 2] = rng.range(-range, range);
  }
  return buildDataset(positions, count);
}

export function generateGaussian(count: number, seed = 42, spread = 200): StarDataset {
  const rng = new SeededRNG(seed);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = rng.gaussian() * spread;
    positions[i * 3 + 1] = rng.gaussian() * spread;
    positions[i * 3 + 2] = rng.gaussian() * spread;
  }
  return buildDataset(positions, count);
}

export function generateClustered(count: number, seed = 42, numClusters = 8): StarDataset {
  const rng = new SeededRNG(seed);
  const positions = new Float32Array(count * 3);
  const centers: Vec3[] = [];
  for (let c = 0; c < numClusters; c++) {
    centers.push([
      rng.range(-800, 800),
      rng.range(-800, 800),
      rng.range(-800, 800),
    ]);
  }
  for (let i = 0; i < count; i++) {
    const center = centers[Math.floor(rng.next() * numClusters)];
    positions[i * 3] = center[0] + rng.gaussian() * 80;
    positions[i * 3 + 1] = center[1] + rng.gaussian() * 80;
    positions[i * 3 + 2] = center[2] + rng.gaussian() * 80;
  }
  return buildDataset(positions, count);
}

export function generateSynthetic(
  count: number,
  distribution: Distribution,
  seed = 42,
): StarDataset {
  switch (distribution) {
    case 'uniform':
      return generateUniform(count, seed);
    case 'gaussian':
      return generateGaussian(count, seed);
    case 'clustered':
      return generateClustered(count, seed);
  }
}

export const STEP_MODE_MAX_STARS = 20000;
