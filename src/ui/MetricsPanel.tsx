import { useAppStore } from '../store/useAppStore';

export function MetricsPanel() {
  const results = useAppStore((s) => s.results);
  const activeAlgorithmId = useAppStore((s) => s.activeAlgorithmId);

  if (results.length === 0) {
    return (
      <div className="section">
        <h3 className="section-title">Metrics</h3>
        <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Run an algorithm to see metrics.</p>
      </div>
    );
  }

  const sorted = [...results].sort((a, b) => {
    if (a.algorithmId === activeAlgorithmId) return -1;
    if (b.algorithmId === activeAlgorithmId) return 1;
    return 0;
  });

  return (
    <div className="section">
      <h3 className="section-title">Metrics</h3>
      {sorted.map((result) => (
        <div
          key={result.algorithmId}
          className="metrics-card"
          style={{
            borderColor: result.algorithmId === activeAlgorithmId ? '#3b82f6' : undefined,
          }}
        >
          <h4>
            {result.label}
            {result.algorithmId === activeAlgorithmId && (
              <span style={{ marginLeft: 8, fontSize: '0.7rem', color: '#60a5fa' }}>(active)</span>
            )}
          </h4>
          <dl className="metrics-grid">
            <dt>Build</dt>
            <dd>{result.metrics.buildMs.toFixed(2)} ms</dd>
            <dt>Query</dt>
            <dd>{result.metrics.queryMs.toFixed(2)} ms</dd>
            <dt>Dist Checks</dt>
            <dd>{result.metrics.distChecks.toLocaleString()}</dd>
            {result.metrics.comparisons !== undefined && (
              <>
                <dt>Comparisons</dt>
                <dd>{result.metrics.comparisons.toLocaleString()}</dd>
              </>
            )}
            {result.metrics.swaps !== undefined && (
              <>
                <dt>Swaps / Moves</dt>
                <dd>{result.metrics.swaps.toLocaleString()}</dd>
              </>
            )}
            <dt>Nodes Visited</dt>
            <dd>{result.metrics.nodesVisited.toLocaleString()}</dd>
            <dt>Nodes Pruned</dt>
            <dd>{result.metrics.nodesPruned.toLocaleString()}</dd>
            <dt>Results</dt>
            <dd>{result.resultIndices.length}</dd>
            {result.metrics.approximate && (
              <>
                <dt>Approximate</dt>
                <dd>Yes</dd>
                <dt>Recall</dt>
                <dd>{((result.metrics.recall ?? 0) * 100).toFixed(1)}%</dd>
              </>
            )}
          </dl>
        </div>
      ))}
    </div>
  );
}
