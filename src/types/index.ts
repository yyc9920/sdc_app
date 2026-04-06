export interface DataSet {
  id: string;
  name: string;
  description?: string;
  filename: string;
}

export interface SentenceData {
  id: number;
  english: string;
  koreanPronounce: string;
  directComprehension: string;
  comprehension: string;
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
  quiz: Quiz;
}

