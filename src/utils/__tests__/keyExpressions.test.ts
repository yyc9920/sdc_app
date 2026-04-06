import { describe, it, expect } from 'vitest';
import { getKeyExpressionIndices } from '../keyExpressions';

describe('getKeyExpressionIndices', () => {
  it('returns indices of content words', () => {
    // "beautiful" and "garden" are content words; "the" and "is" are function words
    const result = getKeyExpressionIndices('The garden is beautiful');
    expect(result).toContain(1); // garden
    expect(result).toContain(3); // beautiful
    expect(result).not.toContain(0); // The
    expect(result).not.toContain(2); // is
  });

  it('strips punctuation before checking function words', () => {
    const result = getKeyExpressionIndices('Hello, world!');
    expect(result).toEqual([0, 1]); // both are content words
  });

  it('contractions: apostrophe is stripped, so cleaned form may not match FUNCTION_WORDS', () => {
    // "I'm" -> cleaned to "im" (apostrophe stripped), "im" is NOT in FUNCTION_WORDS
    // So contractions are treated as content words due to punctuation stripping
    const result = getKeyExpressionIndices("I'm going to the store");
    expect(result).toContain(0);     // I'm -> "im" (content word after cleaning)
    expect(result).toContain(1);     // going
    expect(result).not.toContain(2); // to
    expect(result).not.toContain(3); // the
    expect(result).toContain(4);     // store
  });

  it('is case-insensitive for function word matching', () => {
    const result = getKeyExpressionIndices('The THE the');
    // All are function words -> fallback to last word
    expect(result).toEqual([2]);
  });

  it('fallback: all function words -> marks last word as key', () => {
    getKeyExpressionIndices('I am the one');
    // "one" might be function word or not. Let's check more clearly:
    const result2 = getKeyExpressionIndices('I am a the');
    expect(result2).toEqual([3]); // fallback: last index
  });

  it('single content word', () => {
    const result = getKeyExpressionIndices('Run');
    expect(result).toEqual([0]);
  });

  it('single function word -> fallback to [0]', () => {
    const result = getKeyExpressionIndices('the');
    expect(result).toEqual([0]);
  });

  it('mixed sentence with various punctuation', () => {
    const result = getKeyExpressionIndices('Well; she said: "hello"');
    // "well" is function word, "she" is function word
    // "said" -> content, "hello" -> content
    expect(result).toContain(2); // said
    expect(result).toContain(3); // "hello"
  });

  it('handles empty cleaned words (punctuation-only tokens)', () => {
    // Edge case: if a "word" is just punctuation
    const result = getKeyExpressionIndices('Hello ... world');
    expect(result).toContain(0); // Hello
    expect(result).toContain(2); // world
    // "..." cleans to empty string, should be skipped
    expect(result).not.toContain(1);
  });

  it('long sentence with mixed content/function words', () => {
    const result = getKeyExpressionIndices('She quickly ran to the beautiful garden behind the house');
    // function: she, to, the, the, behind
    // content: quickly, ran, beautiful, garden, house
    expect(result).toContain(1); // quickly
    expect(result).toContain(2); // ran
    expect(result).toContain(5); // beautiful
    expect(result).toContain(6); // garden
    expect(result).toContain(9); // house
  });
});
