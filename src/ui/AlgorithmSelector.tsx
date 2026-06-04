import { ALGORITHM_INFO } from '../algorithms';
import { CATEGORY_LABELS, type AlgorithmCategory, type AlgorithmInfo } from '../algorithms/types';
import { useAppStore } from '../store/useAppStore';

const CATEGORY_ORDER: AlgorithmCategory[] = ['selection', 'spatial'];

export function AlgorithmSelector() {
  const selectedAlgorithms = useAppStore((s) => s.selectedAlgorithms);
  const activeAlgorithmId = useAppStore((s) => s.activeAlgorithmId);
  const runMode = useAppStore((s) => s.runMode);
  const toggleAlgorithm = useAppStore((s) => s.toggleAlgorithm);
  const setActiveAlgorithm = useAppStore((s) => s.setActiveAlgorithm);
  const setInfoAlgorithmId = useAppStore((s) => s.setInfoAlgorithmId);

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: ALGORITHM_INFO.filter((a) => a.category === category),
  })).filter((g) => g.items.length > 0);

  const renderItem = (algo: AlgorithmInfo) => {
    const selected = selectedAlgorithms.includes(algo.id);
    const isActive = activeAlgorithmId === algo.id;
    return (
      <div
        key={algo.id}
        className={`algo-item ${selected ? 'selected' : ''}`}
        onClick={() => toggleAlgorithm(algo.id)}
        title={algo.description}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={() => toggleAlgorithm(algo.id)}
          onClick={(e) => e.stopPropagation()}
        />
        <span className="algo-name">{algo.label}</span>
        {algo.supportsSteps && <span className="algo-badge">steps</span>}
        {runMode === 'step' && selected && (
          <button
            className={`btn ${isActive ? 'btn-active' : ''}`}
            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
            onClick={(e) => {
              e.stopPropagation();
              setActiveAlgorithm(algo.id);
            }}
          >
            {isActive ? 'Active' : 'Select'}
          </button>
        )}
        <button
          className="algo-info-btn"
          title={`How does ${algo.label} work?`}
          aria-label={`Explain ${algo.label}`}
          onClick={(e) => {
            e.stopPropagation();
            setInfoAlgorithmId(algo.id);
          }}
        >
          i
        </button>
      </div>
    );
  };

  return (
    <div className="section">
      <h3 className="section-title">Algorithms</h3>
      {grouped.map((group) => (
        <div key={group.category} className="algo-group">
          <h4 className="algo-group-title">{CATEGORY_LABELS[group.category]}</h4>
          <div className="algo-list">{group.items.map(renderItem)}</div>
        </div>
      ))}
      {runMode === 'step' && (
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 8 }}>
          Step mode visualizes the active algorithm. Click Select to choose which one to animate.
        </p>
      )}
      <p style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 8 }}>
        Click the <span className="algo-info-inline">i</span> on any method for an explanation of how
        it works. Selection strategies all scan every star (same distance checks) but differ in
        comparisons/swaps; spatial structures cut down which stars are examined at all.
      </p>
    </div>
  );
}
