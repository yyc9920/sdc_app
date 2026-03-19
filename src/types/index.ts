export interface SentenceData {
  id: number;
  english: string;
  koreanPronounce: string;
  directComprehension: string;
}

export interface AppState {
  data: SentenceData[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  perPage: number;
  rangeStart: number;
  rangeEnd: number;
  repeatCount: number;
  isRandom: boolean;
  isNightMode: boolean;
}
