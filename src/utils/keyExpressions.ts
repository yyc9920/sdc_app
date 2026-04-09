import { FUNCTION_WORDS } from '../constants/infiniteSpeaking';

/**
 * Returns indices of "key expression" (content) words in a sentence.
 * Function words (articles, prepositions, auxiliaries, pronouns, etc.) are excluded.
 */
export function getKeyExpressionIndices(sentence: string): number[] {
  const words = sentence.split(' ');
  const indices: number[] = [];

  for (let i = 0; i < words.length; i++) {
    const cleaned = words[i].toLowerCase().replace(/[.,!?;:'"()&\-_—]/g, '');
    if (cleaned && !FUNCTION_WORDS.has(cleaned)) {
      indices.push(i);
    }
  }

  // If somehow all words are function words, mark the last word as key
  if (indices.length === 0 && words.length > 0) {
    indices.push(words.length - 1);
  }

  return indices;
}

const SPECIAL_CHAR_RE = /[&\-_—]/;
const PROPER_NOUN_RE = /^[A-Z]/;

/**
 * Returns a reduced set of blank indices for R2/R3.
 * - Proper nouns (capitalized, not sentence-start) are never blanked
 * - Words containing special characters are never blanked
 * - Remaining content words: ~50% blanked at even intervals
 */
export function getReducedBlankIndices(sentence: string): number[] {
  const words = sentence.split(' ');
  const allContent = getKeyExpressionIndices(sentence);

  // Separate into always-visible (proper nouns / special chars) and blankable
  const blankable: number[] = [];
  for (const idx of allContent) {
    const raw = words[idx];
    const cleaned = raw.replace(/[.,!?;:'"()]/g, '');

    // Skip proper nouns (capitalized and not first word)
    if (idx > 0 && PROPER_NOUN_RE.test(cleaned)) continue;

    // Skip words with special characters
    if (SPECIAL_CHAR_RE.test(cleaned)) continue;

    blankable.push(idx);
  }

  // Blank ~50% of blankable words at even intervals
  if (blankable.length <= 1) return blankable;

  const targetCount = Math.max(1, Math.ceil(blankable.length / 2));
  const step = blankable.length / targetCount;
  const result: number[] = [];

  for (let i = 0; i < targetCount; i++) {
    result.push(blankable[Math.floor(i * step)]);
  }

  return result;
}
