import { BookOpen, GraduationCap, Sparkles, Trophy, Rocket, Library } from 'lucide-react';
import type { LearningLevel } from '../../types';

interface LevelItem {
  level: LearningLevel;
  label: string;
  totalSets: number;
}

interface LevelSelectorProps {
  levels: LevelItem[];
  onSelect: (level: LearningLevel) => void;
}

const LEVEL_ICONS: Record<number, typeof BookOpen> = {
  0: Library,
  1: BookOpen,
  2: Sparkles,
  3: GraduationCap,
  4: Trophy,
  5: Rocket,
};

const LEVEL_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: 'bg-gray-50 dark:bg-gray-800/50', text: 'text-gray-500', border: 'hover:border-gray-400' },
  1: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-500', border: 'hover:border-emerald-500' },
  2: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-500', border: 'hover:border-blue-500' },
  3: { bg: 'bg-violet-50 dark:bg-violet-900/30', text: 'text-violet-500', border: 'hover:border-violet-500' },
  4: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-500', border: 'hover:border-amber-500' },
  5: { bg: 'bg-rose-50 dark:bg-rose-900/30', text: 'text-rose-500', border: 'hover:border-rose-500' },
};

export const LevelSelector = ({ levels, onSelect }: LevelSelectorProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {levels.map(({ level, label, totalSets }) => {
        const Icon = LEVEL_ICONS[level] ?? BookOpen;
        const colors = LEVEL_COLORS[level] ?? LEVEL_COLORS[1];

        return (
          <button
            key={level}
            onClick={() => onSelect(level)}
            className={`group relative flex items-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-2 border-transparent ${colors.border} transition-all hover:shadow-lg active:scale-[0.98]`}
          >
            <div className={`p-3 ${colors.bg} rounded-xl mr-4 group-hover:scale-110 transition-transform shrink-0`}>
              <Icon className={`w-7 h-7 ${colors.text}`} />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{label}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{totalSets}개 세트</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
