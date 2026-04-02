import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface SpeakingResult {
  id: string;
  setId: string;
  sentenceCount: number;
  roundsCompleted: number;
  completedAt: Date;
  timeSpentSeconds: number;
}

export const useSpeakingHistory = (uid: string | undefined, maxResults: number = 20) => {
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
      try {
        const resultsRef = collection(db, `users/${uid}/speaking_results`);
        const q = query(resultsRef, orderBy('completedAt', 'desc'), limit(maxResults));
        const snapshot = await getDocs(q);

        const data: SpeakingResult[] = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            setId: d.setId,
            sentenceCount: d.sentenceCount,
            roundsCompleted: d.roundsCompleted,
            completedAt: d.completedAt instanceof Timestamp
              ? d.completedAt.toDate()
              : new Date(d.completedAt),
            timeSpentSeconds: d.timeSpentSeconds,
          };
        });

        setResults(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching speaking history:', err);
        setLoading(false);
      }
    };

    fetchResults();
  }, [uid, maxResults]);

  return { results, loading };
};
