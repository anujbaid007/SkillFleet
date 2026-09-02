import {
  HudFrame,
  Stat,
  StatGroup,
  formatClock,
  type GameHudProps,
} from '../../core/ui/HudFrame';
import type { CmHudDetail } from './ColorMatchEngine';

/**
 * Time, score and streak only — the NO / YES bar is drawn by the engine so a
 * tap and an arrow key take exactly the same path through the game.
 */
export function CmHud({ hud, displayScore, onPause }: GameHudProps) {
  const detail = hud.detail as CmHudDetail | undefined;
  const urgent = detail !== undefined && detail.urgency < 0.3;
  const dots = Array.from({ length: hud.streakTarget }, (_, i) => i < hud.streak);
  const score = displayScore ?? hud.score;

  return (
    <HudFrame
      onPause={onPause}
      stats={
        <>
          <StatGroup>
            <Stat label="TIME" value={formatClock(hud.timeLeft)} urgent={urgent} />
            <Stat label="SCORE" value={score.toLocaleString()} />
          </StatGroup>
          <div className="streak">
            {hud.maxMultiplier ? (
              <span className="streak__max">MAX</span>
            ) : (
              <span className="streak__dots">
                {dots.map((on, i) => (
                  <span key={i} className={`streak__dot${on ? ' streak__dot--on' : ''}`} />
                ))}
              </span>
            )}
            <span className="streak__mult">×{hud.multiplier}</span>
          </div>
        </>
      }
    />
  );
}
