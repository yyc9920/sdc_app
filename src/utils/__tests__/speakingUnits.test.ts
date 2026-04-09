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

  it('keeps long sentences as single units', () => {
    const rows = [
      makeRow(0, 'This is a longer sentence here'),
      makeRow(1, 'Another sentence with many words'),
    ];
    const units = buildSpeakingUnits(rows);
    expect(units).toHaveLength(2);
    expect(units[0].rows).toHaveLength(1);
    expect(units[1].rows).toHaveLength(1);
  });

  it('merges short sentence with next', () => {
    const rows = [
      makeRow(0, 'Hi there', '안녕'),
      makeRow(1, 'How are you doing today', '오늘 어때요'),
    ];
    const units = buildSpeakingUnits(rows);
    expect(units).toHaveLength(1);
    expect(units[0].rows).toHaveLength(2);
    expect(units[0].combinedEnglish).toBe('Hi there How are you doing today');
    expect(units[0].combinedKorean).toBe('안녕 오늘 어때요');
    expect(units[0].startIndex).toBe(0);
    expect(units[0].endIndex).toBe(1);
  });

  it('does not merge last short sentence if no next row', () => {
    const rows = [
      makeRow(0, 'Long enough sentence here yes'),
      makeRow(1, 'OK'),
    ];
    const units = buildSpeakingUnits(rows);
    expect(units).toHaveLength(2);
    expect(units[1].rows).toHaveLength(1);
    expect(units[1].combinedEnglish).toBe('OK');
  });

  it('handles consecutive short sentences by merging pairs', () => {
    const rows = [
      makeRow(0, 'Yes'),
      makeRow(1, 'Sure thing'),
      makeRow(2, 'OK'),
      makeRow(3, 'That works perfectly fine'),
    ];
    const units = buildSpeakingUnits(rows);
    // "Yes" + "Sure thing" = unit 1
    // "OK" + "That works perfectly fine" = unit 2
    expect(units).toHaveLength(2);
    expect(units[0].combinedEnglish).toBe('Yes Sure thing');
    expect(units[1].combinedEnglish).toBe('OK That works perfectly fine');
  });
});
