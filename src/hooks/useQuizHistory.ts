import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface QuizResult {
  id: string;
  setId: string;
  level: number;
  score: number;
  blanksTotal: number;
  blanksCorrect: number;
  completedAt: Date;
  timeSpentSeconds: number;
}

export const useQuizHistory = (uid: string | undefined, maxResults: number = 20) => {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setTimeout(() => {
        setResults([]);
        setLoading(false);
      }, 0);
      return;
    }

    const fetchResults = async () => {
      try {
        const resultsRef = collection(db, `users/${uid}/quiz_results`);
        const q = query(resultsRef, orderBy('completedAt', 'desc'), limit(maxResults));
        const snapshot = await getDocs(q);

        const data: QuizResult[] = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            setId: docData.setId,
            level: docData.level,
            score: docData.score,
            blanksTotal: docData.blanksTotal,
            blanksCorrect: docData.blanksCorrect,
            completedAt: docData.completedAt instanceof Timestamp 
              ? docData.completedAt.toDate() 
              : new Date(docData.completedAt),
            timeSpentSeconds: docData.timeSpentSeconds,
          };
        });

        setResults(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching quiz history:', err);
        setError(err as Error);
        setLoading(false);
      }
    };

    fetchResults();
  }, [uid, maxResults]);

  const getAverageScore = (): number => {
    if (results.length === 0) return 0;
    return Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
  };

  const getRecentResults = (count: number): QuizResult[] => {
    return results.slice(0, count);
  };

  return { 
    results, 
    loading, 
    error,
    getAverageScore,
    getRecentResults,
  };
};
