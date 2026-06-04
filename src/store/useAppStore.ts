import { create } from 'zustand';
import type { Metrics, Step } from './algorithms/types';
import type { DataSource, Distribution, StarDataset, Vec3 } from './data/types';

export type PlaybackMode = 'idle' | 'running' | 'stepping' | 'playing';
export type RunMode = 'fast' | 'step';

export interface AlgorithmResult {
  algorithmId: string;
  label: string;
  resultIndices: number[];
  metrics: Metrics;
}

export interface AppState {
  dataset: StarDataset | null;
  dataSource: DataSource;
  distribution: Distribution;
  starCount: number;
  seed: number;
  k: number;
  queryPoint: Vec3;
  selectedAlgorithms: string[];
  activeAlgorithmId: string | null;
  results: AlgorithmResult[];
  currentStep: Step | null;
  stepHistory: Step[];
  stepIndex: number;
  playbackMode: PlaybackMode;
  runMode: RunMode;
  playbackSpeed: number;
  isLoading: boolean;
  statusMessage: string;
  highlightIndices: number[];
  worstDist: number;
  clickToQuery: boolean;
  infoAlgorithmId: string | null;

  setDataset: (dataset: StarDataset) => void;
  setDataSource: (source: DataSource) => void;
  setDistribution: (dist: Distribution) => void;
  setStarCount: (count: number) => void;
  setSeed: (seed: number) => void;
  setK: (k: number) => void;
  setQueryPoint: (point: Vec3) => void;
  toggleAlgorithm: (id: string) => void;
  setActiveAlgorithm: (id: string | null) => void;
  setResults: (results: AlgorithmResult[]) => void;
  setCurrentStep: (step: Step | null) => void;
  setStepHistory: (steps: Step[]) => void;
  setStepIndex: (index: number) => void;
  setPlaybackMode: (mode: PlaybackMode) => void;
  setRunMode: (mode: RunMode) => void;
  setPlaybackSpeed: (speed: number) => void;
  setIsLoading: (loading: boolean) => void;
  setStatusMessage: (msg: string) => void;
  setHighlightIndices: (indices: number[]) => void;
  setWorstDist: (dist: number) => void;
  setClickToQuery: (enabled: boolean) => void;
  setInfoAlgorithmId: (id: string | null) => void;
  resetPlayback: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  dataset: null,
  dataSource: 'synthetic',
  distribution: 'uniform',
  starCount: 5000,
  seed: 42,
  k: 100,
  queryPoint: [0, 0, 0],
  selectedAlgorithms: ['brute-force', 'kd-tree'],
  activeAlgorithmId: 'kd-tree',
  results: [],
  currentStep: null,
  stepHistory: [],
  stepIndex: 0,
  playbackMode: 'idle',
  runMode: 'fast',
  playbackSpeed: 1,
  isLoading: false,
  statusMessage: 'Ready',
  highlightIndices: [],
  worstDist: 0,
  clickToQuery: true,
  infoAlgorithmId: null,

  setDataset: (dataset) => set({ dataset }),
  setDataSource: (dataSource) => set({ dataSource }),
  setDistribution: (distribution) => set({ distribution }),
  setStarCount: (starCount) => set({ starCount }),
  setSeed: (seed) => set({ seed }),
  setK: (k) => set({ k }),
  setQueryPoint: (queryPoint) => set({ queryPoint }),
  toggleAlgorithm: (id) =>
    set((state) => {
      const selected = state.selectedAlgorithms.includes(id)
        ? state.selectedAlgorithms.filter((a) => a !== id)
        : [...state.selectedAlgorithms, id];
      return {
        selectedAlgorithms: selected,
        activeAlgorithmId: selected.includes(state.activeAlgorithmId ?? '')
          ? state.activeAlgorithmId
          : selected[0] ?? null,
      };
    }),
  setActiveAlgorithm: (activeAlgorithmId) => set({ activeAlgorithmId }),
  setResults: (results) => set({ results }),
  setCurrentStep: (currentStep) => set({ currentStep }),
  setStepHistory: (stepHistory) => set({ stepHistory, stepIndex: 0, currentStep: stepHistory[0] ?? null }),
  setStepIndex: (stepIndex) => set({ stepIndex }),
  setPlaybackMode: (playbackMode) => set({ playbackMode }),
  setRunMode: (runMode) => set({ runMode }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  setHighlightIndices: (highlightIndices) => set({ highlightIndices }),
  setWorstDist: (worstDist) => set({ worstDist }),
  setClickToQuery: (clickToQuery) => set({ clickToQuery }),
  setInfoAlgorithmId: (infoAlgorithmId) => set({ infoAlgorithmId }),
  resetPlayback: () =>
    set({
      playbackMode: 'idle',
      currentStep: null,
      stepHistory: [],
      stepIndex: 0,
      highlightIndices: [],
      worstDist: 0,
    }),
}));
