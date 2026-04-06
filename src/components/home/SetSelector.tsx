import { FileText } from 'lucide-react';
import type { LearningSetMeta } from '../../types';

interface SetSelectorProps {
  sets: LearningSetMeta[];
  categoryLabel: string;
  onSelect: (set: LearningSetMeta) => void;
}

export const SetSelector = ({ sets, categoryLabel, onSelect }: SetSelectorProps) => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{categoryLabel}</p>
      <div className="grid grid-cols-1 gap-3">
        {sets.map((set) => (
          <button
            key={set.setId}
            onClick={() => onSelect(set)}
            className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all hover:shadow-md text-left"
          >
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mr-3 shrink-0">
              <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{set.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{set.sentenceCount}문장</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
