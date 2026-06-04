import type { AlgorithmInfo, NNAlgorithm } from './types';
import { createApproxGrid } from './approxGrid';
import { createBruteForce } from './bruteForce';
import { createBVH } from './bvh';
import { createFullSort } from './fullSort';
import { createSpatialGrid } from './grid';
import { createKDTree } from './kdTree';
import { createOctree } from './octree';
import { createQuickselect } from './quickselect';
import { createSortedInsert } from './sortedInsert';
import { createUnorderedTrackMax } from './unorderedTrackMax';

export const ALGORITHM_FACTORIES: Record<string, () => NNAlgorithm> = {
  'brute-force': createBruteForce,
  'full-sort': createFullSort,
  quickselect: createQuickselect,
  'sorted-insert': createSortedInsert,
  'unordered-track-max': createUnorderedTrackMax,
  'kd-tree': createKDTree,
  octree: createOctree,
  'spatial-grid': createSpatialGrid,
  bvh: createBVH,
  'approx-grid': createApproxGrid,
};

export const ALGORITHM_INFO: AlgorithmInfo[] = Object.values(ALGORITHM_FACTORIES)
  .map((factory) => factory())
  .map((a) => ({
    id: a.id,
    label: a.label,
    description: a.description,
    category: a.category,
    supportsSteps: a.supportsSteps,
  }));

export function createAlgorithm(id: string): NNAlgorithm | null {
  const factory = ALGORITHM_FACTORIES[id];
  return factory ? factory() : null;
}

export function getAlgorithmIds(): string[] {
  return Object.keys(ALGORITHM_FACTORIES);
}

export { ALGORITHM_INFO as algorithmRegistry };
