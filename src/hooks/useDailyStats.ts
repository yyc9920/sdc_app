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

  const getTodayStats = (): DailyStatsData | null => {
    const today = new Date().toISOString().split('T')[0];
    return stats.find(s => s.date === today) || null;
  };

  const getStatsMap = (): Map<string, DailyStatsData> => {
    const map = new Map<string, DailyStatsData>();
    stats.forEach(s => map.set(s.date, s));
    return map;
  };

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
