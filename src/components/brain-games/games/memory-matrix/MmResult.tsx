import type { GameResultProps } from '../../core/ui/HudFrame';

/** The reference's card leads with the largest pattern held, not the score. */
export function MmResult({ result, title, skill, debrief, onReplay, onExit }: GameResultProps) {
  const tiles = result.maxMultiplier;

  return (
    <div className="panel">
      <div className="result__label">LARGEST PATTERN</div>
      <div className="result__hero">{tiles} tiles</div>

      {result.newBest && (
        <div className="result__badge result__badge--best">NEW PERSONAL BEST</div>
      )}
      {result.leveledUp && <div className="result__badge">{tiles} TILES BANKED</div>}

      <div className="result__grid">
        <div className="result__cell">
          <b>{result.score.toLocaleString()}</b>
          <span>SCORE</span>
        </div>
        <div className="result__cell">
          <b>{result.correct}</b>
          <span>TRIALS</span>
        </div>
        <div className="result__cell">
          <b>{tiles}</b>
          <span>TILES</span>
        </div>
      </div>

      <h2 style={{ marginTop: 18 }}>
        {title} challenged your {skill}.
      </h2>
      <p>{debrief}</p>

      <button className="btn" onClick={onReplay}>
        Play again
      </button>
      <button className="btn btn--ghost" onClick={onExit}>
        Back to games
      </button>
    </div>
  );
}
