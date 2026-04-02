import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface SentenceProgress {
  id: string;
  setId: string;
  sentenceId: number;
  studyTimeSeconds: number;
  repeatCount: number;
  lastStudiedAt: Date;
  status: string;
  english?: string; // Add English text
}

// Simple cache for sentence text to avoid redundant fetches
const sentenceCache = new Map<string, string>();

export const useSentenceProgress = (uid: string | undefined, maxResults: number = 50) => {
  const [progressData, setProgressData] = useState<SentenceProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setTimeout(() => {
        setProgressData([]);
        setLoading(false);
      }, 0);
      return;
    }

    const fetchProgress = async () => {
      try {
        const progressRef = collection(db, `users/${uid}/progress`);
        const q = query(progressRef, orderBy('lastStudiedAt', 'desc'), limit(maxResults));
        const snapshot = await getDocs(q);

        const data: SentenceProgress[] = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            setId: docData.setId,
            sentenceId: docData.sentenceId,
            studyTimeSeconds: docData.studyTimeSeconds || 0,
            repeatCount: docData.repeatCount || 0,
            lastStudiedAt: docData.lastStudiedAt instanceof Timestamp 
              ? docData.lastStudiedAt.toDate() 
              : new Date(docData.lastStudiedAt),
            status: docData.status || 'learning',
          };
        });

        // Fetch English text for each sentence
        const dataWithEnglish = await Promise.all(data.map(async (item) => {
          if (!item.setId || item.sentenceId == null) {
            return item;
          }

          const cacheKey = `${item.setId}_${item.sentenceId}`;
          if (sentenceCache.has(cacheKey)) {
            return { ...item, english: sentenceCache.get(cacheKey) };
          }

          try {
            // Try speed_listening_sets first (likely source for many recent items)
            let sentenceDoc = await getDoc(doc(db, `speed_listening_sets/${item.setId}/sentences/${item.sentenceId}`));
            
            // If not found, try learning_sets
            if (!sentenceDoc.exists()) {
              sentenceDoc = await getDoc(doc(db, `learning_sets/${item.setId}/sentences/${item.sentenceId}`));
            }

            if (sentenceDoc.exists()) {
              const english = sentenceDoc.data().english;
              sentenceCache.set(cacheKey, english);
              return { ...item, english };
            }
          } catch (e) {
            console.error(`Failed to fetch text for ${cacheKey}`, e);
          }
          
          return item;
        }));

        setProgressData(dataWithEnglish);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching sentence progress:', err);
        setError(err as Error);
        setLoading(false);
      }
    };

    fetchProgress();
  }, [uid, maxResults]);

  return { 
    progressData, 
    loading, 
    error
  };
};
