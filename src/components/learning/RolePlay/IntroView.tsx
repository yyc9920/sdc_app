import { useState } from 'react';
import { motion } from 'framer-motion';
import { PlayCircle, BookOpen, MessageSquare, Sparkles } from 'lucide-react';

interface IntroViewProps {
  onComplete: () => void;
}

const STEPS = [
  {
    icon: PlayCircle,
    title: '데모',
    description: '전체 대화를 들으며 흐름을 파악합니다',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  {
    icon: BookOpen,
    title: '가이드 연습',
    description: '스크립트를 보며 역할의 대사를 따라 말합니다',
    color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: MessageSquare,
    title: '연습',
    description: '스크립트 없이 기억에 의존해 말합니다',
    color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
  },
  {
    icon: Sparkles,
    title: '자유 연습',
    description: '자유롭게 응답하며 실전 감각을 키웁니다',
    color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  },
] as const;

export function IntroView({ onComplete }: IntroViewProps) {
  const [skipNext, setSkipNext] = useState(false);

  const handleStart = () => {
    if (skipNext) {
      localStorage.setItem('roleplay-skip-intro', 'true');
    }
    onComplete();
  };

  return (
    <motion.div
      key="intro"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="flex flex-col gap-6 py-4"
    >
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
          이렇게 학습해요
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          4단계로 자연스러운 대화를 익힙니다
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {STEPS.map((step, i) => (
          <div
            key={step.title}
            className="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${step.color}`}>
              <step.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                  {i + 1}
                </span>
                <h3 className="font-semibold text-gray-800 dark:text-white">
                  {step.title}
                </h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 mt-2">
        <label className="flex items-center gap-2 justify-center cursor-pointer">
          <input
            type="checkbox"
            checked={skipNext}
            onChange={e => setSkipNext(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            다시 보지 않기
          </span>
        </label>

        <button
          onClick={handleStart}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/30 transition-all active:scale-[0.98]"
        >
          시작하기
        </button>
      </div>
    </motion.div>
  );
}
