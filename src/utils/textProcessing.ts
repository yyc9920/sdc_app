/**
 * Strips punctuation and lowercases a word for fill-in-the-blank answer comparison.
 * Shared across all quiz-based learning modes.
 */
export const cleanWord = (word: string): string =>
  word.replace(/[.,?!;:"']/g, '').toLowerCase();

/**
 * Returns true for words containing characters that make fill-in-the-blank
 * impractical (ampersands, underscores, em-dashes, slashes, or hyphenated compounds).
 */
export const hasSpecialChars = (word: string): boolean =>
  /[&_—/]/.test(word) || (word.includes('-') && word.length > 1);

/**
 * Returns true for all-uppercase acronyms (e.g. "BBC", "USA", "NATO").
 * These are excluded from fill-in-the-blank generation — they are effectively
 * impossible to guess without specific knowledge, and capitalization is
 * preserved rather than indicated via context.
 *
 * Using this instead of a capitalization heuristic avoids false-positives on
 * sentence-initial common words within multi-sentence rows (e.g. the "France"
 * in "We went to Paris. France is beautiful." would be wrongly skipped by a
 * naive "uppercase + not first word" check).
 */
export const isAcronym = (word: string): boolean =>
  word.length > 1 && word === word.toUpperCase() && /^[A-Z]+$/.test(word);

/**
 * Given a sorted array of word indices, removes indices from consecutive runs
 * longer than `maxConsecutive` to prevent presenting too many adjacent blanks
 * in a row (which makes guessing easy and reading flow awkward).
 */
export const breakConsecutiveRuns = (indices: number[], maxConsecutive: number): number[] => {
  const sorted = [...indices].sort((a, b) => a - b);
  const result = new Set(sorted);
  let runStart = 0;
  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === sorted[i - 1] + 1) continue;
    const runLength = i - runStart;
    if (runLength > maxConsecutive) {
      for (let j = runStart + maxConsecutive; j < i; j += maxConsecutive + 1) {
        result.delete(sorted[j]);
      }
    }
    runStart = i;
  }
  return [...result];
};
