import type { TrainingRow } from '../hooks/training/types';

export interface SpeakingUnit {
  rows: TrainingRow[];
  combinedEnglish: string;
  combinedKorean: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Split a long English text into individual sentences at sentence boundaries.
 * Handles: period (.), question mark (?), exclamation (!).
 * Keeps closing quotes attached to the sentence.
 */
function splitIntoSentences(text: string): string[] {
  // Split at sentence-ending punctuation followed by a space and an uppercase letter or quote
  const parts = text.split(/(?<=[.!?]["']?\s)(?=[A-Z"'])/);
  return parts.map(s => s.trim()).filter(Boolean);
}

/**
 * Build speaking units for R2: each sentence becomes its own unit.
 * If a row contains multiple English sentences, they are split so students
 * speak one sentence at a time.
 */
export function buildSpeakingUnits(rows: TrainingRow[]): SpeakingUnit[] {
  const units: SpeakingUnit[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sentences = splitIntoSentences(row.english);

    if (sentences.length <= 1) {
      // Single sentence row — use as-is
      units.push({
        rows: [row],
        combinedEnglish: row.english,
        combinedKorean: row.comprehension,
        startIndex: i,
        endIndex: i,
      });
    } else {
      // Multi-sentence row — split into individual units
      // Korean comprehension stays with the first sub-unit
      for (let s = 0; s < sentences.length; s++) {
        units.push({
          rows: [row],
          combinedEnglish: sentences[s],
          combinedKorean: s === 0 ? row.comprehension : '',
          startIndex: i,
          endIndex: i,
        });
      }
    }
  }

  return units;
}
