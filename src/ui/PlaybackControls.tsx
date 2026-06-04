import { useAlgorithmRunner } from '../hooks/useAlgorithmRunner';
import { useAppStore } from '../store/useAppStore';

export function PlaybackControls() {
  const playbackMode = useAppStore((s) => s.playbackMode);
  const playbackSpeed = useAppStore((s) => s.playbackSpeed);
  const runMode = useAppStore((s) => s.runMode);
  const isLoading = useAppStore((s) => s.isLoading);
  const setPlaybackSpeed = useAppStore((s) => s.setPlaybackSpeed);
  const resetPlayback = useAppStore((s) => s.resetPlayback);

  const { run, stepForward, play, pause, stepIndex, stepHistoryLength } = useAlgorithmRunner();

  const isRunning = playbackMode === 'running';
  const isPlaying = playbackMode === 'playing';
  const isStepping = playbackMode === 'stepping' || playbackMode === 'playing';

  return (
    <div className="section">
      <h3 className="section-title">Playback</h3>

      <div className="btn-row">
        <button className="btn btn-primary" onClick={run} disabled={isLoading || isRunning}>
          {runMode === 'fast' ? 'Run' : 'Build Steps'}
        </button>
        {runMode === 'step' && (
          <>
            <button className="btn" onClick={stepForward} disabled={!isStepping || stepIndex >= stepHistoryLength}>
              Step
            </button>
            {!isPlaying ? (
              <button className="btn" onClick={play} disabled={stepHistoryLength === 0}>
                Play
              </button>
            ) : (
              <button className="btn" onClick={pause}>
                Pause
              </button>
            )}
          </>
        )}
        <button className="btn" onClick={resetPlayback}>
          Reset
        </button>
      </div>

      {runMode === 'step' && stepHistoryLength > 0 && (
        <div className="control-row" style={{ marginTop: 12 }}>
          <label>
            Step {stepIndex} / {stepHistoryLength}
          </label>
        </div>
      )}

      {runMode === 'step' && (
        <div className="control-row">
          <label>
            Speed <span className="value">{playbackSpeed}x</span>
          </label>
          <input
            type="range"
            min={0.25}
            max={8}
            step={0.25}
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
          />
        </div>
      )}
    </div>
  );
}
