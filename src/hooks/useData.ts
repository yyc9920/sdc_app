import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { SentenceData } from '../types';

export const useData = (filename: string | undefined) => {
  const [data, setData] = useState<SentenceData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filename) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const setId = filename.replace('.csv', '');
        
        const q = query(
          collection(db, `learning_sets/${setId}/sentences`),
          orderBy('id', 'asc')
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          throw new Error('Data not found in database');
        }
        
        const parsedData = snapshot.docs.map(doc => doc.data() as SentenceData);
        setData(parsedData);
      } catch (err: unknown) {
        console.error('Error fetching learning set from Firestore:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to fetch data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filename]);

  return { data, loading, error };
};
