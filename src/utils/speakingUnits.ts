import type { TrainingRow } from '../hooks/training/types';

const SHORT_SENTENCE_THRESHOLD = 3;

export interface SpeakingUnit {
  rows: TrainingRow[];
  combinedEnglish: string;
  combinedKorean: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Build speaking units for R2: merge consecutive short sentences (<=3 words)
 * with the next sentence so students speak in natural chunks.
 */
export function buildSpeakingUnits(rows: TrainingRow[]): SpeakingUnit[] {
  const units: SpeakingUnit[] = [];
  let i = 0;

  while (i < rows.length) {
    const wordCount = rows[i].english.split(/\s+/).filter(Boolean).length;

    if (wordCount <= SHORT_SENTENCE_THRESHOLD && i + 1 < rows.length) {
      const merged = [rows[i], rows[i + 1]];
      units.push({
        rows: merged,
        combinedEnglish: merged.map(r => r.english).join(' '),
        combinedKorean: merged.map(r => r.comprehension).filter(Boolean).join(' '),
        startIndex: i,
        endIndex: i + 1,
      });
      i += 2;
    } else {
      units.push({
        rows: [rows[i]],
        combinedEnglish: rows[i].english,
        combinedKorean: rows[i].comprehension,
        startIndex: i,
        endIndex: i,
      });
      i += 1;
    }
  }

  return units;
}
