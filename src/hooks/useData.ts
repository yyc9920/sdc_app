import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import type { SentenceData } from '../types';

export const useData = () => {
  const [data, setData] = useState<SentenceData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('data.csv')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        return response.text();
      })
      .then(csv => {
        Papa.parse(csv, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedData: SentenceData[] = (results.data as Record<string, string>[]).map((row, index) => ({
              id: index,
              english: row['English Sentence'] || '',
              koreanPronounce: row['Korean Pronounce'] || '',
              directComprehension: row['Direct Comprehension'] || ''
            }));
            setData(parsedData);
            setLoading(false);
          },
          error: (error: Error) => {
            setError(error.message);
            setLoading(false);
          }
        });
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
};
