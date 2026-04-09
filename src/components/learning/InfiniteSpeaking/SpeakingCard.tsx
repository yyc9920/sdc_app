import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { getSentenceDisplay } from '../../../utils/blankingStrategy';
import type { Round } from '../../../hooks/useInfiniteSpeaking';
import type { SpeakerStyle } from '../../../hooks/useInfiniteSpeaking';

interface SpeakingCardProps {
  sentence: string;
  koreanMeaning: string;
  round: Round;
  blankIndices: number[];
  wordStatuses: string[];
  isListening: boolean;
  isSpeaking: boolean;
  /** Optional: speaker name badge for dialogue sets */
  speakerStyle?: SpeakerStyle;
  /** R3: hide text during speaking phase */
  textVisible?: boolean;
  /** Animate transition from full text to blanks */
  blankingTransition?: boolean;
}

export const SpeakingCard = ({
  sentence,
  koreanMeaning,
  round,
  blankIndices,
  wordStatuses,
  isListening,
  isSpeaking,
  speakerStyle,
  textVisible = true,
  blankingTransition = false,
}: SpeakingCardProps) => {
  const display = getSentenceDisplay(sentence, round, blankIndices);
  const showKorean = round >= 2;

  // Pre-compute stagger delays for blanking transition
  const blankStaggerMap = useMemo(() => {
    if (!blankingTransition) return new Map<number, number>();
    const hiddenIndices = display.filter(d => !d.visible).map(d => d.index);
    const map = new Map<number, number>();
    hiddenIndices.forEach((idx, i) => {
      map.set(idx, i * 40); // 40ms stagger per word
    });
    return map;
  }, [blankingTransition, display]);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-700 space-y-6"
    >
      {/* Speaker badge */}
      {speakerStyle && (
        <div className="flex justify-start">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${speakerStyle.bgClass} ${speakerStyle.colorClass}`}
          >
            {speakerStyle.name}
          </span>
        </div>
      )}

      {/* English sentence with blanking and word highlighting */}
      <div className="flex flex-wrap gap-x-2 gap-y-3 justify-center text-2xl sm:text-3xl font-bold leading-relaxed">
        {textVisible
          ? display.map(({ word, visible, index }) => {
              const status = wordStatuses[index] ?? 'pending';
              const isCorrect = status === 'correct';
              const isIncorrect = status === 'incorrect';

              // During blanking transition: use CSS animation with stagger delay
              const isBlankTarget = blankingTransition && !visible;
              const staggerDelay = blankStaggerMap.get(index) ?? 0;

              if (!visible && !isBlankTarget) {
                // Normal blank slot (not during transition)
                return (
                  <span key={index} className="inline-flex items-center">
                    <span
                      className={`
                        inline-block border-b-4 min-w-[3rem] text-center transition-all duration-300
                        ${isCorrect
                          ? 'border-green-500 text-green-700 dark:text-green-400'
                          : isIncorrect
                            ? 'border-red-500 text-red-600 dark:text-red-400'
                            : 'border-gray-400 dark:border-gray-600 text-transparent'
                        }
                      `}
                      style={{ minWidth: `${Math.max(word.length * 0.7, 2)}em` }}
                    >
                      {isCorrect || isIncorrect ? word : '·'.repeat(word.length)}
                    </span>
                  </span>
                );
              }

              if (isBlankTarget) {
                // Transitioning blank: word fades out and is replaced by underline
                return (
                  <motion.span
                    key={index}
                    className="inline-flex items-center"
                    initial={{ opacity: 1, filter: 'blur(0px)' }}
                    animate={prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, filter: 'blur(4px)' }
                    }
                    transition={{
                      duration: 0.25,
                      delay: staggerDelay / 1000,
                      ease: 'easeOut',
                    }}
                  >
                    <span
                      className="inline-block border-b-4 border-gray-400 dark:border-gray-600 text-center text-gray-800 dark:text-gray-200"
                      style={{ minWidth: `${Math.max(word.length * 0.7, 2)}em` }}
                    >
                      {word}
                    </span>
                  </motion.span>
                );
              }

              return (
                <span
                  key={index}
                  className={`
                    transition-all duration-300
                    ${isCorrect
                      ? 'text-green-600 dark:text-green-400'
                      : isSpeaking
                        ? 'text-gray-400 dark:text-gray-500'
                        : isListening
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-800 dark:text-gray-200'
                    }
                  `}
                >
                  {word}
                </span>
              );
            })
          : (
            // R3: text hidden during speaking — show blank placeholders
            sentence.split(' ').map((word, index) => (
              <span
                key={index}
                className="inline-block border-b-4 border-gray-400 dark:border-gray-600 text-transparent"
                style={{ minWidth: `${Math.max(word.length * 0.7, 2)}em` }}
              >
                {'·'.repeat(word.length)}
              </span>
            ))
          )
        }
      </div>

      {/* Korean meaning (shown in rounds 2-4) */}
      {showKorean && koreanMeaning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <span className="inline-block text-xs font-bold text-purple-500 bg-purple-50 dark:bg-purple-900/30 px-2.5 py-1 rounded mb-2">
            한국어
          </span>
          <p className="text-xl text-gray-700 dark:text-gray-300 font-medium">
            {koreanMeaning}
          </p>
        </motion.div>
      )}

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="flex justify-center">
          <div className="flex gap-1 items-end h-6">
            {[0, 1, 2, 3, 4].map(i => (
              <motion.div
                key={i}
                className="w-1.5 bg-purple-500 rounded-full"
                animate={{ height: [8, 24, 8] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Listening indicator */}
      {isListening && (
        <div className="flex justify-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-blue-500 text-sm font-bold"
          >
            🔊 듣는 중...
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
