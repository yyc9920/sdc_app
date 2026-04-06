import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { SpeedListeningSet, Quiz } from '../types';

/**
 * Custom hook to fetch speed listening sets from Firestore.
 * Fetches the parent set metadata and all associated sentences for a given learning set.
 * 
 * @param {string | null} learningSetId - The ID of the parent learning set.
 * @returns {Object} An object containing the sets data, loading state, and any errors.
 */
export const useSpeedListeningData = (learningSetId: string | null) => {
  const [data, setData] = useState<SpeedListeningSet[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!learningSetId) {
      setTimeout(() => {
        setData([]);
        setLoading(false);
      }, 0);
      return;
    }

    const fetchData = async () => {
      if (mounted) setLoading(true);
      setError(null);
      
      try {
        const setsQuery = query(
          collection(db, 'speed_listening_sets'),
          where('parentSetId', '==', learningSetId),
          orderBy('setNumber', 'asc')
        );
        const setsSnapshot = await getDocs(setsQuery);

        console.log(`Fetched ${setsSnapshot.docs.length} sets for learningSetId:`, learningSetId);
        
        const results = await Promise.all(setsSnapshot.docs.map(async (setDoc) => {
          const setData = setDoc.data();
          
          const sentencesQuery = query(
            collection(db, 'speed_listening_sets', setDoc.id, 'sentences'),
            orderBy('id', 'asc')
          );
          const sentencesSnapshot = await getDocs(sentencesQuery);
          
          const sentences = sentencesSnapshot.docs.map(doc => {
            const s = doc.data();
            return {
              id: s.id,
              english: s.english || '',
              korean: s.korean || '',
              properNounIndices: s.properNounIndices || []
            };
          });
          
          return {
            setId: setDoc.id,
            parentSetId: setData.parentSetId,
            theme: setData.theme || 'Speed Listening',
            level: setData.level || 1,
            setNumber: setData.setNumber || 0,
            sentences,
            quiz: setData.quiz as Quiz
          };
        }));
        
        if (mounted) {
          setData(results);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          console.error('Error fetching speed listening sets:', err);
          setError('Failed to fetch speed listening data');
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, [learningSetId]);

  return { data, loading, error };
};
