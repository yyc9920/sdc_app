# TrainingEngine Core Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared TrainingEngine core (types, DataAdapter, 4 core hooks) that all 6 learning modes depend on.

**Architecture:** Composable hooks pattern on top of existing services (ttsService, speechService, Firestore). New `src/hooks/training/` directory. Each core hook is independent and testable. Mode-specific hooks (Phase 2+3) will compose these core hooks.

**Tech Stack:** TypeScript strict, React 19, TanStack Query v5, Vitest + React Testing Library, Firebase/Firestore

**Spec:** `docs/superpowers/specs/2026-04-09-training-sequence-design.md`

---

## File Structure

```
src/hooks/training/
├── types.ts                          # TrainingMode, TrainingRow, TrainingSession, etc.
├── dataAdapter.ts                    # MODE_ROW_FILTERS, getSupportedModes, filterRows, assignSpeakerVoices
├── useTrainingData.ts                # Fetch + adapt from Firestore
├── useTrainingSession.ts             # Session state machine (useReducer)
├── useTrainingAudio.ts               # TTS playback + speech recognition
├── useTrainingProgress.ts            # Progress tracking + result saving
├── index.ts                          # Barrel export
└── __tests__/
    ├── dataAdapter.test.ts           # Pure function tests
    ├── useTrainingData.test.ts       # Hook tests with mocked Firestore
    ├── useTrainingSession.test.ts    # State machine tests
    ├── useTrainingAudio.test.ts      # Audio hook tests
    └── useTrainingProgress.test.ts   # Progress hook tests
```

**Modified files:**
- `src/types/index.ts` — Add `TrainingMode` type export

---

## Task 1: Types & TrainingMode

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/hooks/training/types.ts`

- [ ] **Step 1: Add TrainingMode to src/types/index.ts**

Add at the end of the file, after the existing `SpeedListeningSet` interface:

```typescript
export type TrainingMode =
  | 'repetition'
  | 'speedListening'
  | 'infiniteSpeaking'
  | 'rolePlay'
  | 'vocab'
  | 'freeResponse';
```

- [ ] **Step 2: Create src/hooks/training/types.ts**

```typescript
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
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/hooks/training/types.ts
git commit -m "feat: add TrainingEngine core types and TrainingMode"
```

---

## Task 2: DataAdapter — Pure Functions

**Files:**
- Create: `src/hooks/training/dataAdapter.ts`
- Create: `src/hooks/training/__tests__/dataAdapter.test.ts`

- [ ] **Step 1: Write failing tests for dataAdapter**

```typescript
// src/hooks/training/__tests__/dataAdapter.test.ts
import { describe, it, expect } from 'vitest';
import {
  MODE_ROW_FILTERS,
  filterRowsForMode,
  getSupportedModes,
  assignSpeakerVoices,
  toTrainingRow,
} from '../dataAdapter';
import type { SentenceData, RowType, TrainingMode } from '../../../types';
import type { TrainingRow, VoiceKey } from '../types';

function makeSentence(overrides: Partial<SentenceData> & { rowType: RowType; rowSeq?: number }): SentenceData {
  return {
    id: 1,
    english: 'Hello',
    koreanPronounce: '헬로',
    directComprehension: '안녕',
    comprehension: '안녕하세요',
    ...overrides,
  };
}

describe('toTrainingRow', () => {
  it('converts SentenceData to TrainingRow with defaults', () => {
    const sentence = makeSentence({ rowType: 'script' });
    const row = toTrainingRow(sentence, 0);
    expect(row.rowType).toBe('script');
    expect(row.rowSeq).toBe(0);
    expect(row.speaker).toBe('');
    expect(row.note).toBe('');
  });

  it('preserves existing speaker and note', () => {
    const sentence = makeSentence({ rowType: 'script', speaker: 'Phil', note: 'emphasis' });
    const row = toTrainingRow(sentence, 3);
    expect(row.speaker).toBe('Phil');
    expect(row.note).toBe('emphasis');
    expect(row.rowSeq).toBe(3);
  });
});

describe('filterRowsForMode', () => {
  const rows: TrainingRow[] = [
    { ...makeSentence({ id: 1, rowType: 'prompt' }), rowSeq: 0, speaker: '', note: '' } as TrainingRow,
    { ...makeSentence({ id: 2, rowType: 'script', speaker: 'Phil' }), rowSeq: 1, speaker: 'Phil', note: '' } as TrainingRow,
    { ...makeSentence({ id: 3, rowType: 'script', speaker: 'Feifei' }), rowSeq: 2, speaker: 'Feifei', note: '' } as TrainingRow,
    { ...makeSentence({ id: 4, rowType: 'vocab' }), rowSeq: 3, speaker: '', note: '' } as TrainingRow,
    { ...makeSentence({ id: 5, rowType: 'reading' }), rowSeq: 4, speaker: '', note: '' } as TrainingRow,
    { ...makeSentence({ id: 6, rowType: 'expression' }), rowSeq: 5, speaker: '', note: '' } as TrainingRow,
  ];

  it('filters for repetition mode (script + reading)', () => {
    const filtered = filterRowsForMode(rows, 'repetition');
    expect(filtered.map(r => r.id)).toEqual([2, 3, 5]);
  });

  it('filters for infiniteSpeaking mode (script only)', () => {
    const filtered = filterRowsForMode(rows, 'infiniteSpeaking');
    expect(filtered.map(r => r.id)).toEqual([2, 3]);
  });

  it('filters for vocab mode (vocab + expression)', () => {
    const filtered = filterRowsForMode(rows, 'vocab');
    expect(filtered.map(r => r.id)).toEqual([4, 6]);
  });

  it('filters for freeResponse mode (prompt + script)', () => {
    const filtered = filterRowsForMode(rows, 'freeResponse');
    expect(filtered.map(r => r.id)).toEqual([1, 2, 3]);
  });

  it('filters for rolePlay mode (script with 2+ speakers)', () => {
    const filtered = filterRowsForMode(rows, 'rolePlay');
    expect(filtered.map(r => r.id)).toEqual([2, 3]);
  });
});

describe('getSupportedModes', () => {
  it('returns all basic modes for script-only rows', () => {
    const rows: TrainingRow[] = [
      { ...makeSentence({ id: 1, rowType: 'script' }), rowSeq: 0, speaker: '', note: '' } as TrainingRow,
    ];
    const modes = getSupportedModes(rows);
    expect(modes).toContain('repetition');
    expect(modes).toContain('speedListening');
    expect(modes).toContain('infiniteSpeaking');
    expect(modes).not.toContain('rolePlay');
    expect(modes).not.toContain('vocab');
    expect(modes).not.toContain('freeResponse');
  });

  it('includes rolePlay when 2+ unique speakers exist', () => {
    const rows: TrainingRow[] = [
      { ...makeSentence({ id: 1, rowType: 'script', speaker: 'A' }), rowSeq: 0, speaker: 'A', note: '' } as TrainingRow,
      { ...makeSentence({ id: 2, rowType: 'script', speaker: 'B' }), rowSeq: 1, speaker: 'B', note: '' } as TrainingRow,
    ];
    const modes = getSupportedModes(rows);
    expect(modes).toContain('rolePlay');
  });

  it('includes vocab when vocab or expression rows exist', () => {
    const rows: TrainingRow[] = [
      { ...makeSentence({ id: 1, rowType: 'vocab' }), rowSeq: 0, speaker: '', note: '' } as TrainingRow,
    ];
    const modes = getSupportedModes(rows);
    expect(modes).toContain('vocab');
  });

  it('includes freeResponse when prompt + script rows exist', () => {
    const rows: TrainingRow[] = [
      { ...makeSentence({ id: 1, rowType: 'prompt' }), rowSeq: 0, speaker: '', note: '' } as TrainingRow,
      { ...makeSentence({ id: 2, rowType: 'script' }), rowSeq: 1, speaker: '', note: '' } as TrainingRow,
    ];
    const modes = getSupportedModes(rows);
    expect(modes).toContain('freeResponse');
  });
});

describe('assignSpeakerVoices', () => {
  it('assigns alternating male/female voices to speakers', () => {
    const map = assignSpeakerVoices(['Phil', 'Feifei']);
    expect(Object.keys(map)).toHaveLength(2);
    expect(map['Phil']).toBe('male1');
    expect(map['Feifei']).toBe('female1');
  });

  it('returns empty map for no speakers', () => {
    const map = assignSpeakerVoices([]);
    expect(map).toEqual({});
  });

  it('handles single speaker', () => {
    const map = assignSpeakerVoices(['narrator']);
    expect(map['narrator']).toBe('male1');
  });

  it('cycles through voices for many speakers', () => {
    const map = assignSpeakerVoices(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(Object.keys(map)).toHaveLength(7);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/training/__tests__/dataAdapter.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement dataAdapter.ts**

```typescript
// src/hooks/training/dataAdapter.ts
import type { RowType, TrainingMode, SentenceData } from '../../types';
import type { TrainingRow, VoiceKey } from './types';

export const MODE_ROW_FILTERS: Record<TrainingMode, RowType[]> = {
  repetition: ['script', 'reading'],
  speedListening: ['script', 'reading'],
  infiniteSpeaking: ['script'],
  rolePlay: ['script'],
  vocab: ['vocab', 'expression'],
  freeResponse: ['prompt', 'script'],
};

const VOICE_ROTATION: VoiceKey[] = ['male1', 'female1', 'male2', 'female2', 'male3', 'female3'];

export function toTrainingRow(sentence: SentenceData, index: number): TrainingRow {
  return {
    ...sentence,
    rowType: sentence.rowType ?? 'script',
    rowSeq: index,
    speaker: sentence.speaker ?? '',
    note: sentence.note ?? '',
  };
}

export function filterRowsForMode(rows: TrainingRow[], mode: TrainingMode): TrainingRow[] {
  const allowedTypes = MODE_ROW_FILTERS[mode];
  const filtered = rows.filter(r => allowedTypes.includes(r.rowType));

  if (mode === 'rolePlay') {
    const speakers = new Set(filtered.map(r => r.speaker).filter(Boolean));
    if (speakers.size < 2) return [];
  }

  return filtered;
}

export function getSupportedModes(rows: TrainingRow[]): TrainingMode[] {
  const modes: TrainingMode[] = [];
  const rowTypes = new Set(rows.map(r => r.rowType));
  const speakers = new Set(rows.filter(r => r.rowType === 'script').map(r => r.speaker).filter(Boolean));

  // repetition: needs script or reading
  if (rowTypes.has('script') || rowTypes.has('reading')) {
    modes.push('repetition');
  }

  // speedListening: same as repetition
  if (rowTypes.has('script') || rowTypes.has('reading')) {
    modes.push('speedListening');
  }

  // infiniteSpeaking: needs script
  if (rowTypes.has('script')) {
    modes.push('infiniteSpeaking');
  }

  // rolePlay: needs script with 2+ unique speakers
  if (rowTypes.has('script') && speakers.size >= 2) {
    modes.push('rolePlay');
  }

  // vocab: needs vocab or expression
  if (rowTypes.has('vocab') || rowTypes.has('expression')) {
    modes.push('vocab');
  }

  // freeResponse: needs prompt AND script
  if (rowTypes.has('prompt') && rowTypes.has('script')) {
    modes.push('freeResponse');
  }

  return modes;
}

export function assignSpeakerVoices(speakers: string[]): Record<string, VoiceKey> {
  const map: Record<string, VoiceKey> = {};
  speakers.forEach((speaker, i) => {
    map[speaker] = VOICE_ROTATION[i % VOICE_ROTATION.length];
  });
  return map;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/training/__tests__/dataAdapter.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Run lint and type check**

Run: `npx eslint src/hooks/training/dataAdapter.ts src/hooks/training/__tests__/dataAdapter.test.ts && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/hooks/training/dataAdapter.ts src/hooks/training/__tests__/dataAdapter.test.ts
git commit -m "feat: add DataAdapter with RowType filtering and mode detection"
```

---

## Task 3: useTrainingData — Fetch + Adapt

**Files:**
- Create: `src/hooks/training/useTrainingData.ts`
- Create: `src/hooks/training/__tests__/useTrainingData.test.ts`

- [ ] **Step 1: Write failing tests for useTrainingData**

```typescript
// src/hooks/training/__tests__/useTrainingData.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Firestore
vi.mock('../../../firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(),
}));

import { getDocs } from 'firebase/firestore';
import { useTrainingData } from '../useTrainingData';
import type { SentenceData } from '../../../types';

const mockedGetDocs = vi.mocked(getDocs);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockSentences: SentenceData[] = [
  { id: 0, english: 'Describe a place...', koreanPronounce: '디스크라이브', directComprehension: '묘사하라', comprehension: '묘사하세요', rowType: 'prompt', speaker: '', note: '' },
  { id: 1, english: 'My favorite place is the library.', koreanPronounce: '마이 페이버릿', directComprehension: '내가 가장 좋아하는', comprehension: '내가 가장 좋아하는 곳은', rowType: 'script', speaker: '', note: '' },
  { id: 2, english: 'turn over a new leaf', koreanPronounce: '턴 오버', directComprehension: '새 출발하다', comprehension: '새 출발하다', rowType: 'vocab', speaker: '', note: '' },
];

describe('useTrainingData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and converts sentences to TrainingRows', async () => {
    mockedGetDocs.mockResolvedValueOnce({
      docs: mockSentences.map((s, i) => ({
        id: String(i),
        data: () => s,
      })),
    } as never);

    const { result } = renderHook(() => useTrainingData('L1_SPK_001'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rows).toHaveLength(3);
    expect(result.current.rows[0].rowType).toBe('prompt');
    expect(result.current.rows[0].rowSeq).toBe(0);
    expect(result.current.rows[1].speaker).toBe('');
  });

  it('computes supportedModes from fetched rows', async () => {
    mockedGetDocs.mockResolvedValueOnce({
      docs: mockSentences.map((s, i) => ({
        id: String(i),
        data: () => s,
      })),
    } as never);

    const { result } = renderHook(() => useTrainingData('L1_SPK_001'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.supportedModes).toContain('repetition');
    expect(result.current.supportedModes).toContain('freeResponse');
    expect(result.current.supportedModes).toContain('vocab');
    expect(result.current.supportedModes).not.toContain('rolePlay');
  });

  it('extracts unique speakers', async () => {
    const dialogueSentences: SentenceData[] = [
      { id: 0, english: 'Hi', koreanPronounce: '', directComprehension: '', comprehension: '', rowType: 'script', speaker: 'Phil' },
      { id: 1, english: 'Hello', koreanPronounce: '', directComprehension: '', comprehension: '', rowType: 'script', speaker: 'Feifei' },
    ];

    mockedGetDocs.mockResolvedValueOnce({
      docs: dialogueSentences.map((s, i) => ({
        id: String(i),
        data: () => s,
      })),
    } as never);

    const { result } = renderHook(() => useTrainingData('L1_BTEW_001'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.speakers).toEqual(['Phil', 'Feifei']);
  });

  it('returns empty state when setId is undefined', () => {
    const { result } = renderHook(() => useTrainingData(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.rows).toEqual([]);
    expect(result.current.supportedModes).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/training/__tests__/useTrainingData.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement useTrainingData.ts**

```typescript
// src/hooks/training/useTrainingData.ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import type { SentenceData, TrainingMode } from '../../types';
import type { TrainingRow } from './types';
import { toTrainingRow, getSupportedModes } from './dataAdapter';

async function fetchTrainingRows(setId: string): Promise<TrainingRow[]> {
  const sentencesRef = collection(db, 'learning_sets', setId, 'sentences');
  const q = query(sentencesRef, orderBy('id', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc, index) => {
    const data = doc.data() as SentenceData;
    return toTrainingRow(data, index);
  });
}

export function useTrainingData(setId: string | undefined) {
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ['trainingSet', setId],
    queryFn: () => fetchTrainingRows(setId!),
    enabled: !!setId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  });

  const supportedModes = useMemo<TrainingMode[]>(
    () => (rows.length > 0 ? getSupportedModes(rows) : []),
    [rows],
  );

  const speakers = useMemo<string[]>(() => {
    const unique = new Set(
      rows.filter(r => r.speaker).map(r => r.speaker),
    );
    return Array.from(unique);
  }, [rows]);

  return {
    rows,
    supportedModes,
    speakers,
    isLoading: !!setId && isLoading,
    error: error ? String(error) : null,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/training/__tests__/useTrainingData.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Run lint and type check**

Run: `npx eslint src/hooks/training/useTrainingData.ts src/hooks/training/__tests__/useTrainingData.test.ts && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/hooks/training/useTrainingData.ts src/hooks/training/__tests__/useTrainingData.test.ts
git commit -m "feat: add useTrainingData hook for Firestore fetch and adaptation"
```

---

## Task 4: useTrainingSession — State Machine

**Files:**
- Create: `src/hooks/training/useTrainingSession.ts`
- Create: `src/hooks/training/__tests__/useTrainingSession.test.ts`

- [ ] **Step 1: Write failing tests for the session reducer**

```typescript
// src/hooks/training/__tests__/useTrainingSession.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { sessionReducer, initialSessionState } from '../useTrainingSession';
import type { TrainingRow } from '../types';
import type { RowType } from '../../../types';

function makeRow(id: number, rowType: RowType = 'script'): TrainingRow {
  return {
    id,
    rowType,
    rowSeq: id,
    speaker: '',
    note: '',
    english: `Sentence ${id}`,
    koreanPronounce: '',
    directComprehension: '',
    comprehension: '',
  };
}

const testRows = [makeRow(0, 'prompt'), makeRow(1), makeRow(2), makeRow(3)];

describe('sessionReducer', () => {
  it('initializes session with INIT action', () => {
    const state = sessionReducer(initialSessionState, {
      type: 'INIT',
      rows: testRows,
      mode: 'repetition',
      setId: 'L1_SPK_001',
    });

    expect(state.phase).toBe('active');
    expect(state.rows).toHaveLength(4);
    expect(state.currentIndex).toBe(0);
    expect(state.round).toBe(1);
    expect(state.mode).toBe('repetition');
    expect(state.setId).toBe('L1_SPK_001');
    expect(state.isPaused).toBe(false);
  });

  it('advances to next row with NEXT', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'NEXT' });
    expect(state.currentIndex).toBe(1);
  });

  it('does not go past the last row', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'GO_TO', index: 3 });
    state = sessionReducer(state, { type: 'NEXT' });
    expect(state.currentIndex).toBe(3);
  });

  it('goes back with PREV', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'GO_TO', index: 2 });
    state = sessionReducer(state, { type: 'PREV' });
    expect(state.currentIndex).toBe(1);
  });

  it('does not go below 0 with PREV', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'PREV' });
    expect(state.currentIndex).toBe(0);
  });

  it('jumps to index with GO_TO', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'GO_TO', index: 2 });
    expect(state.currentIndex).toBe(2);
  });

  it('clamps GO_TO within valid range', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'GO_TO', index: 99 });
    expect(state.currentIndex).toBe(3);
  });

  it('advances round with NEXT_ROUND', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'infiniteSpeaking', setId: 'test', totalRounds: 4,
    });
    state = sessionReducer(state, { type: 'NEXT_ROUND' });
    expect(state.round).toBe(2);
    expect(state.currentIndex).toBe(0);
  });

  it('completes session when last round finishes', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'infiniteSpeaking', setId: 'test', totalRounds: 2,
    });
    state = sessionReducer(state, { type: 'NEXT_ROUND' }); // round 2
    state = sessionReducer(state, { type: 'NEXT_ROUND' }); // past last round
    expect(state.phase).toBe('complete');
  });

  it('toggles pause/resume', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'PAUSE' });
    expect(state.isPaused).toBe(true);
    state = sessionReducer(state, { type: 'RESUME' });
    expect(state.isPaused).toBe(false);
  });

  it('updates elapsed with TICK', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'TICK', elapsed: 5 });
    expect(state.elapsedSeconds).toBe(5);
  });

  it('sets phase to complete with COMPLETE', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'COMPLETE' });
    expect(state.phase).toBe('complete');
  });

  it('resets to initial state with RESET', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'NEXT' });
    state = sessionReducer(state, { type: 'RESET' });
    expect(state).toEqual(initialSessionState);
  });

  it('sets custom phase with SET_PHASE', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'SET_PHASE', phase: 'review' });
    expect(state.phase).toBe('review');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/training/__tests__/useTrainingSession.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement useTrainingSession.ts**

```typescript
// src/hooks/training/useTrainingSession.ts
import { useReducer, useCallback, useEffect, useRef } from 'react';
import type { TrainingMode } from '../../types';
import type { TrainingRow, TrainingSession, SessionAction, SessionPhase, ModeOptions } from './types';
import { filterRowsForMode } from './dataAdapter';

export const initialSessionState: TrainingSession = {
  setId: '',
  mode: 'repetition',
  rows: [],
  currentIndex: 0,
  round: 1,
  totalRounds: 1,
  phase: 'setup',
  startedAt: 0,
  elapsedSeconds: 0,
  isPaused: false,
};

export function sessionReducer(state: TrainingSession, action: SessionAction): TrainingSession {
  switch (action.type) {
    case 'INIT':
      return {
        ...initialSessionState,
        setId: action.setId,
        mode: action.mode,
        rows: action.rows,
        totalRounds: action.totalRounds ?? 1,
        phase: 'active',
        startedAt: Date.now(),
      };

    case 'NEXT':
      if (state.currentIndex >= state.rows.length - 1) return state;
      return { ...state, currentIndex: state.currentIndex + 1 };

    case 'PREV':
      if (state.currentIndex <= 0) return state;
      return { ...state, currentIndex: state.currentIndex - 1 };

    case 'GO_TO': {
      const index = Math.max(0, Math.min(action.index, state.rows.length - 1));
      return { ...state, currentIndex: index };
    }

    case 'NEXT_ROUND':
      if (state.round >= state.totalRounds) {
        return { ...state, phase: 'complete' };
      }
      return { ...state, round: state.round + 1, currentIndex: 0 };

    case 'SET_PHASE':
      return { ...state, phase: action.phase };

    case 'PAUSE':
      return { ...state, isPaused: true };

    case 'RESUME':
      return { ...state, isPaused: false };

    case 'TICK':
      return { ...state, elapsedSeconds: action.elapsed };

    case 'COMPLETE':
      return { ...state, phase: 'complete' };

    case 'RESET':
      return initialSessionState;

    default:
      return state;
  }
}

export function useTrainingSession(config: {
  setId: string;
  mode: TrainingMode;
  allRows: TrainingRow[];
  options?: ModeOptions;
}) {
  const { setId, mode, allRows, options } = config;

  const filteredRows = filterRowsForMode(allRows, mode);

  const [session, dispatch] = useReducer(sessionReducer, initialSessionState);

  // Timer ref for elapsed tracking
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize session when rows are available
  useEffect(() => {
    if (filteredRows.length > 0 && session.phase === 'setup') {
      dispatch({
        type: 'INIT',
        rows: filteredRows,
        mode,
        setId,
        totalRounds: options?.totalRounds,
      });
    }
  }, [filteredRows.length, mode, setId, options?.totalRounds, session.phase]);

  // Elapsed time tracking
  useEffect(() => {
    if (session.phase === 'active' && !session.isPaused) {
      const startOffset = session.elapsedSeconds;
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = startOffset + Math.floor((Date.now() - startTime) / 1000);
        dispatch({ type: 'TICK', elapsed });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [session.phase, session.isPaused, session.round]);

  // Pause on tab hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        dispatch({ type: 'PAUSE' });
      } else if (session.phase === 'active') {
        dispatch({ type: 'RESUME' });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [session.phase]);

  const next = useCallback(() => dispatch({ type: 'NEXT' }), []);
  const prev = useCallback(() => dispatch({ type: 'PREV' }), []);
  const goTo = useCallback((index: number) => dispatch({ type: 'GO_TO', index }), []);
  const nextRound = useCallback(() => dispatch({ type: 'NEXT_ROUND' }), []);
  const setPhase = useCallback((phase: SessionPhase) => dispatch({ type: 'SET_PHASE', phase }), []);
  const pause = useCallback(() => dispatch({ type: 'PAUSE' }), []);
  const resume = useCallback(() => dispatch({ type: 'RESUME' }), []);
  const complete = useCallback(() => dispatch({ type: 'COMPLETE' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    session,
    rows: session.rows,
    currentRow: session.rows[session.currentIndex] ?? null,
    next,
    prev,
    goTo,
    nextRound,
    setPhase,
    pause,
    resume,
    complete,
    reset,
    elapsed: session.elapsedSeconds,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/training/__tests__/useTrainingSession.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Run lint and type check**

Run: `npx eslint src/hooks/training/useTrainingSession.ts src/hooks/training/__tests__/useTrainingSession.test.ts && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/hooks/training/useTrainingSession.ts src/hooks/training/__tests__/useTrainingSession.test.ts
git commit -m "feat: add useTrainingSession hook with state machine and timer"
```

---

## Task 5: useTrainingAudio — TTS + Speech Recognition

**Files:**
- Create: `src/hooks/training/useTrainingAudio.ts`
- Create: `src/hooks/training/__tests__/useTrainingAudio.test.ts`

- [ ] **Step 1: Write failing tests for useTrainingAudio**

```typescript
// src/hooks/training/__tests__/useTrainingAudio.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../../services/ttsService', () => ({
  getTTSAudioUrl: vi.fn(),
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

import { getTTSAudioUrl } from '../../../services/ttsService';
import { useTrainingAudio } from '../useTrainingAudio';
import type { TrainingRow } from '../types';

const mockedGetTTS = vi.mocked(getTTSAudioUrl);

function makeRow(english: string, speaker = ''): TrainingRow {
  return {
    id: 1, rowType: 'script', rowSeq: 0, speaker, note: '',
    english, koreanPronounce: '', directComprehension: '', comprehension: '',
  };
}

describe('useTrainingAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetTTS.mockResolvedValue('blob:mock-audio-url');
  });

  it('exposes play function that calls getTTSAudioUrl', async () => {
    const { result } = renderHook(() => useTrainingAudio({ speakers: [] }));

    await act(async () => {
      await result.current.play(makeRow('Hello world'));
    });

    expect(mockedGetTTS).toHaveBeenCalledWith('Hello world', 'female1');
  });

  it('uses speakerVoiceMap for speaker-specific voice', async () => {
    const { result } = renderHook(() =>
      useTrainingAudio({ speakers: ['Phil', 'Feifei'] }),
    );

    await act(async () => {
      await result.current.play(makeRow('Hi there', 'Phil'));
    });

    expect(mockedGetTTS).toHaveBeenCalledWith('Hi there', 'male1');
  });

  it('allows voice override', async () => {
    const { result } = renderHook(() => useTrainingAudio({ speakers: [] }));

    await act(async () => {
      await result.current.play(makeRow('Test'), 'male2');
    });

    expect(mockedGetTTS).toHaveBeenCalledWith('Test', 'male2');
  });

  it('sets speed', () => {
    const { result } = renderHook(() => useTrainingAudio({ speakers: [] }));

    act(() => {
      result.current.setSpeed(1.5);
    });

    expect(result.current.speed).toBe(1.5);
  });

  it('computes speakerVoiceMap from speakers list', () => {
    const { result } = renderHook(() =>
      useTrainingAudio({ speakers: ['A', 'B', 'C'] }),
    );

    expect(result.current.speakerVoiceMap).toEqual({
      A: 'male1',
      B: 'female1',
      C: 'male2',
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/training/__tests__/useTrainingAudio.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement useTrainingAudio.ts**

```typescript
// src/hooks/training/useTrainingAudio.ts
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { getTTSAudioUrl } from '../../services/ttsService';
import { createSpeechService } from '../../services/speechService';
import type { TrainingRow, VoiceKey } from './types';
import { assignSpeakerVoices } from './dataAdapter';

const DEFAULT_VOICE: VoiceKey = 'female1';

interface UseTrainingAudioConfig {
  speakers: string[];
}

export function useTrainingAudio(config: UseTrainingAudioConfig) {
  const { speakers } = config;

  const [speed, setSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechServiceRef = useRef(createSpeechService());

  const speakerVoiceMap = useMemo(
    () => assignSpeakerVoices(speakers),
    [speakers],
  );

  const getVoiceForRow = useCallback(
    (row: TrainingRow, overrideVoice?: VoiceKey): VoiceKey => {
      if (overrideVoice) return overrideVoice;
      if (row.speaker && speakerVoiceMap[row.speaker]) {
        return speakerVoiceMap[row.speaker];
      }
      return DEFAULT_VOICE;
    },
    [speakerVoiceMap],
  );

  const play = useCallback(
    async (row: TrainingRow, voice?: VoiceKey) => {
      const selectedVoice = getVoiceForRow(row, voice);
      const url = await getTTSAudioUrl(row.english, selectedVoice);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(url);
      audio.playbackRate = speed;
      audioRef.current = audio;

      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);

      await audio.play();
    },
    [getVoiceForRow, speed],
  );

  const playSequence = useCallback(
    async (rows: TrainingRow[]) => {
      for (const row of rows) {
        await play(row);
        // Wait for audio to finish
        await new Promise<void>(resolve => {
          if (audioRef.current) {
            audioRef.current.onended = () => resolve();
          } else {
            resolve();
          }
        });
      }
    },
    [play],
  );

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    const service = speechServiceRef.current;
    setTranscript('');
    service.onResult(result => {
      if (result.matches.length > 0) {
        setTranscript(result.matches[0]);
      }
    });
    service.startListening('en-US');
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    speechServiceRef.current.stopListening();
    setIsRecording(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      speechServiceRef.current.removeAllListeners();
    };
  }, []);

  return {
    play,
    playSequence,
    stop,
    speed,
    setSpeed,
    isPlaying,
    startRecording,
    stopRecording,
    transcript,
    isRecording,
    speakerVoiceMap,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/training/__tests__/useTrainingAudio.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Run lint and type check**

Run: `npx eslint src/hooks/training/useTrainingAudio.ts src/hooks/training/__tests__/useTrainingAudio.test.ts && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/hooks/training/useTrainingAudio.ts src/hooks/training/__tests__/useTrainingAudio.test.ts
git commit -m "feat: add useTrainingAudio hook with TTS and speech recognition"
```

---

## Task 6: useTrainingProgress — Progress Tracking

**Files:**
- Create: `src/hooks/training/useTrainingProgress.ts`
- Create: `src/hooks/training/__tests__/useTrainingProgress.test.ts`

- [ ] **Step 1: Write failing tests for useTrainingProgress**

```typescript
// src/hooks/training/__tests__/useTrainingProgress.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user' } },
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
  increment: vi.fn((n: number) => ({ __increment: n })),
  serverTimestamp: vi.fn(() => ({ __serverTimestamp: true })),
  Timestamp: { now: vi.fn(() => ({ toDate: () => new Date() })) },
}));

import { useTrainingProgress } from '../useTrainingProgress';
import { writeBatch } from 'firebase/firestore';
import type { TrainingSession } from '../types';

const mockedWriteBatch = vi.mocked(writeBatch);

function makeSession(overrides: Partial<TrainingSession> = {}): TrainingSession {
  return {
    setId: 'L1_SPK_001',
    mode: 'repetition',
    rows: [],
    currentIndex: 0,
    round: 1,
    totalRounds: 1,
    phase: 'active',
    startedAt: Date.now() - 60000,
    elapsedSeconds: 60,
    isPaused: false,
    ...overrides,
  };
}

describe('useTrainingProgress', () => {
  let mockBatch: { set: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; commit: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockBatch = {
      set: vi.fn(),
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    mockedWriteBatch.mockReturnValue(mockBatch as never);
  });

  it('saveProgress calls Firestore batch write', async () => {
    const session = makeSession({ elapsedSeconds: 120 });
    const { result } = renderHook(() => useTrainingProgress(session));

    await act(async () => {
      await result.current.saveProgress();
    });

    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it('saveResult records mode and score', async () => {
    const session = makeSession({ mode: 'speedListening', elapsedSeconds: 45 });
    const { result } = renderHook(() => useTrainingProgress(session));

    await act(async () => {
      await result.current.saveResult(85);
    });

    expect(mockBatch.set).toHaveBeenCalled();
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it('does nothing when no user is authenticated', async () => {
    // Override auth mock for this test
    const { auth } = await import('../../../firebase');
    const originalUser = auth.currentUser;
    Object.defineProperty(auth, 'currentUser', { value: null, configurable: true });

    const session = makeSession();
    const { result } = renderHook(() => useTrainingProgress(session));

    await act(async () => {
      await result.current.saveProgress();
    });

    expect(mockBatch.commit).not.toHaveBeenCalled();

    Object.defineProperty(auth, 'currentUser', { value: originalUser, configurable: true });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/training/__tests__/useTrainingProgress.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement useTrainingProgress.ts**

```typescript
// src/hooks/training/useTrainingProgress.ts
import { useCallback } from 'react';
import { doc, collection, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import type { TrainingSession } from './types';
import { getTodayString } from '../useStudySession';

export function useTrainingProgress(session: TrainingSession) {
  const saveProgress = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    const batch = writeBatch(db);
    const today = getTodayString();

    // Update daily stats
    const dailyRef = doc(db, 'users', user.uid, 'daily_stats', today);
    batch.set(
      dailyRef,
      {
        date: today,
        studyTimeSeconds: increment(session.elapsedSeconds),
        sessionsCount: increment(1),
        lastUpdatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    // Update user total stats
    const userRef = doc(db, 'users', user.uid);
    batch.update(userRef, {
      'stats.totalStudyTimeSeconds': increment(session.elapsedSeconds),
      'stats.weeklyStudyTimeSeconds': increment(session.elapsedSeconds),
      'stats.lastActiveDate': today,
    });

    await batch.commit();
  }, [session.elapsedSeconds]);

  const saveResult = useCallback(
    async (score?: number) => {
      const user = auth.currentUser;
      if (!user) return;

      const batch = writeBatch(db);
      const today = getTodayString();
      const timestamp = Date.now();

      // Save mode-specific result
      const resultCollection = session.mode === 'speedListening'
        ? 'quiz_results'
        : 'speaking_results';

      const resultRef = doc(
        collection(db, 'users', user.uid, resultCollection),
        `${session.setId}_${timestamp}`,
      );

      batch.set(resultRef, {
        setId: session.setId,
        mode: session.mode,
        score: score ?? null,
        round: session.round,
        totalRounds: session.totalRounds,
        timeSpentSeconds: session.elapsedSeconds,
        completedAt: serverTimestamp(),
      });

      // Update daily stats counters
      const dailyRef = doc(db, 'users', user.uid, 'daily_stats', today);
      const counterField = session.mode === 'speedListening'
        ? 'quizzesCompleted'
        : 'speakingSessionsCompleted';

      batch.set(
        dailyRef,
        {
          date: today,
          [counterField]: increment(1),
          studyTimeSeconds: increment(session.elapsedSeconds),
          lastUpdatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      await batch.commit();
    },
    [session.setId, session.mode, session.round, session.totalRounds, session.elapsedSeconds],
  );

  return {
    saveProgress,
    saveResult,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/training/__tests__/useTrainingProgress.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Run lint and type check**

Run: `npx eslint src/hooks/training/useTrainingProgress.ts src/hooks/training/__tests__/useTrainingProgress.test.ts && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/hooks/training/useTrainingProgress.ts src/hooks/training/__tests__/useTrainingProgress.test.ts
git commit -m "feat: add useTrainingProgress hook with Firestore batch writes"
```

---

## Task 7: Barrel Export & Integration Test

**Files:**
- Create: `src/hooks/training/index.ts`

- [ ] **Step 1: Create barrel export**

```typescript
// src/hooks/training/index.ts
export type {
  TrainingRow,
  TrainingSet,
  TrainingSession,
  SessionPhase,
  SessionAction,
  ModeOptions,
  VoiceKey,
} from './types';

export {
  MODE_ROW_FILTERS,
  filterRowsForMode,
  getSupportedModes,
  assignSpeakerVoices,
  toTrainingRow,
} from './dataAdapter';

export { useTrainingData } from './useTrainingData';
export { useTrainingSession, sessionReducer, initialSessionState } from './useTrainingSession';
export { useTrainingAudio } from './useTrainingAudio';
export { useTrainingProgress } from './useTrainingProgress';
```

- [ ] **Step 2: Run all training tests**

Run: `npx vitest run src/hooks/training/`
Expected: All tests PASS

- [ ] **Step 3: Run full lint and type check**

Run: `npx eslint src/hooks/training/ && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run full test suite to check for regressions**

Run: `npx vitest run`
Expected: All existing tests still PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/training/index.ts
git commit -m "feat: add barrel export for TrainingEngine core hooks"
```

---

## Summary

| Task | What | Files | Tests |
|------|------|-------|-------|
| 1 | Types & TrainingMode | types.ts, types/index.ts | type check only |
| 2 | DataAdapter (pure functions) | dataAdapter.ts | 12 tests |
| 3 | useTrainingData (fetch + adapt) | useTrainingData.ts | 4 tests |
| 4 | useTrainingSession (state machine) | useTrainingSession.ts | 12 tests |
| 5 | useTrainingAudio (TTS + speech) | useTrainingAudio.ts | 5 tests |
| 6 | useTrainingProgress (Firestore) | useTrainingProgress.ts | 3 tests |
| 7 | Barrel export + integration | index.ts | full suite |

After Phase 1 completion, Phase 2+3 Agent Team can start: each teammate imports from `src/hooks/training` and builds their mode-specific hook + components.
