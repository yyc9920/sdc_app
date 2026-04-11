import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Square, SkipForward, AlertTriangle, ChevronsRight } from 'lucide-react';
import { ChatBubble } from './ChatBubble';
import { getSpeakerColor, PHASE_LABELS } from '../../../constants/rolePlay';
import type { TrainingRow } from '../../../hooks/training';
import type { RolePlayPhase, TurnResult } from '../../../constants/rolePlay';

const LONG_PRESS_MS = 3000;

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
  liveWordStatuses?: string[];
  turnResults: TurnResult[];
  onStopTurn: () => void;
  onSkipTurn: () => void;
  onSkipPartnerTurn: () => void;
  onActivateSkipAll: () => void;
  skipAllPartnerTTS: boolean;
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
  liveWordStatuses,
  turnResults,
  onStopTurn,
  onSkipTurn,
  onSkipPartnerTurn,
  onActivateSkipAll,
  skipAllPartnerTTS,
}: ChatViewProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const [longPressProgress, setLongPressProgress] = useState(false);
  const longPressCompletedRef = useRef(false);

  // Scroll to bottom on each new turn
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentTurnIndex]);

  // Whether to show script for user turns
  const showUserScript = rolePlayPhase === 'GUIDED';

  // Long-press handlers for skip button
  const handlePointerDown = useCallback(() => {
    longPressCompletedRef.current = false;
    setLongPressProgress(true);
    longPressTimerRef.current = window.setTimeout(() => {
      longPressCompletedRef.current = true;
      setLongPressProgress(false);
      onActivateSkipAll();
    }, LONG_PRESS_MS);
  }, [onActivateSkipAll]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setLongPressProgress(false);
    // If long-press didn't complete, treat as regular tap
    if (!longPressCompletedRef.current) {
      onSkipPartnerTurn();
    }
  }, [onSkipPartnerTurn]);

  const handlePointerLeave = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setLongPressProgress(false);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

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
        <div className="flex items-center gap-2">
          <div className="flex items-baseline gap-2 flex-1 min-w-0">
            <h2 className="font-bold text-gray-800 dark:text-white">
              {PHASE_LABELS[rolePlayPhase]}
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              — {PHASE_SUBTITLES[rolePlayPhase]}
            </span>
          </div>
          {skipAllPartnerTTS && (
            <div className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-full shrink-0">
              <ChevronsRight className="w-3 h-3" />
              TTS 건너뛰기
            </div>
          )}
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
                liveWordStatuses={isActive && isUser ? liveWordStatuses : undefined}
                avatarColor={color}
                speakerLabel={row.speaker}
                isRecording={isActive && isUser ? isRecording : false}
              />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Partner turn controls — skip button with long-press gauge */}
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
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              onContextMenu={e => e.preventDefault()}
              className="no-callout relative overflow-hidden flex items-center justify-center w-36 h-12 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors select-none touch-none"
              aria-label="건너뛰기 (길게 누르면 모두 건너뛰기)"
            >
              {/* Long-press gauge bar */}
              <div
                className="absolute inset-0 bg-blue-400/30 dark:bg-blue-500/20 origin-left"
                style={{
                  transform: longPressProgress ? 'scaleX(1)' : 'scaleX(0)',
                  transition: longPressProgress ? `transform ${LONG_PRESS_MS}ms linear` : 'transform 0.15s ease-out',
                }}
              />
              <SkipForward className="w-5 h-5 relative z-10" />
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
                className="flex items-center justify-center w-12 h-12 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors"
                aria-label="건너뛰기"
              >
                <SkipForward className="w-4 h-4" />
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
