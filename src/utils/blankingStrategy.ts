/**
 * Returns the set of word indices that should be VISIBLE (not blanked) for a given round.
 * For R2/R3, uses the reduced blank indices (fewer blanks than before).
 */
export function getVisibleIndices(
  round: 1 | 2 | 3 | 4,
  blankIndices: number[],
  totalWords: number
): Set<number> {
  const allIndices = new Set(Array.from({ length: totalWords }, (_, i) => i));

  switch (round) {
    case 1:
      // All words visible
      return allIndices;
    case 2:
    case 3:
      // Blank only the provided indices (reduced set)
      blankIndices.forEach(i => allIndices.delete(i));
      return allIndices;
    case 4:
      // All words blanked
      return new Set<number>();
  }
}

/**
 * Generates a display representation of a sentence for a given round.
 * Returns an array of { word, visible, index } objects.
 */
export function getSentenceDisplay(
  sentence: string,
  round: 1 | 2 | 3 | 4,
  keyIndices: number[]
): Array<{ word: string; visible: boolean; index: number }> {
  const words = sentence.split(' ');
  const visibleSet = getVisibleIndices(round, keyIndices, words.length);

  return words.map((word, index) => ({
    word,
    visible: visibleSet.has(index),
    index,
  }));
}
