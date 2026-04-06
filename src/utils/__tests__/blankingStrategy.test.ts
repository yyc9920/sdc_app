import { describe, it, expect } from 'vitest';
import { getVisibleIndices, getSentenceDisplay } from '../blankingStrategy';

describe('getVisibleIndices', () => {
  it('round 1: returns all indices', () => {
    const result = getVisibleIndices(1, [1, 3], 5);
    expect(result).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it('round 2: hides key expression indices', () => {
    const result = getVisibleIndices(2, [1, 3], 5);
    expect(result).toEqual(new Set([0, 2, 4]));
  });

  it('round 3: same as round 2 (hides key expressions)', () => {
    const result = getVisibleIndices(3, [1, 3], 5);
    expect(result).toEqual(new Set([0, 2, 4]));
  });

  it('round 4: returns empty set (all blanked)', () => {
    const result = getVisibleIndices(4, [1, 3], 5);
    expect(result).toEqual(new Set());
  });

  it('empty keyIndices: round 2/3 returns all visible', () => {
    const result = getVisibleIndices(2, [], 4);
    expect(result).toEqual(new Set([0, 1, 2, 3]));
  });

  it('totalWords = 0: returns empty set for all rounds', () => {
    expect(getVisibleIndices(1, [], 0)).toEqual(new Set());
    expect(getVisibleIndices(2, [0], 0)).toEqual(new Set());
    expect(getVisibleIndices(4, [], 0)).toEqual(new Set());
  });

  it('keyIndices out of range: no error', () => {
    const result = getVisibleIndices(2, [10, 20], 3);
    expect(result).toEqual(new Set([0, 1, 2]));
  });
});

describe('getSentenceDisplay', () => {
  it('round 1: all words visible', () => {
    const result = getSentenceDisplay('Hello world', 1, [0, 1]);
    expect(result).toEqual([
      { word: 'Hello', visible: true, index: 0 },
      { word: 'world', visible: true, index: 1 },
    ]);
  });

  it('round 2: key words hidden', () => {
    const result = getSentenceDisplay('I love coding', 2, [1, 2]);
    expect(result[0].visible).toBe(true);  // "I" visible
    expect(result[1].visible).toBe(false); // "love" hidden
    expect(result[2].visible).toBe(false); // "coding" hidden
  });

  it('round 4: all words hidden', () => {
    const result = getSentenceDisplay('Hello world', 4, []);
    expect(result.every(w => !w.visible)).toBe(true);
  });

  it('preserves original word text including punctuation', () => {
    const result = getSentenceDisplay('Hello, world!', 1, []);
    expect(result[0].word).toBe('Hello,');
    expect(result[1].word).toBe('world!');
  });

  it('index property matches position', () => {
    const result = getSentenceDisplay('a b c d', 1, []);
    result.forEach((item, i) => {
      expect(item.index).toBe(i);
    });
  });

  it('single word sentence', () => {
    const result = getSentenceDisplay('Hello', 2, [0]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ word: 'Hello', visible: false, index: 0 });
  });

  it('empty string returns single empty word entry', () => {
    const result = getSentenceDisplay('', 1, []);
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe('');
  });
});
