import { useAppStore } from '../store/useAppStore';
import { STEP_MODE_MAX_STARS } from '../data/generators';

export function ControlsPanel() {
  const distribution = useAppStore((s) => s.distribution);
  const starCount = useAppStore((s) => s.starCount);
  const seed = useAppStore((s) => s.seed);
  const k = useAppStore((s) => s.k);
  const clickToQuery = useAppStore((s) => s.clickToQuery);
  const runMode = useAppStore((s) => s.runMode);
  const dataset = useAppStore((s) => s.dataset);

  const setDistribution = useAppStore((s) => s.setDistribution);
  const setStarCount = useAppStore((s) => s.setStarCount);
  const setSeed = useAppStore((s) => s.setSeed);
  const setK = useAppStore((s) => s.setK);
  const setClickToQuery = useAppStore((s) => s.setClickToQuery);
  const setRunMode = useAppStore((s) => s.setRunMode);

  const showStepWarning = runMode === 'step' && (dataset?.count ?? 0) > STEP_MODE_MAX_STARS;

  return (
    <div className="section">
      <h3 className="section-title">Data</h3>

      <div className="control-row">
        <label>Distribution</label>
        <select
          value={distribution}
          onChange={(e) => setDistribution(e.target.value as 'uniform' | 'gaussian' | 'clustered')}
        >
          <option value="uniform">Uniform Cube</option>
          <option value="gaussian">Gaussian Cloud</option>
          <option value="clustered">Multi-Cluster</option>
        </select>
      </div>

      <div className="control-row">
        <label>
          Star Count <span className="value">{starCount.toLocaleString()}</span>
        </label>
        <input
          type="range"
          min={100}
          max={1000000}
          step={100}
          value={starCount}
          onChange={(e) => setStarCount(Number(e.target.value))}
        />
      </div>

      <div className="control-row">
        <label>
          Seed <span className="value">{seed}</span>
        </label>
        <input
          type="range"
          min={1}
          max={9999}
          value={seed}
          onChange={(e) => setSeed(Number(e.target.value))}
        />
      </div>

      <div className="control-row">
        <label>
          K (nearest neighbors) <span className="value">{k}</span>
        </label>
        <input type="range" min={1} max={500} value={k} onChange={(e) => setK(Number(e.target.value))} />
      </div>

      <div className="control-row">
        <label>
          <span>Click star to set query point</span>
          <input
            type="checkbox"
            checked={clickToQuery}
            onChange={(e) => setClickToQuery(e.target.checked)}
          />
        </label>
      </div>

      <div className="control-row">
        <label>Run Mode</label>
        <div className="btn-row">
          <button
            className={`btn ${runMode === 'fast' ? 'btn-active' : ''}`}
            onClick={() => setRunMode('fast')}
          >
            Fast + Metrics
          </button>
          <button
            className={`btn ${runMode === 'step' ? 'btn-active' : ''}`}
            onClick={() => setRunMode('step')}
          >
            Step-by-Step
          </button>
        </div>
      </div>

      {showStepWarning && (
        <div className="warning">
          Step mode works best with ≤ {STEP_MODE_MAX_STARS.toLocaleString()} stars. Use Fast mode for larger datasets.
        </div>
      )}

      {dataset && (
        <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0 }}>
          Loaded: {dataset.count.toLocaleString()} stars
        </p>
      )}
    </div>
  );
}
