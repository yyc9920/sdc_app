import { describe, it, expect } from 'vitest';
import { buildSpeakingUnits } from '../speakingUnits';
import type { TrainingRow } from '../../hooks/training/types';

function makeRow(id: number, english: string, comprehension = ''): TrainingRow {
  return {
    id,
    english,
    koreanPronounce: '',
    directComprehension: '',
    comprehension,
    rowType: 'script',
    rowSeq: id,
    speaker: '',
    note: '',
  };
}

describe('buildSpeakingUnits', () => {
  it('returns empty for empty input', () => {
    expect(buildSpeakingUnits([])).toEqual([]);
  });

  it('creates one unit per row', () => {
    const rows = [
      makeRow(0, 'This is a longer sentence here'),
      makeRow(1, 'Another sentence with many words'),
    ];
    const units = buildSpeakingUnits(rows);
    expect(units).toHaveLength(2);
    expect(units[0].rows).toHaveLength(1);
    expect(units[0].combinedEnglish).toBe('This is a longer sentence here');
    expect(units[1].rows).toHaveLength(1);
    expect(units[1].combinedEnglish).toBe('Another sentence with many words');
  });

  it('short sentences are NOT merged — each is its own unit', () => {
    const rows = [
      makeRow(0, 'Hi there', '안녕'),
      makeRow(1, 'How are you doing today', '오늘 어때요'),
    ];
    const units = buildSpeakingUnits(rows);
    expect(units).toHaveLength(2);
    expect(units[0].combinedEnglish).toBe('Hi there');
    expect(units[1].combinedEnglish).toBe('How are you doing today');
  });

  it('preserves startIndex and endIndex per row', () => {
    const rows = [
      makeRow(0, 'Yes'),
      makeRow(1, 'Sure thing'),
      makeRow(2, 'OK'),
    ];
    const units = buildSpeakingUnits(rows);
    expect(units).toHaveLength(3);
    expect(units[0].startIndex).toBe(0);
    expect(units[0].endIndex).toBe(0);
    expect(units[1].startIndex).toBe(1);
    expect(units[1].endIndex).toBe(1);
    expect(units[2].startIndex).toBe(2);
    expect(units[2].endIndex).toBe(2);
  });

  it('preserves Korean comprehension', () => {
    const rows = [
      makeRow(0, 'Hello', '안녕하세요'),
      makeRow(1, 'Bye', '안녕히 가세요'),
    ];
    const units = buildSpeakingUnits(rows);
    expect(units[0].combinedKorean).toBe('안녕하세요');
    expect(units[1].combinedKorean).toBe('안녕히 가세요');
  });
});
