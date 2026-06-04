import { useCallback, useEffect, useRef } from 'react';
import { createAlgorithm } from '../algorithms';
import type { Metrics, Step } from '../algorithms/types';
import { STEP_MODE_MAX_STARS } from '../data/generators';
import { generateSynthetic } from '../data/generators';
import { useAppStore, type AlgorithmResult } from '../store/useAppStore';
import QueryWorker from '../workers/query.worker?worker';

export function useDatasetLoader() {
  const distribution = useAppStore((s) => s.distribution);
  const starCount = useAppStore((s) => s.starCount);
  const seed = useAppStore((s) => s.seed);
  const setDataset = useAppStore((s) => s.setDataset);
  const setIsLoading = useAppStore((s) => s.setIsLoading);
  const setStatusMessage = useAppStore((s) => s.setStatusMessage);
  const resetPlayback = useAppStore((s) => s.resetPlayback);

  const load = useCallback(async () => {
    setIsLoading(true);
    resetPlayback();
    try {
      const dataset = generateSynthetic(starCount, distribution, seed);
      setStatusMessage(`Generated ${dataset.count} synthetic stars`);
      setDataset(dataset);
    } catch (err) {
      setStatusMessage(`Error loading data: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [distribution, starCount, seed, setDataset, setIsLoading, setStatusMessage, resetPlayback]);

  useEffect(() => {
    load();
  }, [load]);

  return { reload: load };
}

export function useAlgorithmRunner() {
  const dataset = useAppStore((s) => s.dataset);
  const queryPoint = useAppStore((s) => s.queryPoint);
  const k = useAppStore((s) => s.k);
  const selectedAlgorithms = useAppStore((s) => s.selectedAlgorithms);
  const activeAlgorithmId = useAppStore((s) => s.activeAlgorithmId);
  const runMode = useAppStore((s) => s.runMode);
  const playbackSpeed = useAppStore((s) => s.playbackSpeed);
  const playbackMode = useAppStore((s) => s.playbackMode);
  const stepIndex = useAppStore((s) => s.stepIndex);
  const stepHistory = useAppStore((s) => s.stepHistory);

  const setResults = useAppStore((s) => s.setResults);
  const setStatusMessage = useAppStore((s) => s.setStatusMessage);
  const setPlaybackMode = useAppStore((s) => s.setPlaybackMode);
  const setStepHistory = useAppStore((s) => s.setStepHistory);
  const setStepIndex = useAppStore((s) => s.setStepIndex);
  const setCurrentStep = useAppStore((s) => s.setCurrentStep);
  const setHighlightIndices = useAppStore((s) => s.setHighlightIndices);
  const setWorstDist = useAppStore((s) => s.setWorstDist);
  const resetPlayback = useAppStore((s) => s.resetPlayback);

  const workerRef = useRef<Worker | null>(null);
  const playIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const worker = new QueryWorker();
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const { results, error } = e.data;
      const state = useAppStore.getState();
      const ds = state.dataset;

      if (error) {
        state.setStatusMessage(`Error: ${error}`);
        state.setPlaybackMode('idle');
        return;
      }

      state.setResults(results);
      const active =
        results.find((r: AlgorithmResult) => r.algorithmId === state.activeAlgorithmId) ?? results[0];
      if (active && ds) {
        state.setHighlightIndices(active.resultIndices);
        if (active.resultIndices.length > 0) {
          const worstIdx = active.resultIndices[active.resultIndices.length - 1];
          const px = ds.positions[worstIdx * 3] - state.queryPoint[0];
          const py = ds.positions[worstIdx * 3 + 1] - state.queryPoint[1];
          const pz = ds.positions[worstIdx * 3 + 2] - state.queryPoint[2];
          state.setWorstDist(Math.sqrt(px * px + py * py + pz * pz));
        }
      }
      state.setStatusMessage(`Completed ${results.length} algorithm(s)`);
      state.setPlaybackMode('idle');
    };

    return () => worker.terminate();
  }, []);

  const applyStep = useCallback(
    (step: Step) => {
      setCurrentStep(step);
      if (step.kind === 'updateBest') {
        setHighlightIndices(step.bestIndices);
        setWorstDist(step.worstDist);
      } else if (step.kind === 'evictPoint') {
        const current = useAppStore.getState().highlightIndices;
        if (current.includes(step.index)) {
          setHighlightIndices(current.filter((i) => i !== step.index));
        }
      }
    },
    [setCurrentStep, setHighlightIndices, setWorstDist],
  );

  const runFast = useCallback(async () => {
    if (!dataset || selectedAlgorithms.length === 0) return;

    resetPlayback();
    setPlaybackMode('running');
    setStatusMessage('Running algorithms...');

    const count = dataset.count;
    const useWorker = count > STEP_MODE_MAX_STARS;

    if (useWorker && workerRef.current) {
      const positions = dataset.positions.slice();
      workerRef.current.postMessage({
        type: 'query',
        positions,
        count,
        queryPoint,
        k,
        algorithmIds: selectedAlgorithms,
      });
      return;
    }

    const results: AlgorithmResult[] = [];
    for (const id of selectedAlgorithms) {
      const alg = createAlgorithm(id);
      if (!alg) continue;
      const buildStart = performance.now();
      alg.build(dataset.positions, dataset.count);
      const buildMs = performance.now() - buildStart;
      const { resultIndices, metrics } = alg.query(queryPoint, k);
      if (!metrics.buildMs) metrics.buildMs = buildMs;
      results.push({ algorithmId: id, label: alg.label, resultIndices, metrics });
    }

    setResults(results);
    const active = results.find((r) => r.algorithmId === activeAlgorithmId) ?? results[0];
    if (active) {
      setHighlightIndices(active.resultIndices);
    }
    setStatusMessage(`Completed ${results.length} algorithm(s)`);
    setPlaybackMode('idle');
  }, [
    dataset,
    selectedAlgorithms,
    activeAlgorithmId,
    queryPoint,
    k,
    resetPlayback,
    setPlaybackMode,
    setStatusMessage,
    setResults,
    setHighlightIndices,
    setWorstDist,
  ]);

  const runStepMode = useCallback(() => {
    if (!dataset || !activeAlgorithmId) return;

    if (dataset.count > STEP_MODE_MAX_STARS) {
      setStatusMessage(`Step mode limited to ${STEP_MODE_MAX_STARS.toLocaleString()} stars`);
      return;
    }

    resetPlayback();
    setPlaybackMode('stepping');
    setStatusMessage('Building step sequence...');

    const alg = createAlgorithm(activeAlgorithmId);
    if (!alg || !alg.querySteps) {
      setStatusMessage('Algorithm does not support step mode');
      setPlaybackMode('idle');
      return;
    }

    alg.build(dataset.positions, dataset.count);
    const gen = alg.querySteps(queryPoint, k);
    const steps: Step[] = [];
    let result = gen.next();

    while (!result.done) {
      steps.push(result.value);
      result = gen.next();
    }

    const metrics = result.value as Metrics;
    const finalQuery = alg.query(queryPoint, k);
    metrics.queryMs = finalQuery.metrics.queryMs;
    if (!metrics.buildMs) metrics.buildMs = finalQuery.metrics.buildMs;

    setStepHistory(steps);
    setResults([
      {
        algorithmId: activeAlgorithmId,
        label: alg.label,
        resultIndices: finalQuery.resultIndices,
        metrics: { ...finalQuery.metrics, ...metrics },
      },
    ]);
    setStatusMessage(`${steps.length} steps ready`);
  }, [
    dataset,
    activeAlgorithmId,
    queryPoint,
    k,
    resetPlayback,
    setPlaybackMode,
    setStatusMessage,
    setStepHistory,
    setResults,
  ]);

  const stepForward = useCallback(() => {
    if (stepIndex >= stepHistory.length) return;
    applyStep(stepHistory[stepIndex]);
    setStepIndex(stepIndex + 1);
  }, [stepIndex, stepHistory, applyStep, setStepIndex]);

  const play = useCallback(() => {
    if (stepHistory.length === 0) return;
    setPlaybackMode('playing');

    if (playIntervalRef.current) clearInterval(playIntervalRef.current);

    playIntervalRef.current = window.setInterval(() => {
      const current = useAppStore.getState().stepIndex;
      const history = useAppStore.getState().stepHistory;
      if (current >= history.length) {
        if (playIntervalRef.current) clearInterval(playIntervalRef.current);
        setPlaybackMode('idle');
        return;
      }
      applyStep(history[current]);
      setStepIndex(current + 1);
    }, Math.max(16, 100 / playbackSpeed));
  }, [stepHistory, playbackSpeed, applyStep, setStepIndex, setPlaybackMode]);

  const pause = useCallback(() => {
    if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    setPlaybackMode('stepping');
  }, [setPlaybackMode]);

  const run = useCallback(() => {
    if (runMode === 'fast') runFast();
    else runStepMode();
  }, [runMode, runFast, runStepMode]);

  useEffect(() => {
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, []);

  return {
    run,
    runFast,
    runStepMode,
    stepForward,
    play,
    pause,
    playbackMode,
    stepIndex,
    stepHistoryLength: stepHistory.length,
  };
}
