import { useState, useEffect, useMemo } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase';
import { FIREBASE_REGION } from '../constants';

export type RankingType =
  | 'weekly_study_time'
  | 'total_study_time'
  | 'total_mastered'
  | 'current_streak'
  | 'longest_streak'
  | 'mode_repetition_sessions'
  | 'mode_speedListening_sessions'
  | 'mode_infiniteSpeaking_sessions'
  | 'mode_rolePlay_sessions'
  | 'mode_vocab_sessions'
  | 'mode_freeResponse_sessions';

export interface RankingEntry {
  uid: string;
  name: string;
  value: number;
  rank: number;
}

export const getRankingConfig = (type: RankingType): { field: string; label: string; unit: string } => {
  switch (type) {
    case 'weekly_study_time':
      return { field: 'stats.weeklyStudyTimeSeconds', label: '주간 학습 시간', unit: '분' };
    case 'total_study_time':
      return { field: 'stats.totalStudyTimeSeconds', label: '전체 학습 시간', unit: '분' };
    case 'total_mastered':
      return { field: 'stats.totalMasteredCount', label: '마스터 문장', unit: '개' };
    case 'current_streak':
      return { field: 'stats.currentStreak', label: '현재 연속 학습일', unit: '일' };
    case 'longest_streak':
      return { field: 'stats.longestStreak', label: '최장 연속 학습일', unit: '일' };
    case 'mode_repetition_sessions':
      return { field: 'stats.modeStats.repetition.sessions', label: '반복 학습', unit: '회' };
    case 'mode_speedListening_sessions':
      return { field: 'stats.modeStats.speedListening.sessions', label: '스피드 리스닝', unit: '회' };
    case 'mode_infiniteSpeaking_sessions':
      return { field: 'stats.modeStats.infiniteSpeaking.sessions', label: '무한 스피킹', unit: '회' };
    case 'mode_rolePlay_sessions':
      return { field: 'stats.modeStats.rolePlay.sessions', label: '대화 롤플레이', unit: '회' };
    case 'mode_vocab_sessions':
      return { field: 'stats.modeStats.vocab.sessions', label: '어휘 학습', unit: '회' };
    case 'mode_freeResponse_sessions':
      return { field: 'stats.modeStats.freeResponse.sessions', label: '자유 스피킹', unit: '회' };
  }
};

export const useRankings = (type: RankingType, maxResults: number = 50) => {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const config = useMemo(() => getRankingConfig(type), [type]);

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      setError(null);

      try {
        const functions = getFunctions(app, FIREBASE_REGION);
        const getRankingsFn = httpsCallable<{ type: string; limit: number }, RankingEntry[]>(
          functions,
          'getRankings'
        );

        const result = await getRankingsFn({ type, limit: maxResults });
        setRankings(result.data);
      } catch (err) {
        console.error('Error fetching rankings:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [type, maxResults]);

  const getUserRank = (uid: string): RankingEntry | null => {
    return rankings.find(entry => entry.uid === uid) || null;
  };

  const getTopThree = (): RankingEntry[] => {
    return rankings.slice(0, 3);
  };

  const formatValue = (value: number): string => {
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

  return {
    rankings,
    loading,
    error,
    config,
    getUserRank,
    getTopThree,
    formatValue,
  };
};
