/** Per-game persistence: level reached, best score, games played, round history. */

import { ladderOf, type AgeBand } from '../score/norms';

const KEY = 'brain-games:progress:v1';

/**
 * One finished round, kept so the BrainWeave Index can be recomputed rather
 * than merely accumulated.
 *
 * The raw inputs are stored, not the index they produced. Norms are the part
 * of the index most likely to change — they are seeded from ladder design
 * today and will be replaced by measured ones — and a stored index would
 * freeze the old norm into a player's history for ever. Storing level and
 * accuracy means a norm revision re-reads every past round correctly.
 */
export interface RoundLog {
  /** Level played at. Kept for the game's own history, not for the index. */
  l: number;
  /**
   * **Earned** level after this round — the staircase position, which is what
   * the index reads.
   *
   * The two differ because the level picker lets a player start anywhere. A
   * level you chose is an assertion; only the movement a round produces is
   * evidence. See `earnedAfter`.
   */
  e: number;
  /** Accuracy, 0..1. */
  a: number;
  /** Round score, for the game's own leaderboard rather than the index. */
  s: number;
  /** Finished at, epoch ms. */
  t: number;
}

/** Rounds kept per game. Ten feed the index; the rest draw the history graph. */
export const HISTORY_CAP = 40;

export interface GameProgress {
  /** The level play starts at. The picker writes this; the index ignores it. */
  level: number;
  /** The staircase position the player has actually climbed to. */
  earned: number;
  /**
   * The highest level ever reached — a high-water mark that never falls.
   *
   * Deliberately not `earned`. `earned` is the index's view of a player and is
   * *meant* to drop when a round goes badly, but levels are content: once a
   * player has opened level 8, replaying level 1 must not take levels 3-8 back
   * off them. Optional so stores written before this existed still parse; the
   * unlock helpers fall back to `earned` for those.
   */
  unlocked?: number;
  /**
   * Whether the player has been through the tutorial for this game.
   *
   * Set when the tutorial ends, whether it ran to completion or the player
   * skipped it — both are a deliberate outcome, and neither should lead to
   * the tutorial appearing again unasked. It is only ever replayed on
   * request, from the button in the top bar.
   */
  tutorialDone: boolean;
  best: number;
  plays: number;
  lastPlayed: number;
  /** Newest first. */
  history: RoundLog[];
}

export interface Settings {
  muted: boolean;
  colorblind: boolean;
}

/**
 * Who is playing, for age-banded percentiles.
 *
 * The band is optional and stays optional: the index and every area work
 * without it, and only the "how you compare" panel needs it. Asking for a date
 * of birth to show one panel would be collecting more than the feature earns.
 */
export interface Profile {
  ageBand: AgeBand | null;
  /** First launch, epoch ms. */
  joined: number;
  /** ISO date (YYYY-MM-DD) to rounds played that day. */
  days: Record<string, number>;
}

/** Days of the training calendar retained. Four weeks shown, more kept. */
export const CALENDAR_DAYS = 120;

interface Store {
  games: Record<string, GameProgress>;
  settings: Settings;
  profile: Profile;
}

const DEFAULT_PROGRESS: GameProgress = {
  level: 1,
  earned: 0,
  unlocked: 0,
  tutorialDone: false,
  best: 0,
  plays: 0,
  lastPlayed: 0,
  history: [],
};
const DEFAULT_SETTINGS: Settings = { muted: false, colorblind: false };

function defaultProfile(): Profile {
  return { ageBand: null, joined: Date.now(), days: {} };
}

/** Local calendar date, not UTC — a streak is about the player's own days. */
export function dayKey(at: number): string {
  const d = new Date(at);
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { games: {}, settings: { ...DEFAULT_SETTINGS }, profile: defaultProfile() };
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      games: parsed.games ?? {},
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      profile: { ...defaultProfile(), ...(parsed.profile ?? {}) },
    };
  } catch {
    // Private-mode Safari and disabled storage both land here; play on
    // without persistence rather than failing to boot.
    return { games: {}, settings: { ...DEFAULT_SETTINGS }, profile: defaultProfile() };
  }
}

/**
 * Notified after every successful write, so a sync layer can mirror the store
 * without this module having to know one exists. Keeping the dependency
 * pointing this way is deliberate: Storage stays free of Firebase and can still
 * run under Node in the audit.
 */
type StoreListener = () => void;
const listeners = new Set<StoreListener>();

export function onStoreChange(fn: StoreListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function write(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage full or unavailable — progress is best-effort */
  }
  // Outside the try: a listener throwing is its own problem, and a full disk
  // should not also stop the mirror from being told what changed.
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* a broken listener must not break gameplay */
    }
  }
}

/** The whole store, for the sync layer to upload. */
export function readStore(): Store {
  return read();
}

/** Replace the whole store, used when a merge with the server produces one. */
export function replaceStore(next: Store): void {
  write(next);
}

export type { Store };

export function getProgress(gameId: string): GameProgress {
  const saved = read().games[gameId];
  // Spread first so a store written before history existed still reads back
  // with an array rather than undefined.
  return { ...DEFAULT_PROGRESS, ...(saved ?? {}), history: saved?.history ?? [] };
}

export function saveProgress(gameId: string, next: GameProgress): void {
  const store = read();
  store.games[gameId] = next;
  write(store);
}

/** Every game that has been played at least once. */
export function allProgress(): Record<string, GameProgress> {
  const games = read().games;
  const out: Record<string, GameProgress> = {};
  for (const [id, p] of Object.entries(games)) {
    out[id] = { ...DEFAULT_PROGRESS, ...p, history: p.history ?? [] };
  }
  return out;
}

/**
 * The staircase position after a round.
 *
 * The player may start a round anywhere — the level picker exists so a game can
 * be practised at a chosen difficulty. That makes the *absolute* level an
 * assertion rather than a measurement, and an index built on it reads "I
 * selected level 20" as "I can sustain level 20".
 *
 * Two failure modes have to be avoided at once, and they pull in opposite
 * directions. Crediting the picked level lets anyone buy a top index. Debiting
 * the fall from a picked level punishes the honest player who stretches, since
 * picking a level above your reach guarantees a fall — the picker would become
 * a trap that quietly wrecks the index of anyone using it as intended.
 *
 * So the rule turns on whether the round was played above the player's own
 * position:
 *
 * - **A stretch** (started above where they have climbed to) is worth one rung
 *   if they held or improved on it, and costs nothing if they did not. Falling
 *   off a height the picker handed them is not evidence of anything.
 * - **An ordinary round** (started at or below their position) moves by what it
 *   demonstrated, held to the level actually reached — so a big climb from an
 *   easy start cannot credit more than where it finished.
 */
export function earnedAfter(gameId: string, before: number, level: number, levelBefore: number) {
  const ladder = ladderOf(gameId);
  const floor = ladder?.min ?? 1;
  const ceiling = ladder?.max ?? Number.MAX_SAFE_INTEGER;
  const earned = Math.max(floor, before || floor);

  if (levelBefore > earned) {
    return level >= levelBefore ? Math.min(ceiling, earned + 1) : earned;
  }

  const moved = earned + (level - levelBefore);
  return Math.max(floor, Math.min(ceiling, Math.min(moved, level)));
}

/**
 * Record a finished round: the game's own progress, its history, and the day
 * it happened on. One write, so a crash cannot leave the calendar disagreeing
 * with the history.
 */
export function recordRound(
  gameId: string,
  next: Omit<GameProgress, 'history' | 'earned'>,
  round: Omit<RoundLog, 'e'>,
  levelBefore: number,
): void {
  const store = read();
  const prior = store.games[gameId]?.history ?? [];
  const earned = earnedAfter(gameId, store.games[gameId]?.earned ?? 0, round.l, levelBefore);
  // The unlock mark only ever rises: see `unlocked` on GameProgress.
  const floor = ladderOf(gameId)?.min ?? 1;
  const unlocked = Math.max(
    store.games[gameId]?.unlocked ?? floor,
    earned,
    round.l,
    floor,
  );
  store.games[gameId] = {
    ...next,
    earned,
    unlocked,
    history: [{ ...round, e: earned }, ...prior].slice(0, HISTORY_CAP),
  };

  const profile = { ...defaultProfile(), ...store.profile };
  const key = dayKey(round.t);
  const days = { ...profile.days, [key]: (profile.days[key] ?? 0) + 1 };
  const cutoff = dayKey(round.t - CALENDAR_DAYS * 86400000);
  for (const d of Object.keys(days)) if (d < cutoff) delete days[d];
  store.profile = { ...profile, days };

  write(store);
}

export function getSettings(): Settings {
  return read().settings;
}

export function saveSettings(next: Partial<Settings>): Settings {
  const store = read();
  store.settings = { ...store.settings, ...next };
  write(store);
  return store.settings;
}

export function getProfile(): Profile {
  return read().profile;
}

export function saveProfile(next: Partial<Profile>): Profile {
  const store = read();
  store.profile = { ...store.profile, ...next };
  write(store);
  return store.profile;
}
