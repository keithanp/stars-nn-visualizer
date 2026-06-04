import { useEffect } from 'react';
import { ALGORITHM_INFO } from '../algorithms';
import { ALGORITHM_EXPLANATIONS } from '../algorithms/explanations';
import { CATEGORY_LABELS } from '../algorithms/types';
import { useAppStore } from '../store/useAppStore';

export function AlgorithmInfoModal() {
  const infoAlgorithmId = useAppStore((s) => s.infoAlgorithmId);
  const setInfoAlgorithmId = useAppStore((s) => s.setInfoAlgorithmId);

  useEffect(() => {
    if (!infoAlgorithmId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInfoAlgorithmId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [infoAlgorithmId, setInfoAlgorithmId]);

  if (!infoAlgorithmId) return null;

  const info = ALGORITHM_INFO.find((a) => a.id === infoAlgorithmId);
  const explanation = ALGORITHM_EXPLANATIONS[infoAlgorithmId];
  if (!info || !explanation) return null;

  const close = () => setInfoAlgorithmId(null);

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <span className="modal-category">{CATEGORY_LABELS[info.category]}</span>
            <h2 className="modal-title">{info.label}</h2>
          </div>
          <button className="modal-close" onClick={close} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-summary">{explanation.summary}</p>

          <h3 className="modal-section-title">How it works</h3>
          <ol className="modal-steps">
            {explanation.howItWorks.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>

          <h3 className="modal-section-title">Complexity</h3>
          <dl className="modal-complexity">
            {explanation.complexity.build && (
              <>
                <dt>Build</dt>
                <dd>{explanation.complexity.build}</dd>
              </>
            )}
            <dt>Query</dt>
            <dd>{explanation.complexity.query}</dd>
            {explanation.complexity.space && (
              <>
                <dt>Space</dt>
                <dd>{explanation.complexity.space}</dd>
              </>
            )}
          </dl>

          <div className="modal-proscons">
            <div>
              <h3 className="modal-section-title">Strengths</h3>
              <ul className="modal-pros">
                {explanation.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="modal-section-title">Weaknesses</h3>
              <ul className="modal-cons">
                {explanation.weaknesses.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
