import type { GameMeta } from '../../core/types';
import { MAX_LEVEL, MIN_LEVEL } from './difficulty';

export const meta: GameMeta = {
  id: 'color-match',
  title: 'Colour Clash',
  category: 'flexibility',
  skill: 'Response Inhibition',
  tagline: 'Read the top. Look at the bottom.',
  debrief:
    'You answered the colour while the word said otherwise — that is response ' +
    'inhibition: overriding the answer that arrives first.',
  roundSeconds: 45,
  accent: '#E0362F',
  controls: 'tap',
  minLevel: MIN_LEVEL,
  maxLevel: MAX_LEVEL,
};
