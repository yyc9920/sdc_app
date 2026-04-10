import type { TrainingRow } from '../hooks/training/types';

export interface SpeakingUnit {
  rows: TrainingRow[];
  combinedEnglish: string;
  combinedKorean: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Build speaking units for R2: each row becomes one unit.
 * Previously split multi-sentence rows, but data is being normalized
 * to one sentence per row so splitting is no longer needed.
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
