import { useMemo } from 'react';
import { useQuizHistory } from './useQuizHistory';

export interface LevelRecommendation {
  recommendedLevel: number;
  reason: 'high_performance' | 'maintain' | 'needs_practice';
  confidence: number;
  recentAvgScore: number;
  avgSecondsPerBlank: number;
  speedRating: 'fast' | 'normal' | 'slow';
  efficiencyScore: number;
}

const BASELINE_SECONDS_PER_BLANK = 8;

export const calculateSpeedBonus = (secondsPerBlank: number): number => {
  if (secondsPerBlank <= 4) return 15;
  if (secondsPerBlank <= 6) return 10;
  if (secondsPerBlank <= 8) return 5;
  if (secondsPerBlank <= 12) return 0;
  if (secondsPerBlank <= 16) return -5;
  return -10;
};

export const getSpeedRating = (secondsPerBlank: number): 'fast' | 'normal' | 'slow' => {
  if (secondsPerBlank <= 6) return 'fast';
  if (secondsPerBlank <= 12) return 'normal';
  return 'slow';
};

export const useLevelRecommendation = (
  uid: string | undefined
): LevelRecommendation | null => {
  const { results: allResults, loading } = useQuizHistory(uid, 20);

  return useMemo(() => {
    if (loading || !allResults || allResults.length === 0) {
      return null;
    }

    const latestPlayedLevel = allResults[0].level;
    const results = allResults.filter(r => r.level === latestPlayedLevel).slice(0, 5);

    if (results.length === 0) {
      return null;
    }

    const recentAvgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    
    const totalBlanks = results.reduce((sum, r) => sum + r.blanksTotal, 0);
    const totalTime = results.reduce((sum, r) => sum + r.timeSpentSeconds, 0);
    const avgSecondsPerBlank = totalBlanks > 0 ? totalTime / totalBlanks : BASELINE_SECONDS_PER_BLANK;
    
    const speedBonus = calculateSpeedBonus(avgSecondsPerBlank);
    const efficiencyScore = Math.min(100, Math.max(0, recentAvgScore + speedBonus));
    
    const speedRating = getSpeedRating(avgSecondsPerBlank);
    const confidence = Math.min(results.length / 5, 1);

    let recommendedLevel: number;
    let reason: LevelRecommendation['reason'];

    if (efficiencyScore >= 85) {
      recommendedLevel = Math.min(latestPlayedLevel + 1, 5);
      reason = 'high_performance';
    } else if (efficiencyScore >= 60) {
      recommendedLevel = latestPlayedLevel;
      reason = 'maintain';
    } else {
      recommendedLevel = Math.max(latestPlayedLevel - 1, 1);
      reason = 'needs_practice';
    }

    return {
      recommendedLevel,
      reason,
      confidence,
      recentAvgScore: Math.round(recentAvgScore),
      avgSecondsPerBlank: Math.round(avgSecondsPerBlank * 10) / 10,
      speedRating,
      efficiencyScore: Math.round(efficiencyScore),
    };
  }, [allResults, loading]);
};
