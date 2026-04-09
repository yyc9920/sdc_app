import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { analyzeResponse } from '../../useFreeResponse';
import type { TrainingRow } from '../types';

// Mock dependencies so renderHook works without Firebase/TTS
vi.mock('../../../firebase', () => ({
  db: {},
  auth: { currentUser: null },
}));

vi.mock('../../../services/ttsService', () => ({
  getTTSAudioUrl: vi.fn().mockResolvedValue('blob:mock'),
}));

vi.mock('../../../services/speechService', () => ({
  createSpeechService: vi.fn(() => ({
    isAvailable: vi.fn().mockResolvedValue(true),
    requestPermission: vi.fn().mockResolvedValue(true),
    startListening: vi.fn(),
    stopListening: vi.fn(),
    onResult: vi.fn(),
    onError: vi.fn(),
    removeAllListeners: vi.fn(),
  })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false, error: null })),
}));

function makeRow(english: string, rowType: TrainingRow['rowType'] = 'script'): TrainingRow {
  return {
    id: 1,
    rowType,
    rowSeq: 0,
    speaker: '',
    note: '',
    english,
    koreanPronounce: '',
    directComprehension: '',
    comprehension: '',
  };
}

// ─── analyzeResponse pure function tests ──────────────────────────────────────

describe('analyzeResponse', () => {
  it('returns 0% overlap when transcript is empty', () => {
    const rows = [makeRow('The library is a quiet comfortable place')];
    const result = analyzeResponse('', rows);
    expect(result.overlapPercent).toBe(0);
    expect(result.userWords).toHaveLength(0);
  });

  it('returns 100% when all model keywords appear in transcript', () => {
    // Model: "library comfortable place" are the keywords (after stop word removal)
    const rows = [makeRow('The library is a comfortable place')];
    const result = analyzeResponse('library comfortable place quiet reading', rows);
    // keywords: library, comfortable, place, quiet, reading (5 words w/o stops)
    expect(result.overlapPercent).toBe(100);
  });

  it('computes partial overlap correctly', () => {
    const rows = [makeRow('library book quiet reading')];
    // keywords = [library, book, quiet, reading] — 4 words
    // user uses only "library" and "book" → 2/4 = 50%
    const result = analyzeResponse('library book', rows);
    expect(result.overlapPercent).toBe(50);
  });

  it('excludes stop words from keywords', () => {
    // Only stop words in model — keywords list should be empty
    const rows = [makeRow('I am a the and or but')];
    const result = analyzeResponse('something else entirely different', rows);
    expect(result.keywordsMatched).toHaveLength(0);
    expect(result.keywordsMissed).toHaveLength(0);
    expect(result.overlapPercent).toBe(0);
  });

  it('returns correct userWords highlight array', () => {
    const rows = [makeRow('library book')];
    const result = analyzeResponse('library coffee', rows);
    const libraryWord = result.userWords.find(w => w.word === 'library');
    const coffeeWord = result.userWords.find(w => w.word === 'coffee');
    expect(libraryWord?.matched).toBe(true);
    expect(coffeeWord?.matched).toBe(false);
  });

  it('returns correct modelWords with found flag', () => {
    const rows = [makeRow('library book')];
    const result = analyzeResponse('library coffee', rows);
    const libModel = result.modelWords.find(w => w.word === 'library');
    const bookModel = result.modelWords.find(w => w.word === 'book');
    expect(libModel?.found).toBe(true);
    expect(bookModel?.found).toBe(false);
  });

  it('handles multiple script rows joined together', () => {
    const rows = [makeRow('library book'), makeRow('comfortable quiet')];
    const result = analyzeResponse('library comfortable', rows);
    expect(result.keywordsMatched).toContain('library');
    expect(result.keywordsMatched).toContain('comfortable');
    expect(result.keywordsMissed).toContain('book');
    expect(result.keywordsMissed).toContain('quiet');
  });
});

// ─── useFreeResponse hook tests ───────────────────────────────────────────────

import { useFreeResponse } from '../../useFreeResponse';

describe('useFreeResponse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in PROMPT phase', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    expect(result.current.phase).toBe('PROMPT');
  });

  it('transitions to THINK on startThink()', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    act(() => {
      result.current.startThink();
    });
    expect(result.current.phase).toBe('THINK');
  });

  it('transitions to RECORD on startRecord()', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    act(() => {
      result.current.startThink();
      result.current.startRecord();
    });
    expect(result.current.phase).toBe('RECORD');
  });

  it('transitions to COMPARE on stopRecord() and computes analysis', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    act(() => {
      result.current.startThink();
      result.current.startRecord();
      result.current.stopRecord();
    });
    expect(result.current.phase).toBe('COMPARE');
    expect(result.current.analysis).not.toBeNull();
  });

  it('transitions to STUDY on startStudy() with studyIndex 0', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    act(() => {
      result.current.startThink();
      result.current.startRecord();
      result.current.stopRecord();
      result.current.startStudy();
    });
    expect(result.current.phase).toBe('STUDY');
    expect(result.current.studyIndex).toBe(0);
  });

  it('transitions to RETRY when last study sentence is passed', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    act(() => {
      result.current.startThink();
      result.current.startRecord();
      result.current.stopRecord();
      result.current.startStudy();
      // scriptRows is empty (mocked useQuery returns []), so nextStudySentence → RETRY immediately
      result.current.nextStudySentence();
    });
    expect(result.current.phase).toBe('RETRY');
  });

  it('transitions to RECORD on retry() and increments retryCount', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    act(() => {
      result.current.startThink();
      result.current.startRecord();
      result.current.stopRecord();
      result.current.startStudy();
      result.current.nextStudySentence();
      result.current.retry();
    });
    expect(result.current.phase).toBe('RECORD');
    expect(result.current.retryCount).toBe(1);
  });

  it('transitions to COMPLETE on complete()', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    act(() => {
      result.current.startThink();
      result.current.startRecord();
      result.current.stopRecord();
      result.current.startStudy();
      result.current.nextStudySentence();
      result.current.complete();
    });
    expect(result.current.phase).toBe('COMPLETE');
  });

  it('resets to PROMPT phase on reset()', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    act(() => {
      result.current.startThink();
      result.current.reset();
    });
    expect(result.current.phase).toBe('PROMPT');
    expect(result.current.retryCount).toBe(0);
    expect(result.current.analysis).toBeNull();
  });
});
