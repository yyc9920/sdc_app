import { describe, it, expect } from 'vitest';
import type { DailyStatsData } from '../useDailyStats';

// Test the helper logic directly (same algorithms used in the hook)

const makeStat = (date: string, studyTimeSeconds: number): DailyStatsData => ({
  date,
  studyTimeSeconds,
  sentencesStudied: 0,
});

describe('getTodayStats logic', () => {
  const findTodayStats = (stats: DailyStatsData[], today: string) =>
    stats.find(s => s.date === today) || null;

  it('finds today entry', () => {
    const stats = [makeStat('2026-04-06', 300), makeStat('2026-04-05', 200)];
    expect(findTodayStats(stats, '2026-04-06')).toEqual(stats[0]);
  });

  it('returns null when today not found', () => {
    const stats = [makeStat('2026-04-05', 200)];
    expect(findTodayStats(stats, '2026-04-06')).toBeNull();
  });

  it('returns null for empty stats', () => {
    expect(findTodayStats([], '2026-04-06')).toBeNull();
  });
});

describe('getStatsMap logic', () => {
  const toStatsMap = (stats: DailyStatsData[]) => {
    const map = new Map<string, DailyStatsData>();
    stats.forEach(s => map.set(s.date, s));
    return map;
  };

  it('converts array to Map', () => {
    const stats = [makeStat('2026-04-06', 300), makeStat('2026-04-05', 200)];
    const map = toStatsMap(stats);
    expect(map.size).toBe(2);
    expect(map.get('2026-04-06')?.studyTimeSeconds).toBe(300);
  });

  it('empty array returns empty Map', () => {
    expect(toStatsMap([]).size).toBe(0);
  });
});

describe('getTotalStudyTime logic', () => {
  const getTotalStudyTime = (stats: DailyStatsData[]) =>
    stats.reduce((sum, s) => sum + s.studyTimeSeconds, 0);

  it('sums all studyTimeSeconds', () => {
    const stats = [makeStat('2026-04-06', 300), makeStat('2026-04-05', 200)];
    expect(getTotalStudyTime(stats)).toBe(500);
  });

  it('empty array returns 0', () => {
    expect(getTotalStudyTime([])).toBe(0);
  });

  it('single entry returns its value', () => {
    expect(getTotalStudyTime([makeStat('2026-04-06', 1800)])).toBe(1800);
  });
});
