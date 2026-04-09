import { describe, it, expect } from 'vitest';
import { computeGroups, computeSpeakerColors } from '../useRepetition';
import type { TrainingRow } from '../training/types';

function makeRow(rowSeq: number, rowType: TrainingRow['rowType'], speaker = ''): TrainingRow {
  return {
    id: rowSeq,
    english: `Sentence ${rowSeq}`,
    koreanPronounce: '',
    directComprehension: '',
    comprehension: '',
    speaker,
    note: '',
    rowType,
    rowSeq,
  };
}

describe('computeGroups', () => {
  it('returns empty array for empty input', () => {
    expect(computeGroups([])).toEqual([]);
  });

  it('groups all-script rows into single group with null prompt', () => {
    const rows = [makeRow(0, 'script'), makeRow(1, 'script')];
    const groups = computeGroups(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].prompt).toBeNull();
    expect(groups[0].items).toHaveLength(2);
  });

  it('puts a leading prompt as the group header', () => {
    const rows = [makeRow(0, 'prompt'), makeRow(1, 'script'), makeRow(2, 'script')];
    const groups = computeGroups(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].prompt?.rowSeq).toBe(0);
    expect(groups[0].items).toHaveLength(2);
  });

  it('splits into multiple groups on each prompt boundary', () => {
    const rows = [
      makeRow(0, 'prompt'),
      makeRow(1, 'script'),
      makeRow(2, 'prompt'),
      makeRow(3, 'script'),
      makeRow(4, 'script'),
    ];
    const groups = computeGroups(rows);
    expect(groups).toHaveLength(2);
    expect(groups[0].prompt?.rowSeq).toBe(0);
    expect(groups[0].items).toHaveLength(1);
    expect(groups[1].prompt?.rowSeq).toBe(2);
    expect(groups[1].items).toHaveLength(2);
  });

  it('creates an ungrouped first group for scripts before the first prompt', () => {
    const rows = [makeRow(0, 'script'), makeRow(1, 'prompt'), makeRow(2, 'script')];
    const groups = computeGroups(rows);
    expect(groups).toHaveLength(2);
    expect(groups[0].prompt).toBeNull();
    expect(groups[0].items[0].rowSeq).toBe(0);
    expect(groups[1].prompt?.rowSeq).toBe(1);
    expect(groups[1].items[0].rowSeq).toBe(2);
  });

  it('includes reading rows in items alongside script rows', () => {
    const rows = [makeRow(0, 'script'), makeRow(1, 'reading')];
    const groups = computeGroups(rows);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[0].items[0].rowType).toBe('script');
    expect(groups[0].items[1].rowType).toBe('reading');
  });

  it('silently skips unsupported row types (vocab, meta, etc.)', () => {
    const rows = [makeRow(0, 'script'), makeRow(1, 'vocab'), makeRow(2, 'script')];
    const groups = computeGroups(rows);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[0].items.every(r => r.rowType !== 'vocab')).toBe(true);
  });

  it('handles a standalone prompt with no following scripts', () => {
    const rows = [makeRow(0, 'prompt')];
    const groups = computeGroups(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].prompt?.rowSeq).toBe(0);
    expect(groups[0].items).toHaveLength(0);
  });

  it('handles two consecutive prompts (second starts a new group)', () => {
    const rows = [makeRow(0, 'prompt'), makeRow(1, 'prompt'), makeRow(2, 'script')];
    const groups = computeGroups(rows);
    expect(groups).toHaveLength(2);
    expect(groups[0].prompt?.rowSeq).toBe(0);
    expect(groups[0].items).toHaveLength(0);
    expect(groups[1].prompt?.rowSeq).toBe(1);
    expect(groups[1].items).toHaveLength(1);
  });
});

describe('computeSpeakerColors', () => {
  it('returns empty map for empty speakers', () => {
    expect(computeSpeakerColors([])).toEqual({});
  });

  it('assigns distinct colors to different speakers', () => {
    const colors = computeSpeakerColors(['Alice', 'Bob']);
    expect(colors['Alice']).toBeDefined();
    expect(colors['Bob']).toBeDefined();
    expect(colors['Alice']).not.toBe(colors['Bob']);
  });

  it('wraps colors when there are more speakers than color slots', () => {
    const many = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const colors = computeSpeakerColors(many);
    // 6 slots total → 7th speaker wraps to same color as 1st
    expect(colors['G']).toBe(colors['A']);
  });

  it('assigns a string color to each speaker', () => {
    const colors = computeSpeakerColors(['Alex', 'Sam', 'Jordan']);
    expect(typeof colors['Alex']).toBe('string');
    expect(typeof colors['Sam']).toBe('string');
    expect(typeof colors['Jordan']).toBe('string');
  });
});
