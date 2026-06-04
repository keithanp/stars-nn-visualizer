import { useAppStore } from '../store/useAppStore';

export function ComparisonTable() {
  const results = useAppStore((s) => s.results);

  if (results.length < 2) return null;

  const fastest = Math.min(...results.map((r) => r.metrics.queryMs + r.metrics.buildMs));
  const showComparisons = results.some((r) => r.metrics.comparisons !== undefined);

  const fmt = (v: number | undefined) => (v === undefined ? '—' : v.toLocaleString());

  return (
    <div className="section">
      <h3 className="section-title">Comparison</h3>
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Algorithm</th>
            <th>Total (ms)</th>
            <th>Dist Checks</th>
            {showComparisons && <th>Compares</th>}
            {showComparisons && <th>Swaps</th>}
            <th>Pruned</th>
            <th>Recall</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const total = r.metrics.buildMs + r.metrics.queryMs;
            const isFastest = total <= fastest;
            return (
              <tr key={r.algorithmId}>
                <td>
                  {r.label}
                  {isFastest && ' *'}
                </td>
                <td>{total.toFixed(2)}</td>
                <td>{r.metrics.distChecks.toLocaleString()}</td>
                {showComparisons && <td>{fmt(r.metrics.comparisons)}</td>}
                {showComparisons && <td>{fmt(r.metrics.swaps)}</td>}
                <td>{r.metrics.nodesPruned.toLocaleString()}</td>
                <td>{r.metrics.approximate ? `${((r.metrics.recall ?? 0) * 100).toFixed(0)}%` : '100%'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: 6 }}>* fastest total time</p>
    </div>
  );
}
