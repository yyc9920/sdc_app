import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Square, SkipForward, AlertTriangle } from 'lucide-react';
import { ChatBubble } from './ChatBubble';
import { getSpeakerColor, PHASE_LABELS } from '../../../constants/rolePlay';
import type { TrainingRow } from '../../../hooks/training';
import type { RolePlayPhase, TurnResult } from '../../../constants/rolePlay';

interface ChatViewProps {
  rows: TrainingRow[];
  speakers: string[];
  currentTurnIndex: number;
  selectedRole: string;
  rolePlayPhase: RolePlayPhase;
  isUserTurn: boolean;
  isTTSPlaying: boolean;
  isRecording: boolean;
  ttsError: boolean;
  liveTranscript: string;
  turnResults: TurnResult[];
  onStopTurn: () => void;
  onSkipTurn: () => void;
  onSkipPartnerTurn: () => void;
}

const PHASE_SUBTITLES: Partial<Record<RolePlayPhase, string>> = {
  GUIDED:   '스크립트를 보며 따라하세요',
  PRACTICE: '스크립트 없이 말해보세요',
  FREE:     '자유롭게 응답해보세요',
};

export function ChatView({
  rows,
  speakers,
  currentTurnIndex,
  selectedRole,
  rolePlayPhase,
  isUserTurn,
  isTTSPlaying,
  isRecording,
  ttsError,
  liveTranscript,
  turnResults,
  onStopTurn,
  onSkipTurn,
  onSkipPartnerTurn,
}: ChatViewProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom on each new turn
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentTurnIndex]);

  // Whether to show script for user turns
  const showUserScript = rolePlayPhase === 'GUIDED';

  return (
    <motion.div
      key="chat"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-4"
    >
      {/* Phase header */}
      <div className="sticky top-0 z-10 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur pb-2 pt-1">
        <div className="flex items-baseline gap-2">
          <h2 className="font-bold text-gray-800 dark:text-white">
            {PHASE_LABELS[rolePlayPhase]}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            — {PHASE_SUBTITLES[rolePlayPhase]}
          </span>
        </div>
      </div>

      {/* Dialogue bubbles */}
      <div className="flex flex-col gap-5 pb-4">
        {rows.map((row, i) => {
          if (i > currentTurnIndex) return null;

          const isUser = row.speaker === selectedRole;
          const isActive = i === currentTurnIndex;
          const color = getSpeakerColor(row.speaker, speakers);

          // Find result for this turn (user turns in previous phases too)
          const result = turnResults.find(r => r.rowIndex === i && r.phase === rolePlayPhase);

          // For past user turns (completed)
          const isPastUserTurn = isUser && i < currentTurnIndex;

          // Determine if script is visible for this bubble
          const bubbleShowScript =
            !isUser ||       // partner: always show
            showUserScript || // GUIDED: show for user
            isPastUserTurn;  // completed turns: show for review

          return (
            <div key={`${row.id}-${i}-${rolePlayPhase}`}>
              <ChatBubble
                row={row}
                isUser={isUser}
                isActive={isActive}
                isTTSPlaying={isActive && isTTSPlaying}
                showScript={bubbleShowScript}
                result={result}
                liveTranscript={isActive && isUser ? liveTranscript : undefined}
                avatarColor={color}
                speakerLabel={row.speaker}
              />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Partner turn controls — skip stuck TTS (devil fix #1) */}
      {isTTSPlaying && !isUserTurn && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-0 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur pt-3 pb-2 border-t border-gray-100 dark:border-gray-800"
        >
          <div className="flex items-center justify-center gap-3">
            {ttsError && (
              <div className="flex items-center gap-1.5 text-amber-500 text-sm">
                <AlertTriangle className="w-4 h-4" />
                TTS 오류
              </div>
            )}
            <button
              onClick={onSkipPartnerTurn}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <SkipForward className="w-4 h-4" />
              건너뛰기
            </button>
          </div>
        </motion.div>
      )}

      {/* User turn controls */}
      {isUserTurn && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-0 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur pt-3 pb-2 border-t border-gray-100 dark:border-gray-800"
        >
          {isRecording ? (
            <div className="flex gap-3 justify-center">
              <button
                onClick={onStopTurn}
                className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95"
              >
                <Square className="w-4 h-4" />
                말하기 완료
              </button>
              <button
                onClick={onSkipTurn}
                className="flex items-center gap-1.5 px-4 py-3 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors"
              >
                <SkipForward className="w-4 h-4" />
                건너뛰기
              </button>
            </div>
          ) : (
            // Not yet recording (waiting for turn to start)
            <div className="flex justify-center">
              <div className="text-sm text-gray-400 dark:text-gray-500 animate-pulse">
                준비 중...
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
