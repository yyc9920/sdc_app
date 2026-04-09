import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SkipForward, Pause, Play } from 'lucide-react';
import { ChatBubble } from './ChatBubble';
import { getSpeakerColor } from '../../../constants/rolePlay';
import type { TrainingRow } from '../../../hooks/training';

interface DemoViewProps {
  rows: TrainingRow[];
  speakers: string[];
  selectedRole: string;
  demoPlayingIndex: number;
  isDemoPaused: boolean;
  onSkip: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function DemoView({
  rows,
  speakers,
  selectedRole,
  demoPlayingIndex,
  isDemoPaused,
  onSkip,
  onPause,
  onResume,
}: DemoViewProps) {
  const activeRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to currently playing bubble
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [demoPlayingIndex]);

  return (
    <motion.div
      key="demo"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            전체 대화를 들어보세요
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            각 화자의 목소리로 전체 대화가 재생됩니다
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={isDemoPaused ? onResume : onPause}
            title={isDemoPaused ? '재생' : '일시정지'}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            {isDemoPaused
              ? <Play className="w-5 h-5" />
              : <Pause className="w-5 h-5" />
            }
          </button>
          <button
            onClick={onSkip}
            title="건너뛰기"
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Dialogue bubbles */}
      <div className="flex flex-col gap-4 pb-4">
        {rows.map((row, i) => {
          const isUser = row.speaker === selectedRole;
          const isActive = i === demoPlayingIndex;
          const color = getSpeakerColor(row.speaker, speakers);

          return (
            <div key={`${row.id}-${i}`} ref={isActive ? activeRef : null}>
              <ChatBubble
                row={row}
                isUser={isUser}
                isActive={isActive}
                isTTSPlaying={isActive}
                showScript={true}
                avatarColor={color}
                speakerLabel={row.speaker}
              />
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
