import { AllAnomyStats, AnomySlot, NormalInstrument } from './types';

export const STORAGE_KEY = 'anomyStats_v3';

export const DEFAULT_STATS: AllAnomyStats = {
  anomy_1: { softness: 0, echo: 0, brightness: 0 },
  anomy_2: { softness: 0, echo: 0, brightness: 0 },
};

export const ANOMY_SLOTS: AnomySlot[] = [
  { id: 'anomy_1', name: 'アノミー1', type: 'anomy', icon: '/images/anomy1icon.png', growImg: '/images/anomy1.png' },
  { id: 'anomy_2', name: 'アノミー2', type: 'anomy', icon: '/images/anomy2icon.png', growImg: '/images/anomy2.png' },
];

export const NORMAL_INSTRUMENTS: NormalInstrument[] = [
  { id: 'clap', name: 'クラップ', type: 'instrument', icon: '/images/gakkiicon.png' },
  { id: 'water', name: 'Water', type: 'instrument', icon: '/images/gakkiicon.png' },
];

export const INSTRUMENT_DEFINITIONS: Record<string, { type: 'sample'; file: string }> = {
  clap: { type: 'sample', file: '/instruments/clap.mp3' },
  water: { type: 'sample', file: '/instruments/water.wav' },
};

export function findItemById(id: string) {
  return [...ANOMY_SLOTS, ...NORMAL_INSTRUMENTS].find(item => item.id === id);
}
