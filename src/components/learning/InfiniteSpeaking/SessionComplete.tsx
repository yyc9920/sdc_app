import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

interface SessionCompleteProps {
  totalSentences: number;
  sessionStartTime: number | null;
  onFinish: () => void;
}

export const SessionComplete = ({ totalSentences, sessionStartTime, onFinish }: SessionCompleteProps) => {
  const [elapsed] = useState(() => sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 text-center px-4"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', bounce: 0.4 }}
        className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-xl"
      >
        <Trophy className="w-14 h-14 text-white" />
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white">세션 완료!</h2>
        <p className="text-gray-500 dark:text-gray-400">4라운드를 모두 완료했습니다.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
        <div className="bg-purple-100 dark:bg-purple-900/20 rounded-2xl p-4 border border-purple-200 dark:border-purple-800">
          <p className="text-2xl font-extrabold text-purple-700 dark:text-purple-400">{totalSentences}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">문장</p>
        </div>
        <div className="bg-blue-100 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-2xl font-extrabold text-blue-700 dark:text-blue-400">
            {minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">학습 시간</p>
        </div>
      </div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={onFinish}
        className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white text-lg font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
      >
        완료
      </motion.button>
    </motion.div>
  );
};
