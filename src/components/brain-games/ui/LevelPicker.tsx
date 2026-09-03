'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { startLevel, unlockedLevel } from '../core/progress/unlock';
import type { CatalogueEntry } from '../games/registry';

/**
 * Level chooser.
 *
 * Ported from BrainWeave's `ui/BrainGamesHome.tsx`. Three things differ, and
 * only because this app is not that one: it takes a `CatalogueEntry` rather
 * than a loaded `GameEntry`, so opening the picker does not have to download
 * an engine first; the game's own accent stands in for BrainWeave's
 * `brainwave-secondary` token, which is what the rest of this card is painted
 * with; and the `dark:` variants are dropped, since SkillFleet has no dark
 * theme for them to answer to.
 *
 * Levels are listed by ordinal — 1, 2, 3… — with the game's own wording
 * underneath, because Tile Trace's internal level *is* its tile count and
 * "level 3" would otherwise be its first rung.
 *
 * Only levels the player has reached are selectable; the rest are shown locked
 * so the ladder ahead is visible without being enterable. See
 * `core/progress/unlock.ts` for why the gate reads `unlocked` and not `level`.
 */
export function LevelPicker({
  game,
  onClose,
  onChoose,
}: {
  game: CatalogueEntry;
  onClose: () => void;
  onChoose: (level: number) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape closes it and the page holds still underneath — the same treatment
  // ConfirmSubmitDialog and the game board itself already give their overlays.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  /*
    Read on open rather than on render of the page. These come from
    localStorage, so reading them while the card grid renders would disagree
    with the server's HTML; the picker only ever mounts on a click, which is
    after hydration.
  */
  const min = game.meta.minLevel ?? 1;
  const max = game.meta.maxLevel ?? min;
  const current = startLevel(game.meta.id, min, max);
  const unlocked = unlockedLevel(game.meta.id, min, max);
  const levels = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const cleared = unlocked - min;
  const accent = game.meta.accent;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-picker-title"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="clay-card max-h-[80vh] w-full max-w-lg overflow-y-auto p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="level-picker-title" className="font-display text-xl font-bold text-foreground">
          {game.meta.title}
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          {unlocked >= max
            ? 'Every level is open. Pick where to start.'
            : cleared === 0
              ? 'Level 1 is open. Reach level 2 in a round to unlock it.'
              : `Levels 1\u2013${cleared + 1} are open. Reach the next one in a round to unlock it.`}
        </p>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {levels.map((level) => {
            const locked = level > unlocked;
            const chosen = level === current;
            return (
              <button
                key={level}
                onClick={() => !locked && onChoose(level)}
                disabled={locked}
                aria-label={
                  locked ? `Level ${level - min + 1}, locked` : `Start at level ${level - min + 1}`
                }
                aria-current={chosen ? 'true' : undefined}
                className={`rounded-xl border px-1 py-2 text-center transition-colors ${
                  locked
                    ? 'cursor-not-allowed border-transparent bg-black/[0.04] text-muted/60'
                    : chosen
                      ? 'font-bold'
                      : 'border-black/10 bg-black/[0.03] text-foreground/80 hover:border-black/25'
                }`}
                style={
                  chosen && !locked
                    ? { background: `${accent}1F`, borderColor: accent, color: accent }
                    : undefined
                }
              >
                <b className="block text-sm">{locked ? '\u{1F512}' : level - min + 1}</b>
                {game.meta.levelLabel && (
                  <span className="block text-[9px] leading-tight opacity-70">
                    {locked ? `LVL ${level - min + 1}` : game.meta.levelLabel(level)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-muted">
          {cleared === 0
            ? 'Play a round and climb a level to open the next one.'
            : `${cleared} ${cleared === 1 ? 'level' : 'levels'} cleared of ${max - min}.`}
        </p>

        <button
          ref={closeRef}
          onClick={onClose}
          className="mt-3 w-full rounded-xl bg-black/[0.05] py-2.5 font-semibold text-foreground/70 hover:bg-black/[0.09]"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}
