// src/hooks/training/dataAdapter.ts
import type { RowType, TrainingMode, SentenceData } from '../../types';
import type { TrainingRow, VoiceKey } from './types';

export const MODE_ROW_FILTERS: Record<TrainingMode, RowType[]> = {
  repetition: ['script', 'reading'],
  speedListening: ['script', 'reading'],
  infiniteSpeaking: ['script'],
  rolePlay: ['script'],
  vocab: ['vocab', 'expression'],
  freeResponse: ['prompt', 'script'],
};

const VOICE_ROTATION: VoiceKey[] = ['male1', 'female1', 'male2', 'female2', 'male3', 'female3'];

export function toTrainingRow(sentence: SentenceData, index: number): TrainingRow {
  return {
    ...sentence,
    rowType: sentence.rowType ?? 'script',
    rowSeq: index,
    speaker: sentence.speaker ?? '',
    note: sentence.note ?? '',
  };
}

export function filterRowsForMode(rows: TrainingRow[], mode: TrainingMode): TrainingRow[] {
  const allowedTypes = MODE_ROW_FILTERS[mode];
  const filtered = rows.filter(r => allowedTypes.includes(r.rowType));

  if (mode === 'rolePlay') {
    const speakers = new Set(filtered.map(r => r.speaker).filter(Boolean));
    if (speakers.size < 2) return [];
  }

  return filtered;
}

export function getSupportedModes(rows: TrainingRow[]): TrainingMode[] {
  const modes: TrainingMode[] = [];
  const rowTypes = new Set(rows.map(r => r.rowType));
  const speakers = new Set(rows.filter(r => r.rowType === 'script').map(r => r.speaker).filter(Boolean));

  if (rowTypes.has('script') || rowTypes.has('reading')) {
    modes.push('repetition');
  }
  if (rowTypes.has('script') || rowTypes.has('reading')) {
    modes.push('speedListening');
  }
  if (rowTypes.has('script')) {
    modes.push('infiniteSpeaking');
  }
  if (rowTypes.has('script') && speakers.size >= 2) {
    modes.push('rolePlay');
  }
  if (rowTypes.has('vocab') || rowTypes.has('expression')) {
    modes.push('vocab');
  }
  if (rowTypes.has('prompt') && rowTypes.has('script')) {
    modes.push('freeResponse');
  }

  return modes;
}

export function assignSpeakerVoices(speakers: string[]): Record<string, VoiceKey> {
  const map: Record<string, VoiceKey> = {};
  speakers.forEach((speaker, i) => {
    map[speaker] = VOICE_ROTATION[i % VOICE_ROTATION.length];
  });
  return map;
}
