// src/hooks/training/useTrainingData.ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import type { SentenceData, TrainingMode } from '../../types';
import type { TrainingRow } from './types';
import { toTrainingRow, getSupportedModes } from './dataAdapter';

async function fetchTrainingRows(setId: string): Promise<TrainingRow[]> {
  const sentencesRef = collection(db, 'learning_sets', setId, 'sentences');
  const q = query(sentencesRef, orderBy('id', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc, index) => {
    const data = doc.data() as SentenceData;
    return toTrainingRow(data, index);
  });
}

export function useTrainingData(setId: string | undefined) {
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ['trainingSet', setId],
    queryFn: () => fetchTrainingRows(setId!),
    enabled: !!setId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  });

  const supportedModes = useMemo<TrainingMode[]>(
    () => (rows.length > 0 ? getSupportedModes(rows) : []),
    [rows],
  );

  const speakers = useMemo<string[]>(() => {
    const unique = new Set(
      rows.filter(r => r.speaker).map(r => r.speaker),
    );
    return Array.from(unique);
  }, [rows]);

  return {
    rows,
    supportedModes,
    speakers,
    isLoading: !!setId && isLoading,
    error: error ? String(error) : null,
  };
}
