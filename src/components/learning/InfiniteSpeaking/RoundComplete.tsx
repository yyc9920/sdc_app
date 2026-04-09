import { motion } from 'framer-motion';
import { CheckCircle, ChevronRight } from 'lucide-react';
import { ROUND_DESCRIPTIONS } from '../../../constants/infiniteSpeaking';
import type { Round } from '../../../hooks/useInfiniteSpeaking';

interface RoundCompleteProps {
  round: Round;
  totalSentences: number;
  onNextRound: () => void;
  handsFree: boolean;
  isLastRound: boolean;
}

export const RoundComplete = ({ round, totalSentences, onNextRound, handsFree, isLastRound }: RoundCompleteProps) => {
  const info = ROUND_DESCRIPTIONS[round - 1];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.4 }}
      >
        <CheckCircle className="w-20 h-20 text-green-500" />
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white">
          {info.title} 완료!
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          {round === 1
            ? `${totalSentences}개 문장을 모두 들었습니다.`
            : `${totalSentences}개 문장을 모두 말했습니다.`}
        </p>
      </div>

      {!isLastRound && !handsFree && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={onNextRound}
          className="flex items-center gap-2 px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white text-lg font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
        >
          Round {round + 1}로 <ChevronRight className="w-5 h-5" />
        </motion.button>
      )}

      {!isLastRound && handsFree && (
        <p className="text-sm text-gray-400 animate-pulse">자동으로 다음 라운드로 넘어갑니다...</p>
      )}

      {isLastRound && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={onNextRound}
          className="flex items-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-700 text-white text-lg font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
        >
          결과 보기 <ChevronRight className="w-5 h-5" />
        </motion.button>
      )}
    </motion.div>
  );
};
