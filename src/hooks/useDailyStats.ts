import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export interface DailyStatsData {
  date: string;
  studyTimeSeconds: number;
  sentencesStudied: number;
  sentencesMastered?: number;
  sessionsCount?: number;
  quizzesCompleted?: number;
}

/**
 * Custom hook for fetching and managing user's daily study statistics from Firestore.
 * 
 * @param {string | undefined} uid - The unique ID of the user.
 * @param {number} [days=365] - The number of past days of stats to fetch.
 * @returns {Object} An object containing stats, loading state, error, and helper functions.
 */
export const useDailyStats = (uid: string | undefined, days: number = 365) => {
  const [stats, setStats] = useState<DailyStatsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setTimeout(() => {
        setStats([]);
        setLoading(false);
      }, 0);
      return;
    }

    const fetchStats = async () => {
      try {
        const statsRef = collection(db, `users/${uid}/daily_stats`);
        const q = query(statsRef, orderBy('date', 'desc'), limit(days));
        const snapshot = await getDocs(q);

        const data: DailyStatsData[] = snapshot.docs.map(doc => ({
          date: doc.data().date,
          studyTimeSeconds: doc.data().studyTimeSeconds || 0,
          sentencesStudied: doc.data().sentencesStudied || 0,
          sentencesMastered: doc.data().sentencesMastered || 0,
          sessionsCount: doc.data().sessionsCount || 0,
          quizzesCompleted: doc.data().quizzesCompleted || 0,
        }));

        setStats(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching daily stats:', err);
        setError(err as Error);
        setLoading(false);
      }
    };

    fetchStats();
  }, [uid, days]);

  /**
   * Returns the study statistics for the current day.
   * 
   * @returns {DailyStatsData | null} Statistics for today or null if not found.
   */
  const getTodayStats = (): DailyStatsData | null => {
    // 로컬 시간 기준으로 오늘 날짜를 계산 (useStudySession의 getTodayString과 동일한 방식)
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return stats.find(s => s.date === today) || null;
  };

  /**
   * Converts the statistics array into a Map keyed by date string.
   * 
   * @returns {Map<string, DailyStatsData>} A map for quick lookup by date.
   */
  const getStatsMap = (): Map<string, DailyStatsData> => {
    const map = new Map<string, DailyStatsData>();
    stats.forEach(s => map.set(s.date, s));
    return map;
  };

  /**
   * Calculates the cumulative study time across all fetched statistics.
   * 
   * @returns {number} Total study time in seconds.
   */
  const getTotalStudyTime = (): number => {
    return stats.reduce((sum, s) => sum + s.studyTimeSeconds, 0);
  };

  return { 
    stats, 
    loading, 
    error, 
    getTodayStats, 
    getStatsMap,
    getTotalStudyTime,
  };
};
