import type { GameResultProps } from './HudFrame';
import { prefersTouch } from '../engine/Input';

/**
 * Default end-of-round card. Games with a different shape of result — no
 * score, or a bespoke progression readout — supply their own via the registry.
 */
export function ResultCard({
  result,
  title,
  skill,
  debrief,
  onReplay,
  onExit,
}: GameResultProps) {
  const verb = prefersTouch() ? 'Swipe' : 'Arrow keys';
  return (
    <div className="panel">
      <div className="result__label">FINAL SCORE</div>
      <div className="result__hero">{result.total.toLocaleString()}</div>

      {result.newBest && <div className="result__badge result__badge--best">NEW PERSONAL BEST</div>}
      {result.leveledUp && <div className="result__badge">LEVEL {result.level} UNLOCKED</div>}

      <div className="result__grid">
        <div className="result__cell">
          <b>{result.correct}</b>
          <span>CORRECT</span>
        </div>
        <div className="result__cell">
          <b>{Math.round(result.accuracy * 100)}%</b>
          <span>ACCURACY</span>
        </div>
        <div className="result__cell">
          <b>×{result.maxMultiplier}</b>
          <span>TOP MULTI</span>
        </div>
      </div>

      <h2 style={{ marginTop: 18 }}>
        {title} challenged your {skill}.
      </h2>
      <p>{debrief}</p>
      <p style={{ fontSize: 12, marginTop: -8 }}>
        Level {result.level} · Best {result.best.toLocaleString()} · {verb}
      </p>

      <button className="btn" onClick={onReplay}>
        Play again
      </button>
      <button className="btn btn--ghost" onClick={onExit}>
        Back to games
      </button>
    </div>
  );
}
