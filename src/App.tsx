import { useEffect, useRef } from 'react';
import './App.css';
import { useAlgorithmRunner, useDatasetLoader } from './hooks/useAlgorithmRunner';
import { Scene3D } from './scene/Scene';
import { useAppStore } from './store/useAppStore';
import { AlgorithmInfoModal } from './ui/AlgorithmInfoModal';
import { AlgorithmSelector } from './ui/AlgorithmSelector';
import { ComparisonTable } from './ui/ComparisonTable';
import { ControlsPanel } from './ui/ControlsPanel';
import { MetricsPanel } from './ui/MetricsPanel';
import { PlaybackControls } from './ui/PlaybackControls';

function QueryPointControls() {
  const queryPoint = useAppStore((s) => s.queryPoint);
  const setQueryPoint = useAppStore((s) => s.setQueryPoint);
  const { runFast } = useAlgorithmRunner();

  return (
    <div className="section">
      <h3 className="section-title">Query Point</h3>
      <div className="control-row">
        <label>
          X <span className="value">{queryPoint[0].toFixed(1)}</span>
        </label>
        <input
          type="range"
          min={-1000}
          max={1000}
          value={queryPoint[0]}
          onChange={(e) => setQueryPoint([Number(e.target.value), queryPoint[1], queryPoint[2]])}
        />
      </div>
      <div className="control-row">
        <label>
          Y <span className="value">{queryPoint[1].toFixed(1)}</span>
        </label>
        <input
          type="range"
          min={-1000}
          max={1000}
          value={queryPoint[1]}
          onChange={(e) => setQueryPoint([queryPoint[0], Number(e.target.value), queryPoint[2]])}
        />
      </div>
      <div className="control-row">
        <label>
          Z <span className="value">{queryPoint[2].toFixed(1)}</span>
        </label>
        <input
          type="range"
          min={-1000}
          max={1000}
          value={queryPoint[2]}
          onChange={(e) => setQueryPoint([queryPoint[0], queryPoint[1], Number(e.target.value)])}
        />
      </div>
      <div className="btn-row">
        <button className="btn" onClick={() => setQueryPoint([0, 0, 0])}>
          Reset to Origin
        </button>
        <button className="btn btn-primary" onClick={() => runFast()}>
          Recompute
        </button>
      </div>
    </div>
  );
}

function App() {
  useDatasetLoader();
  const { runFast } = useAlgorithmRunner();
  const queryPoint = useAppStore((s) => s.queryPoint);
  const results = useAppStore((s) => s.results);
  const runMode = useAppStore((s) => s.runMode);
  const playbackMode = useAppStore((s) => s.playbackMode);
  const debounceRef = useRef<number>();

  useEffect(() => {
    if (results.length === 0 || runMode !== 'fast' || playbackMode === 'running') return;
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => runFast(), 400);
    return () => window.clearTimeout(debounceRef.current);
  }, [queryPoint, results.length, runMode, playbackMode, runFast]);
  const statusMessage = useAppStore((s) => s.statusMessage);
  const currentStep = useAppStore((s) => s.currentStep);
  const clickToQuery = useAppStore((s) => s.clickToQuery);

  return (
    <div className="app">
      <div className="canvas-container">
        <Scene3D />
        <div className="overlay-hint">
          <strong>Controls:</strong> Drag to orbit, scroll to zoom.
          {clickToQuery && ' Click a star to set query point.'}
          {currentStep && (
            <>
              <br />
              <strong>Step:</strong> {currentStep.kind}
              {currentStep.kind === 'considerPoint' && ` #${currentStep.index} (d=${currentStep.dist.toFixed(1)})`}
              {currentStep.kind === 'evictPoint' && ` evicted #${currentStep.index} (d=${currentStep.dist.toFixed(1)})`}
              {currentStep.kind === 'pruneNode' && ` — ${currentStep.reason}`}
            </>
          )}
        </div>
      </div>

      <aside className="side-panel">
        <header className="panel-header">
          <p>Find the K nearest stars in 3D space</p>
        </header>

        <div className="panel-content">
          <ControlsPanel />
          <AlgorithmSelector />
          <QueryPointControls />
          <PlaybackControls />
          <MetricsPanel />
          <ComparisonTable />
        </div>

        <footer className="status-bar">{statusMessage}</footer>
      </aside>

      <AlgorithmInfoModal />
    </div>
  );
}

export default App;
