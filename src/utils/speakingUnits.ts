import type { TrainingRow } from '../hooks/training/types';

export interface SpeakingUnit {
  rows: TrainingRow[];
  combinedEnglish: string;
  combinedKorean: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Build speaking units for R2: each row becomes its own unit.
 * Students speak one sentence at a time for clear per-sentence practice.
 */
export function buildSpeakingUnits(rows: TrainingRow[]): SpeakingUnit[] {
  return rows.map((row, i) => ({
    rows: [row],
    combinedEnglish: row.english,
    combinedKorean: row.comprehension,
    startIndex: i,
    endIndex: i,
  }));
}
