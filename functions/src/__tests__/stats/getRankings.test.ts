import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockLimit = vi.fn(() => ({ get: mockGet }));
  const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
  const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
  const mockCollection = vi.fn(() => ({ where: mockWhere }));

  return {
    mockDb: {
      collection: mockCollection,
      _mockGet: mockGet,
      _mockWhere: mockWhere,
      _mockOrderBy: mockOrderBy,
      _mockLimit: mockLimit,
    },
  };
});

vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase-functions/v2', () => ({ setGlobalOptions: vi.fn() }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => mockDb),
}));

import functionsTest from 'firebase-functions-test';
import { getRankings } from '../../stats/getRankings';

const testEnv = functionsTest();

describe('getRankings', () => {
  const wrapped = testEnv.wrap(getRankings);

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb._mockWhere.mockReturnValue({ orderBy: mockDb._mockOrderBy });
    mockDb._mockOrderBy.mockReturnValue({ limit: mockDb._mockLimit });
    mockDb._mockLimit.mockReturnValue({ get: mockDb._mockGet });
  });

  it('throws unauthenticated when no auth', async () => {
    await expect(
      wrapped({ data: { type: 'weekly_study_time' } } as any)
    ).rejects.toThrow(/authenticated/);
  });

  it('throws invalid-argument when type is missing', async () => {
    await expect(
      wrapped({ data: {}, auth: { uid: 'u1' } } as any)
    ).rejects.toThrow(/type is required/);
  });

  it('throws invalid-argument for invalid type', async () => {
    await expect(
      wrapped({ data: { type: 'invalid_type' }, auth: { uid: 'u1' } } as any)
    ).rejects.toThrow(/Invalid ranking type/);
  });

  it('returns ranked students sorted by value, filtering out zeros', async () => {
    mockDb._mockGet.mockResolvedValue({
      docs: [
        { id: 'u1', data: () => ({ profile: { name: 'Alice' }, stats: { weeklyStudyTimeSeconds: 3600 } }) },
        { id: 'u2', data: () => ({ profile: { name: 'Bob' }, stats: { weeklyStudyTimeSeconds: 1800 } }) },
        { id: 'u3', data: () => ({ profile: { name: '' }, stats: { weeklyStudyTimeSeconds: 0 } }) },
      ],
    });

    const result = await wrapped({
      data: { type: 'weekly_study_time' },
      auth: { uid: 'u1' },
    } as any);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ uid: 'u1', name: 'Alice', value: 3600, rank: 1 });
    expect(result[1]).toEqual({ uid: 'u2', name: 'Bob', value: 1800, rank: 2 });
  });

  it('uses correct field for each ranking type', async () => {
    mockDb._mockGet.mockResolvedValue({
      docs: [{ id: 'u1', data: () => ({ profile: { name: 'A' }, stats: { totalMasteredCount: 5 } }) }],
    });

    await wrapped({ data: { type: 'total_mastered' }, auth: { uid: 'u1' } } as any);
    expect(mockDb._mockOrderBy).toHaveBeenCalledWith('stats.totalMasteredCount', 'desc');
  });

  it('defaults name to 익명 when profile name is empty', async () => {
    mockDb._mockGet.mockResolvedValue({
      docs: [{ id: 'u1', data: () => ({ profile: {}, stats: { currentStreak: 7 } }) }],
    });

    const result = await wrapped({
      data: { type: 'current_streak' },
      auth: { uid: 'u1' },
    } as any);

    expect(result[0].name).toBe('익명');
  });
});
