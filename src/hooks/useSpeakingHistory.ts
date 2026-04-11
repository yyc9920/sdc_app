import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { TrainingMode } from '../types';

export interface SpeakingResult {
  id: string;
  setId: string;
  mode: string;
  sentenceCount: number;
  roundsCompleted: number;
  completedAt: Date;
  timeSpentSeconds: number;
  score: number | null;
}

export const useSpeakingHistory = (
  uid: string | undefined,
  maxResults: number = 20,
  modeFilter?: TrainingMode,
) => {
  const [results, setResults] = useState<SpeakingResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setTimeout(() => {
        setResults([]);
        setLoading(false);
      }, 0);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const resultsRef = collection(db, `users/${uid}/speaking_results`);
        const q = modeFilter
          ? query(resultsRef, where('mode', '==', modeFilter), orderBy('completedAt', 'desc'), limit(maxResults))
          : query(resultsRef, orderBy('completedAt', 'desc'), limit(maxResults));
        const snapshot = await getDocs(q);

        const data: SpeakingResult[] = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            setId: d.setId,
            mode: d.mode || 'infiniteSpeaking',
            sentenceCount: d.sentenceCount,
            roundsCompleted: d.roundsCompleted,
            completedAt: d.completedAt instanceof Timestamp
              ? d.completedAt.toDate()
              : new Date(d.completedAt),
            timeSpentSeconds: d.timeSpentSeconds,
            score: d.score ?? null,
          };
        });

        setResults(data);
      } catch (err) {
        console.error('Error fetching speaking history:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [uid, maxResults, modeFilter]);

  return { results, loading };
};
