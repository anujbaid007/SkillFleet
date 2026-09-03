import type { GameResultProps } from './HudFrame';
import { ResultActions } from './ResultActions';
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
  onHome,
}: GameResultProps) {
  const verb = prefersTouch() ? 'Swipe' : 'Arrow keys';

  /*
   * How close the round came to the next level.
   *
   * The gate is accuracy plus a minimum number of correct answers, not score —
   * so "how much more score do I need" has no answer, and showing one would be
   * inventing a rule the game does not use. What a player can act on is which
   * of the two bars they missed, and by how much.
   *
   * Shown whether or not the round cleared. A player who levelled up still
   * wants to know what the bar was — hiding it on success answers the question
   * only for the people who failed.
   *
   * Games that measure a level rather than award one — Tile Trace, Tide Pool,
   * River Watch — report no requirement, and this whole block is skipped.
   */
  const gated = result.needAccuracy !== undefined && result.needCorrect !== undefined;
  const accPct = Math.round(result.accuracy * 100);
  const needPct = gated ? Math.round(result.needAccuracy! * 100) : 0;
  const accOk = gated && result.accuracy >= result.needAccuracy!;
  const volOk = gated && result.correct >= result.needCorrect!;
  const nextLevel = result.levelBefore + 1;
  // Both bars are shown as a share of what was asked, capped so a strong round
  // does not draw past the end of its track.
  const accShare = gated ? Math.min(1, result.accuracy / result.needAccuracy!) : 0;
  const volShare = gated ? Math.min(1, result.correct / result.needCorrect!) : 0;

  return (
    <div className="panel">
      <div className="result__label">FINAL SCORE</div>
      <div className="result__hero">{result.total.toLocaleString()}</div>

      {result.newBest && <div className="result__badge result__badge--best">NEW PERSONAL BEST</div>}
      {result.leveledUp && (
        <div className="result__badge result__badge--up">LEVEL CLEARED · NEXT UNLOCKED</div>
      )}
      {gated && !result.leveledUp && (
        <div className="result__badge result__badge--locked">LEVEL {nextLevel} STILL LOCKED</div>
      )}

      {gated && (
        <div className="unlock">
          <div className="unlock__row">
            <span className="unlock__label">ACCURACY</span>
            <span className="unlock__track">
              <i className={accOk ? 'is-met' : ''} style={{ width: `${accShare * 100}%` }} />
            </span>
            <b className={accOk ? 'unlock__met' : ''}>
              {accPct}/{needPct}%
            </b>
          </div>
          <div className="unlock__row">
            <span className="unlock__label">CORRECT</span>
            <span className="unlock__track">
              <i className={volOk ? 'is-met' : ''} style={{ width: `${volShare * 100}%` }} />
            </span>
            <b className={volOk ? 'unlock__met' : ''}>
              {result.correct}/{result.needCorrect}
            </b>
          </div>
          <p className="unlock__hint">
            {result.leveledUp
              ? `Level ${nextLevel} asked for ${needPct}% accuracy over ${result.needCorrect} correct. You cleared both.`
              : !accOk && !volOk
                ? `Reach ${needPct}% accuracy over ${result.needCorrect} correct to open level ${nextLevel}.`
                : !accOk
                  ? `Enough answers — you need ${needPct}% accuracy, and had ${accPct}%.`
                  : `Accuracy is there. You need ${result.needCorrect} correct, and had ${result.correct}.`}
          </p>
        </div>
      )}

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

      <ResultActions
        replay={result.leveledUp ? `Play level ${result.level}` : 'Play again'}
        onReplay={onReplay}
        onExit={onExit}
        onHome={onHome}
      />
    </div>
  );
}
