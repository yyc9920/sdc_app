// src/hooks/training/__tests__/useTrainingProgress.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user' } },
}));

vi.mock('../../useStudySession', () => ({
  getTodayString: vi.fn(() => '2026-04-09'),
  getStreakUpdates: vi.fn().mockResolvedValue({
    stats: { currentStreak: 3, longestStreak: 7, lastActiveDate: '2026-04-09' },
  }),
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
