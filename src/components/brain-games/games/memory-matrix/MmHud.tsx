import { HudFrame, Stat, StatGroup, type GameHudProps } from '../../core/ui/HudFrame';
import type { MmHudDetail } from './MemoryMatrixEngine';

/**
 * Trial counter and score. Memory Matrix has no clock — it runs a fixed number
 * of trials — so the time pill is replaced by the trial pill.
 */
export function MmHud({ hud, displayScore, onPause }: GameHudProps) {
  const d = hud.detail as MmHudDetail | undefined;
  const score = displayScore ?? hud.score;

  const caption =
    d?.stage === 'study'
      ? 'Memorise the tiles.'
      : d?.stage === 'recall'
        ? d.remaining === 1
          ? 'Keep tapping. You can uncover 1 more tile.'
          : `Keep tapping. You can uncover ${d.remaining} more tiles.`
        : null;

  return (
    <HudFrame
      onPause={onPause}
      stats={
        <>
          <StatGroup>
            <Stat label="TRIAL" value={d ? `${d.trial} of ${d.trials}` : '—'} />
            <Stat label="SCORE" value={score.toLocaleString()} />
          </StatGroup>
          {d && d.bonus > 0 && <div className="mm-bonus">BONUS + {d.bonus}</div>}
        </>
      }
      bottom={caption ? <div className="mm-hint">{caption}</div> : undefined}
    />
  );
}
