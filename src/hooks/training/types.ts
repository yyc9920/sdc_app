import type { RowType, TrainingMode, SentenceData, LearningLevel, CategoryCode } from '../../types';

// SentenceData with required fields for new dataset rows
export interface TrainingRow extends SentenceData {
  rowType: RowType;     // override optional → required
  rowSeq: number;       // new: position within set
  speaker: string;      // override optional → required (empty string if none)
  note: string;         // override optional → required (empty string if none)
}

export interface TrainingSet {
  setId: string;
  title: string;
  level: LearningLevel;
  category: CategoryCode;
  categoryLabel: string;
  sentenceCount: number;
  rowTypes: RowType[];
  speakers: string[];
  supportedModes: TrainingMode[];
}

export type SessionPhase = 'setup' | 'active' | 'review' | 'complete';

export interface TrainingSession {
  setId: string;
  mode: TrainingMode;
  rows: TrainingRow[];
  currentIndex: number;
  round: number;
  totalRounds: number;
  phase: SessionPhase;
  startedAt: number;
  elapsedSeconds: number;
  isPaused: boolean;
}

export type SessionAction =
  | { type: 'INIT'; rows: TrainingRow[]; mode: TrainingMode; setId: string; totalRounds?: number }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'GO_TO'; index: number }
  | { type: 'NEXT_ROUND' }
  | { type: 'SET_PHASE'; phase: SessionPhase }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'TICK'; elapsed: number }
  | { type: 'COMPLETE' }
  | { type: 'RESET' };

export interface ModeOptions {
  totalRounds?: number;
  shuffle?: boolean;
  rowTypeFilter?: RowType[];
}

export type VoiceKey = 'female1' | 'male1' | 'female2' | 'male2' | 'female3' | 'male3';
