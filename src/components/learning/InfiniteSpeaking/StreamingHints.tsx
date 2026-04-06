import { AnimatePresence, motion } from 'framer-motion';
import type { Hint } from '../../../hooks/useInfiniteSpeaking';

interface StreamingHintsProps {
  hints: Hint[];
}

export const StreamingHints = ({ hints }: StreamingHintsProps) => {
  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
      <AnimatePresence>
        {hints.map(hint => (
          <motion.div
            key={hint.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="bg-amber-50 dark:bg-amber-900/80 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200 px-4 py-2 rounded-xl text-sm font-medium shadow-lg max-w-sm text-center"
          >
            💡 {hint.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
