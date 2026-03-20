export interface DataSet {
  id: string;
  name: string;
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
