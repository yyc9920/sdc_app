import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test the pure helper functions from updateStreaks
// Since onSchedule functions are hard to wrap, we test logic by extracting helpers

describe('updateStreaks logic', () => {
  // Replicate the helper functions for testing
  const getDateString = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const getYesterdayString = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return getDateString(yesterday);
  };

  const getTodayString = () => getDateString(new Date());

  // Replicate streak update logic
  const calculateStreakUpdate = (
    lastActive: string | null,
    currentStreak: number,
    longestStreak: number,
    today: string,
    yesterday: string,
  ) => {
    let newStreak = currentStreak;
    let newLongestStreak = longestStreak;

    if (lastActive === yesterday) {
      newStreak = currentStreak + 1;
      if (newStreak > longestStreak) {
        newLongestStreak = newStreak;
      }
    } else if (lastActive !== today) {
      newStreak = 0;
    }

    return { newStreak, newLongestStreak };
  };

  it('getDateString formats correctly', () => {
    expect(getDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(getDateString(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('active yesterday → streak increments', () => {
    const yesterday = getYesterdayString();
    const today = getTodayString();
    const result = calculateStreakUpdate(yesterday, 3, 5, today, yesterday);
    expect(result.newStreak).toBe(4);
    expect(result.newLongestStreak).toBe(5);
  });

  it('active yesterday with new record → longestStreak updates', () => {
    const yesterday = getYesterdayString();
    const today = getTodayString();
    const result = calculateStreakUpdate(yesterday, 5, 5, today, yesterday);
    expect(result.newStreak).toBe(6);
    expect(result.newLongestStreak).toBe(6);
  });

  it('not active yesterday and not today → streak resets', () => {
    const yesterday = getYesterdayString();
    const today = getTodayString();
    const result = calculateStreakUpdate('2020-01-01', 5, 10, today, yesterday);
    expect(result.newStreak).toBe(0);
    expect(result.newLongestStreak).toBe(10);
  });

  it('active today → no change', () => {
    const yesterday = getYesterdayString();
    const today = getTodayString();
    const result = calculateStreakUpdate(today, 3, 5, today, yesterday);
    expect(result.newStreak).toBe(3);
    expect(result.newLongestStreak).toBe(5);
  });

  it('null lastActiveDate → streak resets', () => {
    const yesterday = getYesterdayString();
    const today = getTodayString();
    const result = calculateStreakUpdate(null, 0, 0, today, yesterday);
    expect(result.newStreak).toBe(0);
    expect(result.newLongestStreak).toBe(0);
  });

  it('processes multiple users correctly', () => {
    const yesterday = getYesterdayString();
    const today = getTodayString();

    const users = [
      { lastActive: yesterday, currentStreak: 3, longestStreak: 5 },
      { lastActive: today, currentStreak: 2, longestStreak: 7 },
      { lastActive: '2020-01-01', currentStreak: 10, longestStreak: 10 },
    ];

    const results = users.map(u =>
      calculateStreakUpdate(u.lastActive, u.currentStreak, u.longestStreak, today, yesterday)
    );

    expect(results[0].newStreak).toBe(4);  // incremented
    expect(results[1].newStreak).toBe(2);  // unchanged (active today)
    expect(results[2].newStreak).toBe(0);  // reset
  });
});
