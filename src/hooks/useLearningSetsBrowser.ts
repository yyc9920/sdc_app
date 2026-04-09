import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { LearningSetMeta, LearningLevel, CategoryCode } from '../types';
import { CATEGORY_MAP, LEVEL_LABELS } from '../constants/categories';

const LEARNING_MODE_TO_TRAINING: Record<string, string> = {
  repetition: 'repetition',
  speed_listening: 'speedListening',
  infinite_speaking: 'infiniteSpeaking',
  role_play: 'rolePlay',
  vocab: 'vocab',
  free_response: 'freeResponse',
};

interface CategoryGroup {
  code: CategoryCode;
  label: string;
  sets: LearningSetMeta[];
}

interface LevelGroup {
  level: LearningLevel;
  label: string;
  categories: CategoryGroup[];
  totalSets: number;
}

const fetchAllSets = async (): Promise<LearningSetMeta[]> => {
  const q = query(collection(db, 'learning_sets'), orderBy('setId', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((doc) => doc.data() as LearningSetMeta)
    .filter((s) => s.status === 'ready');
};

function groupByLevelAndCategory(sets: LearningSetMeta[]): LevelGroup[] {
  const levelMap = new Map<number, Map<string, LearningSetMeta[]>>();

  for (const set of sets) {
    const level = set.level ?? 0;
    if (!levelMap.has(level)) {
      levelMap.set(level, new Map());
    }
    const catMap = levelMap.get(level)!;
    const cat = set.category ?? 'LEGACY';
    if (!catMap.has(cat)) {
      catMap.set(cat, []);
    }
    catMap.get(cat)!.push(set);
  }

  const levels: LevelGroup[] = [];

  for (const [level, catMap] of [...levelMap.entries()].sort((a, b) => a[0] - b[0])) {
    const categories: CategoryGroup[] = [];
    for (const [code, catSets] of [...catMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      categories.push({
        code: code as CategoryCode,
        label: CATEGORY_MAP[code as CategoryCode]?.label ?? code,
        sets: catSets.sort((a, b) => a.setId.localeCompare(b.setId)),
      });
    }

    levels.push({
      level: level as LearningLevel,
      label: LEVEL_LABELS[level] ?? `Level ${level}`,
      categories,
      totalSets: categories.reduce((sum, c) => sum + c.sets.length, 0),
    });
  }

  return levels;
}

export const useLearningSetsBrowser = (mode?: string | null) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['learningSetsBrowser'],
    queryFn: fetchAllSets,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });

  const filteredData = useMemo(() => {
    if (!data || !mode) return data ?? [];
    const trainingMode = LEARNING_MODE_TO_TRAINING[mode];
    if (!trainingMode) return data;

    if (mode === 'speed_listening') {
      return data.filter(s =>
        !('hasSpeedListening' in s) || s.hasSpeedListening === true
      );
    }

    return data.filter(s =>
      !s.supportedModes || s.supportedModes.includes(trainingMode)
    );
  }, [data, mode]);

  const levels = filteredData.length > 0 ? groupByLevelAndCategory(filteredData) : [];

  return {
    levels,
    allSets: filteredData ?? [],
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load sets') : null,
  };
};
