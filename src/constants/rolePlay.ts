// RolePlay mode constants and types

export type RolePlayPhase = 'SETUP' | 'DEMO' | 'GUIDED' | 'PRACTICE' | 'FREE' | 'REVIEW';

export interface TurnResult {
  rowIndex: number;
  speaker: string;
  expected: string;
  transcript: string;
  score: number | null; // null = SR failed/unavailable (not same as 0%)
  phase: RolePlayPhase;
}

/** Minimum user speaking time (ms). Dynamic timeout = max(this, wordCount * MS_PER_WORD). */
export const USER_TURN_TIMEOUT_MS = 15_000;
export const MS_PER_WORD = 800;

/** Maximum time to wait for partner TTS before auto-skipping with error. */
export const PARTNER_TTS_TIMEOUT_MS = 12_000;

export const SPEAKER_COLORS: { bg: string; text: string; ring: string }[] = [
  { bg: 'bg-blue-500',    text: 'text-white', ring: 'ring-blue-300'    },
  { bg: 'bg-emerald-500', text: 'text-white', ring: 'ring-emerald-300' },
  { bg: 'bg-violet-500',  text: 'text-white', ring: 'ring-violet-300'  },
  { bg: 'bg-orange-500',  text: 'text-white', ring: 'ring-orange-300'  },
  { bg: 'bg-rose-500',    text: 'text-white', ring: 'ring-rose-300'    },
  { bg: 'bg-cyan-500',    text: 'text-white', ring: 'ring-cyan-300'    },
];

export const PHASE_LABELS: Record<RolePlayPhase, string> = {
  SETUP:    '역할 선택',
  DEMO:     '데모',
  GUIDED:   '가이드 연습',
  PRACTICE: '연습',
  FREE:     '자유 연습',
  REVIEW:   '결과',
};

export function getSpeakerColor(
  speaker: string,
  speakers: string[],
): { bg: string; text: string; ring: string } {
  const idx = speakers.indexOf(speaker);
  return SPEAKER_COLORS[(idx >= 0 ? idx : 0) % SPEAKER_COLORS.length];
}
