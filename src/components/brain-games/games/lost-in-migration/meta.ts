import type { GameMeta } from '../../core/types';

export const meta: GameMeta = {
  id: 'lost-in-migration',
  title: 'Lead Bird',
  category: 'attention',
  skill: 'Selective Attention',
  tagline: 'Follow the middle bird. Ignore the flock.',
  debrief:
    'In this game you answered for the middle bird while the birds around it ' +
    'pulled the other way — a workout for Selective Attention. Selective ' +
    'attention is what lets you hold on to what matters and let distractions ' +
    'go past, whether that is a conversation in a noisy room or one line in a ' +
    'crowded screen.',
  roundSeconds: 45,
  accent: '#28C4D6',
  controls: 'swipe',
  minLevel: 1,
  maxLevel: 20,
};
