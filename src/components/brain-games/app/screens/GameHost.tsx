'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameEntry } from '../../games/registry';
import type { GameEngine, Phase, TutorialHint } from '../../core/engine/GameEngine';
import type { HudState, RoundResult } from '../../core/types';
import { ResultCard } from '../../core/ui/ResultCard';
import { RoundLevelBadge, TutorialControl } from '../../core/ui/HudFrame';
import {
  getProgress,
  recordRound,
  saveProgress,
  type Settings,
} from '../../core/progress/Storage';
import { startLevel } from '../../core/progress/unlock';

const emptyHud = (roundSeconds: number): HudState => ({
  timeLeft: roundSeconds,
  score: 0,
  multiplier: 1,
  streak: 0,
  streakTarget: 4,
  maxMultiplier: false,
});

/** How long the score spends counting up into the end-of-round bonus. */
const BONUS_COUNT_MS = 1100;
const BONUS_HOLD_MS = 900;

type Stage = 'play' | 'bonus' | 'result';

interface GameHostProps {
  game: GameEntry;
  settings: Settings;
  onExit: () => void;
  /** Leave Brain Games altogether; omitted when there is nowhere to go. */
  onHome?: () => void;
}

export function GameHost({ game, settings, onExit, onHome }: GameHostProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [hud, setHud] = useState<HudState>(() => emptyHud(game.meta.roundSeconds));
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hint, setHint] = useState<TutorialHint | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [stage, setStage] = useState<Stage>('play');
  const [countUp, setCountUp] = useState<number | null>(null);
  /** Bumping this remounts the engine, which is how "play again" restarts. */
  const [runId, setRunId] = useState(0);
  /**
   * How the round's level reads on the HUD.
   *
   * Numbered from 1 rather than by the game's internal difficulty, because
   * several ladders do not start there — Signal Box's levels are station counts
   * beginning at 4, and "LEVEL 4" on a player's first ever round is a lie.
   */
  const [levelLabel, setLevelLabel] = useState('1');
  /**
   * Set by the tutorial button, read once by the next run.
   *
   * A ref rather than state because changing it must not itself rebuild the
   * engine — the run is restarted deliberately, by bumping `runId`, so the
   * request and the restart stay one action.
   */
  const forceTutorialRef = useRef(false);

  // --- Engine lifecycle. Recreated per run; never driven by React state.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const saved = getProgress(game.meta.id);
    // The chosen level, capped by what the player has unlocked — see
    // core/progress/unlock.ts. Derived here rather than trusting `saved.level`
    // so no stored choice can start a round above the earned ladder position.
    const floor = game.meta.minLevel ?? 1;
    const startsAt = startLevel(game.meta.id, floor, game.meta.maxLevel ?? floor);
    setLevelLabel(String(startsAt - floor + 1));
    // Read and clear: a replay request applies to exactly the run it triggered.
    const forced = forceTutorialRef.current;
    forceTutorialRef.current = false;
    // Whether this run has actually shown the tutorial, so the outcome is only
    // banked for a player who was offered it.
    let offered = false;

    setPhase('idle');
    setHud(emptyHud(game.meta.roundSeconds));
    setResult(null);
    setStage('play');
    setCountUp(null);
    setHint(null);
    setCountdown(null);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const engine = game.create(
      canvas,
      {
        onHud: setHud,
        onPhase: (p) => {
          // Bank the outcome the moment the tutorial ends — completed or
          // skipped, both are a deliberate answer, and neither should bring it
          // back unasked mid-session.
          if (p === 'tutorial') offered = true;
          else if (offered) {
            offered = false;
            const now = getProgress(game.meta.id);
            if (!now.tutorialDone) saveProgress(game.meta.id, { ...now, tutorialDone: true });
          }
          setPhase(p);
        },
        onCountdown: (n) => setCountdown(n > 0 ? n : null),
        onTutorialCaption: setHint,
        onFinish: (r) => {
          setResult(r);
          // Games without an end-of-round bonus go straight to the card;
          // otherwise they'd flash a meaningless "Score Bonus 0".
          setStage(r.bonus > 0 ? 'bonus' : 'result');
          const at = Date.now();
          // One write for the game's own progress, its round history and the
          // training calendar, so the BrainWeave Index and the streak can
          // never disagree about whether this round happened.
          recordRound(
            game.meta.id,
            {
              level: r.level,
              best: r.best,
              plays: saved.plays + 1,
              lastPlayed: at,
              tutorialDone: getProgress(game.meta.id).tutorialDone,
            },
            { l: r.level, a: r.accuracy, s: r.total, t: at },
            // Where the round started, so the store can tell what the player
            // climbed from what the level picker simply handed them.
            r.levelBefore,
          );
        },
      },
      {
        level: startsAt,
        best: saved.best,
        // Only at the bottom of the ladder, only once, and never again unless
        // asked for. A tutorial that opens at level 12 is teaching the wrong
        // thing anyway — the first rung is where the rules are simple enough
        // to be shown. Compared against the game's own floor rather than 1,
        // since Train of Thought's bottom rung is 4 stations.
        tutorial: forced || (startsAt === floor && !saved.tutorialDone),
        reducedMotion,
        colorblind: settings.colorblind,
        muted: settings.muted,
      },
    );

    engineRef.current = engine;
    if (process.env.NODE_ENV === 'development') {
      (window as unknown as Record<string, unknown>).__engine = engine;
    }
    engine.start();

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // `runId` is the restart signal; settings changes also rebuild the run.
  }, [game, runId, settings.colorblind, settings.muted]);

  // --- Bonus count-up, then the results card.
  useEffect(() => {
    if (stage !== 'bonus' || !result) return;

    let raf = 0;
    const from = result.score;
    const to = result.total;
    const t0 = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / BONUS_COUNT_MS);
      // easeOutCubic: fast at first so the number visibly "lands".
      const eased = 1 - Math.pow(1 - t, 3);
      setCountUp(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const timer = window.setTimeout(() => setStage('result'), BONUS_COUNT_MS + BONUS_HOLD_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [stage, result]);

  const pause = useCallback(() => engineRef.current?.pause(), []);
  const resume = useCallback(() => engineRef.current?.resume(), []);
  const replay = useCallback(() => setRunId((n) => n + 1), []);

  /**
   * Replay the tutorial: restart the run with it switched on.
   *
   * Restarting rather than interrupting is the point. Dropping a tutorial into
   * a round in progress would leave a half-played board and a clock that had
   * been running while the player read — the round has to begin again for the
   * lesson to be worth anything.
   */
  const replayTutorial = useCallback(() => {
    forceTutorialRef.current = true;
    setRunId((n) => n + 1);
  }, []);

  const quit = useCallback(() => {
    engineRef.current?.abort();
    onExit();
  }, [onExit]);

  /**
   * Same as quitting, one screen further out.
   *
   * Aborts first for the same reason `quit` does: the engine owns a running
   * loop and timers, and unmounting it without a word leaves that work to be
   * torn down by the effect cleanup instead of stopped deliberately.
   */
  const home = useCallback(() => {
    if (!onHome) return;
    engineRef.current?.abort();
    onHome();
  }, [onHome]);

  // Esc pauses; space resumes. Keyboard players should never need the mouse.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        phase === 'paused' ? resume() : pause();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, pause, resume]);

  const Hud = game.Hud;
  const Result = game.Result ?? ResultCard;
  const inTutorial = phase === 'tutorial';
  const showHud = !inTutorial;
  const rule = (hud.detail as { rule?: string } | undefined)?.rule;

  return (
    <div className="board">
      <canvas ref={canvasRef} />

      {showHud && (
        <TutorialControl onReplay={stage === 'play' ? replayTutorial : null}>
          <RoundLevelBadge level={levelLabel}>
            <Hud
            hud={hud}
            displayScore={stage === 'bonus' ? (countUp ?? result?.score) : undefined}
              onPause={pause}
            />
          </RoundLevelBadge>
        </TutorialControl>
      )}

      {inTutorial && (
        <>
          <div className="hud">
            <div className="hud__top">
              <button className="skip" onClick={() => engineRef.current?.skipTutorial()}>
                Skip tutorial
              </button>
            </div>
            {hint?.showModes ? (
              <div className="modes">
                <div
                  className={`mode mode--pointing${
                    rule === 'pointing' ? ' mode--active' : ''
                  }`}
                >
                  POINTING
                </div>
                <div
                  className={`mode mode--moving${rule === 'moving' ? ' mode--active' : ''}`}
                >
                  MOVING
                </div>
              </div>
            ) : (
              <div />
            )}
          </div>
          {hint && (
            <div className="tutorial">
              {hint.card ? (
                <div className="tutorial__card">{hint.text}</div>
              ) : (
                <p className="tutorial__text">{hint.text}</p>
              )}
            </div>
          )}
        </>
      )}

      {phase === 'countdown' && countdown !== null && (
        <div className="overlay">
          <div className="countdown" key={countdown}>
            {countdown}
          </div>
        </div>
      )}

      {phase === 'paused' && (
        <div className="overlay overlay--scrim">
          <div className="panel">
            <h2>Paused</h2>
            <p>{game.meta.tagline}</p>
            <button className="btn" onClick={resume}>
              Resume
            </button>
            <button className="btn btn--ghost" onClick={replay}>
              Restart round
            </button>
            <button className="btn btn--ghost" onClick={quit}>
              Quit to menu
            </button>
          </div>
        </div>
      )}

      {stage === 'bonus' && result && (
        <div className="overlay overlay--scrim">
          <div className="bonus">
            <div className="bonus__mult">×{result.maxMultiplier}</div>
            <div className="bonus__title">Score Bonus</div>
            <div className="bonus__value">{result.bonus.toLocaleString()}</div>
          </div>
        </div>
      )}

      {stage === 'result' && result && (
        <div className="overlay overlay--scrim">
          <Result
            result={result}
            title={game.meta.title}
            skill={game.meta.skill}
            debrief={game.meta.debrief}
            onReplay={replay}
            onExit={onExit}
            onHome={onHome ? home : undefined}
          />
        </div>
      )}
    </div>
  );
}
