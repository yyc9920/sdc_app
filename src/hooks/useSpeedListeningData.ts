import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { SpeedListeningSet, Quiz } from '../types';

const LEARNING_SET_TO_SPEED_PREFIX: Record<string, string> = {
  'ultimate_speaking_beginner_1_1050': 'beginner_',
  'essential_travel_english_phrases_100': 'travel_',
  'native_30_patterns': 'native_patterns_',
};

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
        const prefix = LEARNING_SET_TO_SPEED_PREFIX[learningSetId];
        if (!prefix) {
          if (mounted) {
            setData([]);
            setLoading(false);
          }
          return;
        }

        const setsQuery = query(
          collection(db, 'speed_listening_sets'),
          orderBy('level', 'asc')
        );
        const setsSnapshot = await getDocs(setsQuery);
        
        console.log('Fetched all sets, prefix:', prefix);
        const matchingSets = setsSnapshot.docs.filter(doc => {
          const isMatch = doc.id.startsWith(prefix);
          if (isMatch) console.log('Match found:', doc.id);
          return isMatch;
        });
        
        console.log('Matching sets count:', matchingSets.length);
        
        if (matchingSets.length === 0) {
          console.warn('No sets found for prefix:', prefix);
        }

        const results = await Promise.all(matchingSets.map(async (setDoc) => {
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
            theme: setData.theme || 'Speed Listening',
            level: setData.level || 1,
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
