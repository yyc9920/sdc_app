import { Layers } from 'lucide-react';
import type { CategoryCode } from '../../types';

interface CategoryItem {
  code: CategoryCode;
  label: string;
  sets: { setId: string }[];
}

interface CategorySelectorProps {
  categories: CategoryItem[];
  levelLabel: string;
  onSelect: (code: CategoryCode) => void;
}

export const CategorySelector = ({ categories, levelLabel, onSelect }: CategorySelectorProps) => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{levelLabel}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map(({ code, label, sets }) => (
          <button
            key={code}
            onClick={() => onSelect(code)}
            className="group flex items-center p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400 transition-all hover:shadow-lg active:scale-[0.98]"
          >
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl mr-4 group-hover:scale-110 transition-transform shrink-0">
              <Layers className="w-6 h-6 text-blue-500" />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">{label}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{sets.length}개 세트</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
