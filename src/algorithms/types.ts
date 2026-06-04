export type Vec3 = [number, number, number];

export type Step =
  | { kind: 'considerPoint'; index: number; dist: number }
  | { kind: 'updateBest'; bestIndices: number[]; worstDist: number }
  | { kind: 'evictPoint'; index: number; dist: number }
  | { kind: 'visitNode'; bbox: [Vec3, Vec3]; depth: number }
  | { kind: 'pruneNode'; bbox: [Vec3, Vec3]; reason: string }
  | { kind: 'splitPlane'; axis: 0 | 1 | 2; value: number; bbox: [Vec3, Vec3] };

export type AlgorithmCategory = 'spatial' | 'selection';

export interface Metrics {
  buildMs: number;
  queryMs: number;
  distChecks: number;
  nodesVisited: number;
  nodesPruned: number;
  comparisons?: number;
  swaps?: number;
  approximate?: boolean;
  recall?: number;
}

export interface QueryResult {
  resultIndices: number[];
  metrics: Metrics;
}

export interface NNAlgorithm {
  id: string;
  label: string;
  description: string;
  category: AlgorithmCategory;
  supportsSteps: boolean;
  build(points: Float32Array, count: number): void;
  query(q: Vec3, k: number): QueryResult;
  querySteps?(q: Vec3, k: number): Generator<Step, Metrics>;
}

export interface AlgorithmInfo {
  id: string;
  label: string;
  description: string;
  category: AlgorithmCategory;
  supportsSteps: boolean;
}

export const CATEGORY_LABELS: Record<AlgorithmCategory, string> = {
  spatial: 'Spatial Acceleration Structures',
  selection: 'Top-K Selection Strategies',
};

export function emptyMetrics(): Metrics {
  return {
    buildMs: 0,
    queryMs: 0,
    distChecks: 0,
    nodesVisited: 0,
    nodesPruned: 0,
  };
}
