import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { SentenceData } from '../types';

const fetchLearningSetData = async (filename: string): Promise<SentenceData[]> => {
  const setId = filename.replace('.csv', '');

  const q = query(
    collection(db, `learning_sets/${setId}/sentences`),
    orderBy('id', 'asc')
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error('Data not found in database');
  }

  return snapshot.docs.map(doc => doc.data() as SentenceData);
};

export const useData = (filename: string | undefined) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['learningSet', filename],
    queryFn: () => fetchLearningSetData(filename!),
    enabled: !!filename,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  });

  return {
    data: data ?? [],
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch data') : null,
  };
};

export const usePrefetchData = () => {
  const queryClient = useQueryClient();

  const prefetch = useCallback((filename: string) => {
    queryClient.prefetchQuery({
      queryKey: ['learningSet', filename],
      queryFn: () => fetchLearningSetData(filename),
      staleTime: 30 * 60 * 1000,
    });
  }, [queryClient]);

  return { prefetch };
};
