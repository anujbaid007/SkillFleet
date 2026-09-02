import type { GameMeta } from '../../core/types';
import { MAX_TILES, MIN_TILES } from './difficulty';

export const meta: GameMeta = {
  id: 'memory-matrix',
  title: 'Tile Trace',
  category: 'memory',
  skill: 'Spatial Recall',
  tagline: 'See the pattern. Put it back.',
  debrief:
    'In this game you held a pattern of tiles in mind after it vanished and ' +
    'rebuilt it from memory — a workout for Spatial Recall. Spatial recall is ' +
    'how you keep track of where things are: the row you parked in, the shape ' +
    'of a room you walked through once, where a word sat on a page.',
  roundSeconds: 600,
  accent: '#5FCFC0',
  controls: 'tap',
  minLevel: MIN_TILES,
  maxLevel: MAX_TILES,
  levelLabel: (level) => `${level} TILES`,
};
