import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { SentenceData } from '../types';
import { toTrainingRow, assignSpeakerVoices } from './training/dataAdapter';
import { prefetchSetTTS } from '../services/ttsService';

/**
 * When setId is provided, watches for sentence data in the react-query cache
 * and prefetches TTS audio for all sentences with correct speaker voices.
 *
 * Uses the 'learningSet' query key populated by usePrefetchData (not 'trainingSet').
 * Cancels in-flight prefetch when setId changes or component unmounts.
 */
export function useTTSPrefetch(setId: string | null) {
  const queryClient = useQueryClient();
  const cancelRef = useRef<{ cancel: () => void } | null>(null);

  useEffect(() => {
    cancelRef.current?.cancel();
    cancelRef.current = null;
    if (!setId) return;

    const startPrefetch = (data: SentenceData[]) => {
      const rows = data.map((s, i) => toTrainingRow(s, i));
      const speakers = [...new Set(rows.map(r => r.speaker).filter(Boolean))] as string[];
      const voiceMap = assignSpeakerVoices(speakers);
      const items = rows
        .filter(r =>
          r.rowType === 'script' || r.rowType === 'reading' ||
          r.rowType === 'vocab' || r.rowType === 'expression'
        )
        .map(r => ({
          text: r.english,
          voiceKey: (r.speaker && voiceMap[r.speaker]) || 'female1',
        }));
      cancelRef.current = prefetchSetTTS(items);
    };

    // If data is already cached, start immediately
    const existing = queryClient.getQueryData<SentenceData[]>(['learningSet', setId]);
    if (existing && existing.length > 0) {
      startPrefetch(existing);
      return () => { cancelRef.current?.cancel(); };
    }

    // Otherwise, watch for cache updates
    const unsub = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query?.queryKey?.[0] !== 'learningSet' ||
          event?.query?.queryKey?.[1] !== setId) return;
      const data = queryClient.getQueryData<SentenceData[]>(['learningSet', setId]);
      if (data && data.length > 0) {
        unsub();
        startPrefetch(data);
      }
    });

    return () => {
      unsub();
      cancelRef.current?.cancel();
    };
  }, [setId, queryClient]);
}
