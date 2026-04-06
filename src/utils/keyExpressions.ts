import { FUNCTION_WORDS } from '../constants/infiniteSpeaking';

/**
 * Returns indices of "key expression" (content) words in a sentence.
 * Function words (articles, prepositions, auxiliaries, pronouns, etc.) are excluded.
 */
export function getKeyExpressionIndices(sentence: string): number[] {
  const words = sentence.split(' ');
  const indices: number[] = [];

  for (let i = 0; i < words.length; i++) {
    const cleaned = words[i].toLowerCase().replace(/[.,!?;:'"()]/g, '');
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
