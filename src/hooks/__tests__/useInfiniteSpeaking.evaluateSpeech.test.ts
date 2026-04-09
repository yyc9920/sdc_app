import { describe, it, expect } from 'vitest';
import { evaluateSpeechLogic } from '../useInfiniteSpeaking';

describe('evaluateSpeechLogic', () => {
  it('exact match returns 100 score with all correct', () => {
    const result = evaluateSpeechLogic('hello world', 'Hello world');
    expect(result.score).toBe(100);
    expect(result.wordStatuses).toEqual(['correct', 'correct']);
  });

  it('partial match returns partial score with pending words', () => {
    const result = evaluateSpeechLogic('hello', 'Hello world');
    expect(result.score).toBe(50);
    expect(result.wordStatuses).toEqual(['correct', 'pending']);
  });

  it('markFinal: unmatched words become incorrect', () => {
    const result = evaluateSpeechLogic('hello', 'Hello world', true);
    expect(result.score).toBe(50);
    expect(result.wordStatuses).toEqual(['correct', 'incorrect']);
  });

  it('ignores punctuation in target', () => {
    const result = evaluateSpeechLogic('hello world', 'Hello, world!');
    expect(result.score).toBe(100);
    expect(result.wordStatuses).toEqual(['correct', 'correct']);
  });

  it('case insensitive matching', () => {
    const result = evaluateSpeechLogic('HELLO WORLD', 'hello world');
    expect(result.score).toBe(100);
  });

  it('duplicate words: counts are tracked', () => {
    const result = evaluateSpeechLogic('the the', 'the the cat');
    expect(result.wordStatuses).toEqual(['correct', 'correct', 'pending']);
    expect(result.score).toBe(67); // 2/3 rounded
  });

  it('extra spoken words are ignored', () => {
    const result = evaluateSpeechLogic('um hello beautiful world', 'Hello world');
    expect(result.score).toBe(100);
    expect(result.wordStatuses).toEqual(['correct', 'correct']);
  });

  it('empty spoken text returns score 0 with all pending', () => {
    const result = evaluateSpeechLogic('', 'Hello world');
    expect(result.score).toBe(0);
    expect(result.wordStatuses).toEqual(['pending', 'pending']);
  });

  it('single word sentence', () => {
    const result = evaluateSpeechLogic('hello', 'Hello');
    expect(result.score).toBe(100);
    expect(result.wordStatuses).toEqual(['correct']);
  });

  it('mid-sentence correction: spoken "goodbye hello world" against "Hello world"', () => {
    const result = evaluateSpeechLogic('goodbye hello world', 'Hello world');
    expect(result.score).toBe(100);
    expect(result.wordStatuses).toEqual(['correct', 'correct']);
  });
});

describe('special characters and punctuation-only words', () => {
  it('should auto-pass words that are only special characters like em-dash', () => {
    const result = evaluateSpeechLogic('hello world', 'hello — world', true);
    expect(result.wordStatuses).toEqual(['correct', 'correct', 'correct']);
    expect(result.score).toBe(100);
  });

  it('should auto-pass trailing punctuation-only tokens', () => {
    const result = evaluateSpeechLogic('hello', 'hello —', true);
    expect(result.wordStatuses).toEqual(['correct', 'correct']);
    expect(result.score).toBe(100);
  });

  it('should auto-pass multiple consecutive special char tokens', () => {
    const result = evaluateSpeechLogic('yes of course', 'yes — of course', true);
    expect(result.score).toBe(100);
  });
});
