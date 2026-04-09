// src/hooks/training/__tests__/dataAdapter.test.ts
import { describe, it, expect } from 'vitest';
import {
  filterRowsForMode,
  getSupportedModes,
  assignSpeakerVoices,
  toTrainingRow,
} from '../dataAdapter';
import type { SentenceData, RowType } from '../../../types';
import type { TrainingRow } from '../types';

function makeSentence(overrides: Partial<SentenceData> & { rowType: RowType; rowSeq?: number }): SentenceData {
  return {
    id: 1,
    english: 'Hello',
    koreanPronounce: '헬로',
    directComprehension: '안녕',
    comprehension: '안녕하세요',
    ...overrides,
  };
}

describe('toTrainingRow', () => {
  it('converts SentenceData to TrainingRow with defaults', () => {
    const sentence = makeSentence({ rowType: 'script' });
    const row = toTrainingRow(sentence, 0);
    expect(row.rowType).toBe('script');
    expect(row.rowSeq).toBe(0);
    expect(row.speaker).toBe('');
    expect(row.note).toBe('');
  });

  it('preserves existing speaker and note', () => {
    const sentence = makeSentence({ rowType: 'script', speaker: 'Phil', note: 'emphasis' });
    const row = toTrainingRow(sentence, 3);
    expect(row.speaker).toBe('Phil');
    expect(row.note).toBe('emphasis');
    expect(row.rowSeq).toBe(3);
  });
});

describe('filterRowsForMode', () => {
  const rows: TrainingRow[] = [
    { ...makeSentence({ id: 1, rowType: 'prompt' }), rowSeq: 0, speaker: '', note: '' } as TrainingRow,
    { ...makeSentence({ id: 2, rowType: 'script', speaker: 'Phil' }), rowSeq: 1, speaker: 'Phil', note: '' } as TrainingRow,
    { ...makeSentence({ id: 3, rowType: 'script', speaker: 'Feifei' }), rowSeq: 2, speaker: 'Feifei', note: '' } as TrainingRow,
    { ...makeSentence({ id: 4, rowType: 'vocab' }), rowSeq: 3, speaker: '', note: '' } as TrainingRow,
    { ...makeSentence({ id: 5, rowType: 'reading' }), rowSeq: 4, speaker: '', note: '' } as TrainingRow,
    { ...makeSentence({ id: 6, rowType: 'expression' }), rowSeq: 5, speaker: '', note: '' } as TrainingRow,
  ];

  it('filters for repetition mode (script + reading)', () => {
    const filtered = filterRowsForMode(rows, 'repetition');
    expect(filtered.map(r => r.id)).toEqual([2, 3, 5]);
  });

  it('filters for infiniteSpeaking mode (script only)', () => {
    const filtered = filterRowsForMode(rows, 'infiniteSpeaking');
    expect(filtered.map(r => r.id)).toEqual([2, 3]);
  });

  it('filters for vocab mode (vocab + expression)', () => {
    const filtered = filterRowsForMode(rows, 'vocab');
    expect(filtered.map(r => r.id)).toEqual([4, 6]);
  });

  it('filters for freeResponse mode (prompt + script)', () => {
    const filtered = filterRowsForMode(rows, 'freeResponse');
    expect(filtered.map(r => r.id)).toEqual([1, 2, 3]);
  });

  it('filters for rolePlay mode (script with 2+ speakers)', () => {
    const filtered = filterRowsForMode(rows, 'rolePlay');
    expect(filtered.map(r => r.id)).toEqual([2, 3]);
  });
});

describe('getSupportedModes', () => {
  it('returns all basic modes for script-only rows', () => {
    const rows: TrainingRow[] = [
      { ...makeSentence({ id: 1, rowType: 'script' }), rowSeq: 0, speaker: '', note: '' } as TrainingRow,
    ];
    const modes = getSupportedModes(rows);
    expect(modes).toContain('repetition');
    expect(modes).toContain('speedListening');
    expect(modes).toContain('infiniteSpeaking');
    expect(modes).not.toContain('rolePlay');
    expect(modes).not.toContain('vocab');
    expect(modes).not.toContain('freeResponse');
  });

  it('includes rolePlay when 2+ unique speakers exist', () => {
    const rows: TrainingRow[] = [
      { ...makeSentence({ id: 1, rowType: 'script', speaker: 'A' }), rowSeq: 0, speaker: 'A', note: '' } as TrainingRow,
      { ...makeSentence({ id: 2, rowType: 'script', speaker: 'B' }), rowSeq: 1, speaker: 'B', note: '' } as TrainingRow,
    ];
    const modes = getSupportedModes(rows);
    expect(modes).toContain('rolePlay');
  });

  it('includes vocab when vocab or expression rows exist', () => {
    const rows: TrainingRow[] = [
      { ...makeSentence({ id: 1, rowType: 'vocab' }), rowSeq: 0, speaker: '', note: '' } as TrainingRow,
    ];
    const modes = getSupportedModes(rows);
    expect(modes).toContain('vocab');
  });

  it('includes freeResponse when prompt + script rows exist', () => {
    const rows: TrainingRow[] = [
      { ...makeSentence({ id: 1, rowType: 'prompt' }), rowSeq: 0, speaker: '', note: '' } as TrainingRow,
      { ...makeSentence({ id: 2, rowType: 'script' }), rowSeq: 1, speaker: '', note: '' } as TrainingRow,
    ];
    const modes = getSupportedModes(rows);
    expect(modes).toContain('freeResponse');
  });
});

describe('assignSpeakerVoices', () => {
  it('assigns alternating male/female voices to speakers', () => {
    const map = assignSpeakerVoices(['Phil', 'Feifei']);
    expect(Object.keys(map)).toHaveLength(2);
    expect(map['Phil']).toBe('male1');
    expect(map['Feifei']).toBe('female1');
  });

  it('returns empty map for no speakers', () => {
    const map = assignSpeakerVoices([]);
    expect(map).toEqual({});
  });

  it('handles single speaker', () => {
    const map = assignSpeakerVoices(['narrator']);
    expect(map['narrator']).toBe('male1');
  });

  it('cycles through voices for many speakers', () => {
    const map = assignSpeakerVoices(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(Object.keys(map)).toHaveLength(7);
  });
});
