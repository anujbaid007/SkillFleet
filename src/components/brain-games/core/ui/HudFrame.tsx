import { createContext, useContext, type ReactNode } from 'react';
import type { HudState, RoundResult } from '../types';

/** Props every game-specific HUD receives from the host. */
export interface GameHudProps {
  hud: HudState;
  /** Set during the end-of-round bonus count-up, if the game has one. */
  displayScore?: number;
  onPause: () => void;
}

/** Props every game-specific results card receives. */
export interface GameResultProps {
  result: RoundResult;
  title: string;
  skill: string;
  debrief: string;
  onReplay: () => void;
  /** Back to the Brain Games catalogue. */
  onExit: () => void;
  /**
   * Out of Brain Games entirely. Optional so a host that has nowhere further
   * to send the player renders no button rather than a dead one.
   */
  onHome?: () => void;
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * How the tutorial button reaches the HUD.
 *
 * Every game supplies its own HUD component, and all of them render
 * `HudFrame`. Threading a callback down through fifteen HUDs so each could
 * forward it unchanged would put the same line in fifteen files and invite one
 * of them to be missed. Context lets the host offer the control once and the
 * shared chrome pick it up.
 */
const ReplayTutorial = createContext<(() => void) | null>(null);

/**
 * The level the round is being played at, offered to the shared HUD.
 *
 * Same reasoning as the tutorial control above: only three of sixteen HUDs
 * showed a level, and adding it to the other thirteen by hand would put the
 * same line in thirteen files and invite one of them to be missed — or to
 * drift, since several of these games number their levels differently from
 * their internal difficulty. The host knows the round's level; the shared
 * chrome picks it up.
 */
const RoundLevel = createContext<string | null>(null);

export function RoundLevelBadge({
  level,
  children,
}: {
  level: string | null;
  children: ReactNode;
}) {
  return <RoundLevel.Provider value={level}>{children}</RoundLevel.Provider>;
}

export function TutorialControl({
  onReplay,
  children,
}: {
  onReplay: (() => void) | null;
  children: ReactNode;
}) {
  return <ReplayTutorial.Provider value={onReplay}>{children}</ReplayTutorial.Provider>;
}

/**
 * Shared HUD chrome: pause control top-left, game-supplied stats top-right,
 * and an optional strip pinned to the bottom of the board.
 */
export function HudFrame({
  onPause,
  stats,
  bottom,
}: {
  onPause: () => void;
  stats: ReactNode;
  bottom?: ReactNode;
}) {
  const replayTutorial = useContext(ReplayTutorial);
  const level = useContext(RoundLevel);
  return (
    <div className="hud">
      <div className="hud__top">
        <div className="hud__controls">
          <button className="iconbtn" onClick={onPause} aria-label="Pause">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <rect x="1" y="0" width="4.5" height="14" rx="1" fill="currentColor" />
              <rect x="8.5" y="0" width="4.5" height="14" rx="1" fill="currentColor" />
            </svg>
          </button>
          {replayTutorial && (
            <button
              className="iconbtn"
              onClick={replayTutorial}
              aria-label="Replay tutorial"
              title="Replay tutorial"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M5.6 5.9a2.5 2.5 0 1 1 3.2 2.9c-.5.2-.8.7-.8 1.2v.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="8" cy="13" r="1.05" fill="currentColor" />
              </svg>
            </button>
          )}
        </div>
        <div className="hud__stats">
          {level !== null && (
            <div className="pillgroup">
              <div className="stat">
                <span>LEVEL</span>
                <span className="stat__value">{level}</span>
              </div>
            </div>
          )}
          {stats}
        </div>
      </div>
      {bottom ?? <div />}
    </div>
  );
}

/** A row of joined stat pills, e.g. `TIME 1:24 | CORRECT 3 of 3`. */
export function StatGroup({ children }: { children: ReactNode }) {
  return <div className="pillgroup">{children}</div>;
}

export function Stat({
  label,
  value,
  urgent = false,
}: {
  label: string;
  value: string;
  urgent?: boolean;
}) {
  return (
    <div className={`stat${urgent ? ' stat--urgent' : ''}`}>
      <span>{label}</span>
      <span className="stat__value">{value}</span>
    </div>
  );
}
