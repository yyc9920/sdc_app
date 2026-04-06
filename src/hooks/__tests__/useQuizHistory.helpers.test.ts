import { describe, it, expect } from 'vitest';
import type { QuizResult } from '../useQuizHistory';

// Test the helper logic directly (same algorithms used in the hook)

const makeResult = (score: number): QuizResult => ({
  id: `test-${score}`,
  setId: 'set1',
  level: 1,
  score,
  blanksTotal: 10,
  blanksCorrect: Math.round(score / 10),
  completedAt: new Date(),
  timeSpentSeconds: 60,
});

describe('getAverageScore logic', () => {
  const getAverageScore = (results: QuizResult[]) => {
    if (results.length === 0) return 0;
    return Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
  };

  it('calculates average of scores', () => {
    expect(getAverageScore([makeResult(80), makeResult(90), makeResult(70)])).toBe(80);
  });

  it('empty results returns 0', () => {
    expect(getAverageScore([])).toBe(0);
  });

  it('rounds result', () => {
    expect(getAverageScore([makeResult(33), makeResult(67)])).toBe(50);
  });
});

describe('getRecentResults logic', () => {
  const getRecentResults = (results: QuizResult[], count: number) =>
    results.slice(0, count);

  it('returns first N results', () => {
    const results = [makeResult(80), makeResult(90), makeResult(70)];
    expect(getRecentResults(results, 2)).toHaveLength(2);
    expect(getRecentResults(results, 2)[0].score).toBe(80);
  });

  it('count > results.length returns all', () => {
    const results = [makeResult(80)];
    expect(getRecentResults(results, 5)).toHaveLength(1);
  });
});
