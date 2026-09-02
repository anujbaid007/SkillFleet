import type { ComponentType } from 'react';
import type { GameMeta } from '../core/types';
import type { GameEngine, EngineHooks, EngineOptions } from '../core/engine/GameEngine';
import type { GameHudProps, GameResultProps } from '../core/ui/HudFrame';

// Only the metas are imported eagerly. They are plain data — see the note on
// CATALOGUE for why nothing else here may be.
import { meta as memoryMatrixMeta } from './memory-matrix/meta';
import { meta as colorMatchMeta } from './color-match/meta';
import { meta as lostInMigrationMeta } from './lost-in-migration/meta';

export type EngineFactory = (
  canvas: HTMLCanvasElement,
  hooks: EngineHooks,
  options: EngineOptions,
) => GameEngine;

export interface GameEntry {
  meta: GameMeta;
  create: EngineFactory;
  /** Per-game HUD. Games differ enough that this is not worth generalising. */
  Hud: ComponentType<GameHudProps>;
  /** Optional bespoke results card; falls back to the platform default. */
  Result?: ComponentType<GameResultProps>;
}

export interface CatalogueEntry {
  meta: GameMeta;
  /** The engine and its HUD, fetched the first time the game is opened. */
  load: () => Promise<GameEntry>;
}

/**
 * The Puzzle Master practice catalogue: one game from each of three
 * categories, ported unchanged from BrainWeave.
 *
 * The engines are behind `load()` rather than imported at the top of this
 * file, for two reasons. The binding one is correctness: a client component is
 * still rendered on the server for the initial HTML, so its whole module graph
 * is evaluated under Node — and `lost-in-migration/flock.ts` builds a `Path2D`
 * at module scope, which does not exist there. Importing the engines eagerly
 * would crash the page's server render. Deferring them to a click means they
 * are only ever evaluated in a browser, and leaves the games byte-identical to
 * their source. The happy consequence is that a page most students only read
 * no longer ships three canvas engines to open.
 */
export const CATALOGUE: CatalogueEntry[] = [
  {
    meta: memoryMatrixMeta,
    load: async () => {
      const [{ MemoryMatrixEngine }, { MmHud }, { MmResult }] = await Promise.all([
        import('./memory-matrix/MemoryMatrixEngine'),
        import('./memory-matrix/MmHud'),
        import('./memory-matrix/MmResult'),
      ]);
      return {
        meta: memoryMatrixMeta,
        create: (canvas, hooks, options) => new MemoryMatrixEngine(canvas, hooks, options),
        Hud: MmHud,
        Result: MmResult,
      };
    },
  },
  {
    meta: colorMatchMeta,
    load: async () => {
      const [{ ColorMatchEngine }, { CmHud }] = await Promise.all([
        import('./color-match/ColorMatchEngine'),
        import('./color-match/CmHud'),
      ]);
      return {
        meta: colorMatchMeta,
        create: (canvas, hooks, options) => new ColorMatchEngine(canvas, hooks, options),
        Hud: CmHud,
      };
    },
  },
  {
    meta: lostInMigrationMeta,
    load: async () => {
      const [{ LostInMigrationEngine }, { LimHud }] = await Promise.all([
        import('./lost-in-migration/LostInMigrationEngine'),
        import('./lost-in-migration/LimHud'),
      ]);
      return {
        meta: lostInMigrationMeta,
        create: (canvas, hooks, options) => new LostInMigrationEngine(canvas, hooks, options),
        Hud: LimHud,
      };
    },
  },
];

export function getCatalogueEntry(id: string): CatalogueEntry | undefined {
  return CATALOGUE.find((g) => g.meta.id === id);
}

export const CATEGORY_LABEL: Record<GameMeta['category'], string> = {
  speed: 'Speed',
  memory: 'Memory',
  attention: 'Attention',
  flexibility: 'Flexibility',
  'mind-challenge': 'Mind Challenge',
  math: 'Math',
  language: 'Language',
};

/** The order used to present the catalogue. */
export const CATEGORY_ORDER: GameMeta['category'][] = [
  'attention',
  'flexibility',
  'mind-challenge',
  'language',
  'math',
  'memory',
  'speed',
];
