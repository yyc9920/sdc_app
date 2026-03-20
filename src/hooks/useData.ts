import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import type { SentenceData } from '../types';

export const useData = (filename: string | undefined) => {
  const [data, setData] = useState<SentenceData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [prevFilename, setPrevFilename] = useState(filename);

  if (filename !== prevFilename) {
    setPrevFilename(filename);
    setData([]);
    setLoading(!!filename);
    setError(null);
  }

  useEffect(() => {
    if (!filename) {
      return;
    }

    fetch(import.meta.env.BASE_URL + filename)
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
              directComprehension: row['Direct Comprehension'] || '',
              comprehension: row['Comprehension'] || '',
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
      .catch(error => {
        setError(error.message);
        setLoading(false);
      });
  }, [filename]);

  return { data, loading, error };
};
