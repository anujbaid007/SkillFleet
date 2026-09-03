import type { GameMeta } from '../../core/types';
import { MAX_LEVEL, MIN_LEVEL } from './difficulty';

export const meta: GameMeta = {
  id: 'lost-in-migration',
  title: 'Lead Bird',
  category: 'attention',
  skill: 'Selective Attention',
  tagline: 'Follow the middle bird. Ignore the flock.',
  debrief:
    'You answered for the middle bird while the flock pulled the other way — ' +
    'that is selective attention: holding on to what matters and letting the ' +
    'rest go past.',
  roundSeconds: 45,
  accent: '#28C4D6',
  controls: 'swipe',
  minLevel: MIN_LEVEL,
  maxLevel: MAX_LEVEL,
};
