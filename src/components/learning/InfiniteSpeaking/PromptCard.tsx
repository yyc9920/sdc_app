import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import type { TrainingRow } from '../../../hooks/training/types';

interface PromptCardProps {
  row: TrainingRow;
}

export const PromptCard = ({ row }: PromptCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700"
  >
    <BookOpen className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
    <div className="space-y-1 min-w-0">
      <p className="text-xs font-bold text-indigo-500 uppercase tracking-wide">주제 / 상황</p>
      <p className="text-sm text-indigo-800 dark:text-indigo-200 font-medium leading-relaxed">
        {row.english}
      </p>
      {row.comprehension && (
        <p className="text-xs text-indigo-600 dark:text-indigo-400">{row.comprehension}</p>
      )}
      {row.note && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">{row.note}</p>
      )}
    </div>
  </motion.div>
);
