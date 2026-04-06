import { describe, it, expect, vi } from 'vitest';

// Mock firebase dependencies before importing
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
}));

vi.mock('../../firebase', () => ({
  default: {},
}));

import { getRankingConfig, type RankingType } from '../useRankings';

describe('getRankingConfig', () => {
  it('weekly_study_time config', () => {
    const config = getRankingConfig('weekly_study_time');
    expect(config.field).toBe('stats.weeklyStudyTimeSeconds');
    expect(config.label).toBe('주간 학습 시간');
    expect(config.unit).toBe('분');
  });

  it('total_study_time config', () => {
    const config = getRankingConfig('total_study_time');
    expect(config.field).toBe('stats.totalStudyTimeSeconds');
    expect(config.unit).toBe('분');
  });

  it('total_mastered config', () => {
    const config = getRankingConfig('total_mastered');
    expect(config.field).toBe('stats.totalMasteredCount');
    expect(config.unit).toBe('개');
  });

  it('current_streak config', () => {
    const config = getRankingConfig('current_streak');
    expect(config.field).toBe('stats.currentStreak');
    expect(config.unit).toBe('일');
  });

  it('longest_streak config', () => {
    const config = getRankingConfig('longest_streak');
    expect(config.field).toBe('stats.longestStreak');
    expect(config.unit).toBe('일');
  });
});

describe('formatValue logic', () => {
  // Extracted from useRankings hook
  const formatValue = (value: number, type: RankingType): string => {
    const config = getRankingConfig(type);
    if (type === 'weekly_study_time' || type === 'total_study_time') {
      const minutes = Math.floor(value / 60);
      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
      }
      return `${minutes}분`;
    }
    return `${value}${config.unit}`;
  };

  it('time: converts seconds to minutes', () => {
    expect(formatValue(120, 'weekly_study_time')).toBe('2분');
  });

  it('time: converts to hours and minutes', () => {
    expect(formatValue(5400, 'total_study_time')).toBe('1시간 30분');
  });

  it('time: hours only when no remaining minutes', () => {
    expect(formatValue(3600, 'weekly_study_time')).toBe('1시간');
  });

  it('time: 0 seconds returns 0분', () => {
    expect(formatValue(0, 'weekly_study_time')).toBe('0분');
  });

  it('mastered count: appends unit', () => {
    expect(formatValue(15, 'total_mastered')).toBe('15개');
  });

  it('streak: appends unit', () => {
    expect(formatValue(7, 'current_streak')).toBe('7일');
  });
});
