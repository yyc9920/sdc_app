import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { SpeedListeningSet, Quiz } from '../types';

export const useSpeedListeningData = (setId: string | null) => {
  const [data, setData] = useState<SpeedListeningSet[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!setId) {
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
        const q = query(
          collection(db, 'speed_listening_sets', setId, 'sentences'),
          orderBy('level', 'asc')
        );
        const snapshot = await getDocs(q);
        
        const levels: Record<number, SpeedListeningSet> = {};
        
        snapshot.docs.forEach(doc => {
          const item = doc.data();
          const level = item.level;
          
          if (!levels[level]) {
            levels[level] = {
              setId: `${setId}_level_${level}`,
              theme: item.theme || 'Speed Listening',
              level: level,
              sentences: [],
              quiz: item.quiz as Quiz
            };
          }
          
          levels[level].sentences.push({
            id: item.originalId,
            english: item.english || '',
            korean: item.korean || '',
            properNounIndices: item.properNounIndices || []
          });
        });
        
        if (mounted) {
          setData(Object.values(levels));
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          console.error('Error fetching speed listening set:', err);
          setError('Failed to fetch speed listening data');
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, [setId]);

  return { data, loading, error };
};
