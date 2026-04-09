// src/hooks/training/__tests__/useTrainingData.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
