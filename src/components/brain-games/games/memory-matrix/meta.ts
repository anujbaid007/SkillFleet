import type { GameMeta } from '../../core/types';
import { MAX_TILES, MIN_TILES } from './difficulty';

export const meta: GameMeta = {
  id: 'memory-matrix',
  title: 'Tile Trace',
  category: 'memory',
  skill: 'Spatial Recall',
  tagline: 'See the pattern. Put it back.',
  debrief:
    'You held a pattern in mind after it vanished — that is spatial recall: ' +
    'remembering where things were, not just what.',
  roundSeconds: 600,
  accent: '#5FCFC0',
  controls: 'tap',
  minLevel: MIN_TILES,
  maxLevel: MAX_TILES,
  levelLabel: (level) => `${level} TILES`,
};
