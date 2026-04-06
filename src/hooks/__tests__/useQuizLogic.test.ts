import { describe, it, expect, vi } from 'vitest';
import { cleanWord, generateSentenceVoices, generateBlankIndices } from '../useQuizLogic';
import { AVAILABLE_VOICES, BLANK_MULTIPLIER } from '../../constants';
import type { SpeedListeningSentence } from '../../types';

describe('cleanWord', () => {
  it('returns lowercase word unchanged', () => {
    expect(cleanWord('hello')).toBe('hello');
  });

  it('removes trailing punctuation and lowercases', () => {
    expect(cleanWord('Hello!')).toBe('hello');
  });

  it('removes commas', () => {
    expect(cleanWord('world,')).toBe('world');
  });

  it('removes quotes', () => {
    expect(cleanWord('"quoted"')).toBe('quoted');
  });

  it('removes complex punctuation', () => {
    expect(cleanWord("test?!,")).toBe('test');
  });
});

describe('generateSentenceVoices', () => {
  const sentences: SpeedListeningSentence[] = [
    { id: 1, english: 'Hello', korean: '안녕', properNounIndices: [] },
    { id: 2, english: 'World', korean: '세계', properNounIndices: [] },
    { id: 3, english: 'Test', korean: '테스트', properNounIndices: [] },
  ];

  it('assigns a voice to every sentence', () => {
    const result = generateSentenceVoices(sentences);
    sentences.forEach(s => {
      expect(result[s.id]).toBeDefined();
      expect(AVAILABLE_VOICES).toContain(result[s.id]);
    });
  });

  it('alternates between two voices', () => {
    const result = generateSentenceVoices(sentences);
    // Even-indexed sentences share one voice, odd-indexed share another
    expect(result[1]).toBe(result[3]); // index 0 and 2 (both even)
    expect(result[1]).not.toBe(result[2]); // index 0 (even) vs 1 (odd)
  });

  it('uses two different voices', () => {
    const result = generateSentenceVoices(sentences);
    const voices = new Set(Object.values(result));
    expect(voices.size).toBe(2);
  });
});

describe('generateBlankIndices', () => {
  const makeSentence = (id: number, english: string, properNounIndices: number[] = []): SpeedListeningSentence => ({
    id,
    english,
    korean: '',
    properNounIndices,
  });

  it('generates blank indices for every sentence', () => {
    const sentences = [
      makeSentence(1, 'The cat sat on the mat'),
      makeSentence(2, 'Hello world'),
    ];
    const result = generateBlankIndices(sentences, 3);
    expect(result[1]).toBeDefined();
    expect(result[2]).toBeDefined();
  });

  it('never blanks proper noun indices', () => {
    const sentences = [makeSentence(1, 'John went to Paris yesterday', [0, 3])];
    // Run multiple times to account for randomness
    for (let i = 0; i < 10; i++) {
      const result = generateBlankIndices(sentences, 5);
      expect(result[1].has(0)).toBe(false); // John
      expect(result[1].has(3)).toBe(false); // Paris
    }
  });

  it('creates at least 1 blank', () => {
    const sentences = [makeSentence(1, 'Hi there')];
    const result = generateBlankIndices(sentences, 1);
    expect(result[1].size).toBeGreaterThanOrEqual(1);
  });

  it('number of blanks = max(1, floor(wordCount * level * BLANK_MULTIPLIER))', () => {
    const sentences = [makeSentence(1, 'one two three four five six seven eight nine ten')];
    const level = 5;
    const wordCount = 10;
    const expectedBlanks = Math.max(1, Math.floor(wordCount * level * BLANK_MULTIPLIER));
    const result = generateBlankIndices(sentences, level);
    expect(result[1].size).toBe(expectedBlanks);
  });

  it('level 1 with few words still has at least 1 blank', () => {
    const sentences = [makeSentence(1, 'Hello world')];
    const result = generateBlankIndices(sentences, 1);
    // floor(2 * 1 * 0.15) = floor(0.3) = 0, but max(1, 0) = 1
    expect(result[1].size).toBe(1);
  });

  it('returns Set instances', () => {
    const sentences = [makeSentence(1, 'Test sentence here')];
    const result = generateBlankIndices(sentences, 2);
    expect(result[1]).toBeInstanceOf(Set);
  });
});
