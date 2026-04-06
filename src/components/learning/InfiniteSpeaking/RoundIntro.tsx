import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ROUND_DESCRIPTIONS, TIMEOUTS } from '../../../constants/infiniteSpeaking';
import type { Round } from '../../../hooks/useInfiniteSpeaking';

interface RoundIntroProps {
  round: Round;
  onStart: () => void;
  handsFree: boolean;
}

export const RoundIntro = ({ round, onStart, handsFree }: RoundIntroProps) => {
  const info = ROUND_DESCRIPTIONS[round - 1];

  useEffect(() => {
    if (handsFree) {
      const timer = setTimeout(onStart, TIMEOUTS.ROUND_INTRO_MS);
      return () => clearTimeout(timer);
    }
  }, [handsFree, onStart]);

  const colors = [
    'from-blue-500 to-blue-600',
    'from-indigo-500 to-indigo-600',
    'from-purple-500 to-purple-600',
    'from-pink-500 to-pink-600',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.4, delay: 0.1 }}
        className={`w-24 h-24 rounded-full bg-gradient-to-br ${colors[round - 1]} flex items-center justify-center shadow-xl`}
      >
        <span className="text-4xl font-extrabold text-white">{round}</span>
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white">{info.title}</h2>
        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{info.subtitle}</p>
      </div>

      <p className="text-gray-500 dark:text-gray-400 max-w-sm">{info.description}</p>

      {!handsFree && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={onStart}
          className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white text-lg font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
        >
          시작하기
        </motion.button>
      )}

      {handsFree && (
        <p className="text-sm text-gray-400 animate-pulse">자동으로 시작됩니다...</p>
      )}
    </motion.div>
  );
};
