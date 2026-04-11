import {
  Repeat,
  Headphones,
  Mic2,
  Users,
  BookOpen,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import type { TrainingMode } from '../types';

export interface ModeConfigEntry {
  label: string;
  icon: LucideIcon;
  color: string;
  bgClass: string;
  iconClass: string;
  emptyMessage: string;
}

export const MODE_CONFIG: Record<TrainingMode, ModeConfigEntry> = {
  repetition: {
    label: '반복 학습',
    icon: Repeat,
    color: 'blue',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    iconClass: 'text-blue-600 dark:text-blue-400',
    emptyMessage: '반복 학습 기록이 없습니다. 반복 학습에 도전해보세요!',
  },
  speedListening: {
    label: '스피드 리스닝',
    icon: Headphones,
    color: 'green',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    iconClass: 'text-green-600 dark:text-green-400',
    emptyMessage: '스피드 리스닝 기록이 없습니다. 스피드 리스닝에 도전해보세요!',
  },
  infiniteSpeaking: {
    label: '무한 스피킹',
    icon: Mic2,
    color: 'purple',
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    iconClass: 'text-purple-600 dark:text-purple-400',
    emptyMessage: '무한 스피킹 기록이 없습니다. 무한 스피킹에 도전해보세요!',
  },
  rolePlay: {
    label: '대화 롤플레이',
    icon: Users,
    color: 'pink',
    bgClass: 'bg-pink-100 dark:bg-pink-900/30',
    iconClass: 'text-pink-600 dark:text-pink-400',
    emptyMessage: '대화 롤플레이 기록이 없습니다. 롤플레이에 도전해보세요!',
  },
  vocab: {
    label: '어휘 학습',
    icon: BookOpen,
    color: 'amber',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    iconClass: 'text-amber-600 dark:text-amber-400',
    emptyMessage: '어휘 학습 기록이 없습니다. 어휘 학습에 도전해보세요!',
  },
  freeResponse: {
    label: '자유 스피킹',
    icon: MessageSquare,
    color: 'teal',
    bgClass: 'bg-teal-100 dark:bg-teal-900/30',
    iconClass: 'text-teal-600 dark:text-teal-400',
    emptyMessage: '자유 스피킹 기록이 없습니다. 자유 스피킹에 도전해보세요!',
  },
};

export const TRAINING_MODES: TrainingMode[] = [
  'repetition',
  'speedListening',
  'infiniteSpeaking',
  'rolePlay',
  'vocab',
  'freeResponse',
];
