export type RowType = 'script' | 'reading' | 'prompt' | 'task' | 'vocab' | 'expression' | 'question' | 'meta';

export type LearningLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type CategoryCode =
  | 'LEGACY' | 'SPK' | 'INT' | 'CONV' | 'ACA'
  | 'LEC' | 'TED' | 'BTEW' | 'B6ME' | 'ELLO'
  | 'TRES' | 'BEP' | 'TAL' | 'EXT' | 'DLG';

export interface DataSet {
  id: string;
  name: string;
  description?: string;
  filename?: string;
  level?: LearningLevel;
  category?: CategoryCode;
  isLegacy?: boolean;
}

export interface SentenceData {
  id: number;
  english: string;
  koreanPronounce: string;
  directComprehension: string;
  comprehension: string;
  rowType?: RowType;
  speaker?: string;
  note?: string;
}

export interface LearningSetMeta {
  setId: string;
  title: string;
  level: LearningLevel;
  category: CategoryCode;
  categoryLabel: string;
  sentenceCount: number;
  isLegacy: boolean;
  status: string;
  supportedModes?: string[];
  hasSpeedListening?: boolean;
}

export interface AppState {
  data: SentenceData[];
  loading: boolean;
  error: string | null;
  selectedDataSet: DataSet | null;
  isLobby: boolean;
  currentPage: number;
  perPage: number;
  rangeStart: number;
  rangeEnd: number;
  repeatCount: number;
  isRandom: boolean;
  isNightMode: boolean;
}

export interface SpeedListeningSentence {
  id: number;
  english: string;
  korean: string;
  properNounIndices: number[];
}

export interface Quiz {
  question: string;
  options: string[];
  answerIndex: number;
}

export interface SpeedListeningSet {
  setId: string;
  parentSetId: string;
  theme: string;
  level: number;
  setNumber: number;
  sentences: SpeedListeningSentence[];
  quiz?: Quiz;
}

export type TrainingMode =
  | 'repetition'
  | 'speedListening'
  | 'infiniteSpeaking'
  | 'rolePlay'
  | 'vocab'
  | 'freeResponse';

