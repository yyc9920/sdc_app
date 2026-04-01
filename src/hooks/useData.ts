import { useQuery } from '@tanstack/react-query';
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
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  return {
    data: data ?? [],
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch data') : null,
  };
};
