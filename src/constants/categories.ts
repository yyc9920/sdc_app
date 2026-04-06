import type { CategoryCode } from '../types';

export const CATEGORY_MAP: Record<CategoryCode, { label: string; description: string }> = {
  LEGACY: { label: '기존 학습', description: '기존 학습 세트' },
  SPK: { label: 'TOEFL Speaking 독립형', description: 'TOEFL Speaking Independent' },
  INT: { label: 'TOEFL Speaking 통합형', description: 'TOEFL Speaking Integrated' },
  CONV: { label: 'TOEFL Listening 대화', description: 'TOEFL Listening Conversation' },
  ACA: { label: 'TOEFL Speaking Q4', description: 'TOEFL Speaking Academic' },
  LEC: { label: 'TOEFL Listening 강의', description: 'TOEFL Listening Lecture' },
  TED: { label: 'TED Talk', description: 'TED Talk Scripts' },
  BTEW: { label: 'BBC TEWS', description: 'BBC The English We Speak' },
  B6ME: { label: 'BBC 6 Minute English', description: 'BBC 6 Minute English' },
  ELLO: { label: 'ELLLO Mixer', description: 'ELLLO Mixer Listening' },
  TRES: { label: 'TOEFL Resources', description: 'TOEFL Resource Materials' },
  BEP: { label: 'Business English Pod', description: 'Business English Podcast' },
  TAL: { label: 'This American Life', description: 'This American Life Stories' },
  EXT: { label: '확장 콘텐츠', description: 'Extended Practice Content' },
};

export const LEVEL_LABELS: Record<number, string> = {
  0: '기존 학습 세트',
  1: 'Level 1 — Beginner',
  2: 'Level 2 — Elementary',
  3: 'Level 3 — Intermediate',
  4: 'Level 4 — Upper-Intermediate',
  5: 'Level 5 — Advanced',
};
