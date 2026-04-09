// src/hooks/__tests__/useVocab.test.ts
import { describe, it, expect } from 'vitest';
import {
  filterVocabRows,
  findContextRows,
  buildPracticeOptions,
  computeScore,
  computeNextReview,
} from '../useVocab';
import type { TrainingRow } from '../training';
import type { RowType } from '../../types';
import type { VocabItemResult } from '../useVocab';

function makeRow(id: number, rowType: RowType, english: string): TrainingRow {
  return {
    id,
    rowType,
    rowSeq: id,
    speaker: '',
    note: '',
    english,
    koreanPronounce: '',
    directComprehension: '',
    comprehension: `Korean meaning of ${english}`,
  };
}

const vocabRow1 = makeRow(1, 'vocab', 'turn over a new leaf');
const vocabRow2 = makeRow(2, 'expression', 'hit the sack');
const vocabRow3 = makeRow(3, 'vocab', 'break a leg');
const scriptRow1 = makeRow(4, 'script', 'She decided to turn over a new leaf after the new year.');
const scriptRow2 = makeRow(5, 'script', 'It was getting late so he decided to hit the sack.');
const readingRow = makeRow(6, 'reading', 'I said break a leg before the performance.');
const promptRow = makeRow(7, 'prompt', 'What do you do to relax?');

const allRows = [vocabRow1, vocabRow2, vocabRow3, scriptRow1, scriptRow2, readingRow, promptRow];

// --- filterVocabRows ---

describe('filterVocabRows', () => {
  it('returns only vocab and expression rows', () => {
    const result = filterVocabRows(allRows);
    expect(result).toHaveLength(3);
    expect(result.map(r => r.id)).toEqual([1, 2, 3]);
  });

  it('returns empty array when no vocab/expression rows', () => {
    expect(filterVocabRows([scriptRow1, promptRow])).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(filterVocabRows([])).toHaveLength(0);
  });
});

// --- findContextRows ---

describe('findContextRows', () => {
  it('finds script rows containing the expression (case-insensitive)', () => {
    const result = findContextRows(allRows, 'turn over a new leaf');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(4);
  });

  it('finds reading rows containing the expression', () => {
    const result = findContextRows(allRows, 'break a leg');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(6);
  });

  it('returns empty array when no context rows contain the expression', () => {
    const result = findContextRows(allRows, 'nonexistent phrase xyz');
    expect(result).toHaveLength(0);
  });

  it('does not include vocab/expression/prompt rows in context', () => {
    const result = findContextRows(allRows, 'hit the sack');
    expect(result.every(r => r.rowType === 'script' || r.rowType === 'reading')).toBe(true);
  });

  it('is case-insensitive', () => {
    const result = findContextRows(allRows, 'TURN OVER A NEW LEAF');
    expect(result).toHaveLength(1);
  });
});

// --- buildPracticeOptions ---

describe('buildPracticeOptions', () => {
  it('always includes the correct answer', () => {
    const options = buildPracticeOptions(vocabRow1, [vocabRow2, vocabRow3]);
    expect(options).toContain('turn over a new leaf');
  });

  it('returns at most 4 options (1 correct + 3 distractors)', () => {
    const manyOthers = Array.from({ length: 10 }, (_, i) =>
      makeRow(i + 10, 'vocab', `expression ${i}`),
    );
    const options = buildPracticeOptions(vocabRow1, manyOthers);
    expect(options).toHaveLength(4);
  });

  it('returns fewer options when not enough others', () => {
    const options = buildPracticeOptions(vocabRow1, [vocabRow2]);
    expect(options).toHaveLength(2);
    expect(options).toContain('turn over a new leaf');
    expect(options).toContain('hit the sack');
  });

  it('returns just the correct answer when no others', () => {
    const options = buildPracticeOptions(vocabRow1, []);
    expect(options).toHaveLength(1);
    expect(options[0]).toBe('turn over a new leaf');
  });
});

// --- computeScore ---

describe('computeScore', () => {
  it('returns 0 for empty results', () => {
    expect(computeScore([])).toBe(0);
  });

  it('returns 100 when all correct', () => {
    const results: VocabItemResult[] = [
      { row: vocabRow1, practiceCorrect: true, produceHit: true, produceTranscript: '' },
      { row: vocabRow2, practiceCorrect: true, produceHit: true, produceTranscript: '' },
    ];
    expect(computeScore(results)).toBe(100);
  });

  it('returns 0 when all wrong', () => {
    const results: VocabItemResult[] = [
      { row: vocabRow1, practiceCorrect: false, produceHit: false, produceTranscript: '' },
    ];
    expect(computeScore(results)).toBe(0);
  });

  it('returns 50 when half correct', () => {
    const results: VocabItemResult[] = [
      { row: vocabRow1, practiceCorrect: true, produceHit: false, produceTranscript: '' },
    ];
    expect(computeScore(results)).toBe(50);
  });

  it('rounds to nearest integer', () => {
    const results: VocabItemResult[] = [
      { row: vocabRow1, practiceCorrect: true, produceHit: true, produceTranscript: '' },
      { row: vocabRow2, practiceCorrect: true, produceHit: false, produceTranscript: '' },
      { row: vocabRow3, practiceCorrect: false, produceHit: false, produceTranscript: '' },
    ];
    // correct: 3 out of 6 total = 50%
    expect(computeScore(results)).toBe(50);
  });
});

// --- computeNextReview ---

describe('computeNextReview', () => {
  it('returns 7 days for score >= 80', () => {
    expect(computeNextReview(80)).toBe(7);
    expect(computeNextReview(100)).toBe(7);
    expect(computeNextReview(95)).toBe(7);
  });

  it('returns 3 days for score >= 50 and < 80', () => {
    expect(computeNextReview(50)).toBe(3);
    expect(computeNextReview(79)).toBe(3);
    expect(computeNextReview(60)).toBe(3);
  });

  it('returns 1 day for score < 50', () => {
    expect(computeNextReview(0)).toBe(1);
    expect(computeNextReview(49)).toBe(1);
    expect(computeNextReview(25)).toBe(1);
  });
});
