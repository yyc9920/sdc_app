import { motion } from 'framer-motion';
import { Mic, Volume2 } from 'lucide-react';
import type { TrainingRow } from '../../../hooks/training';
import type { TurnResult, RolePlayPhase } from '../../../constants/rolePlay';

interface ChatBubbleProps {
  row: TrainingRow;
  isUser: boolean;
  isActive: boolean;
  isTTSPlaying: boolean;
  showScript: boolean;
  result?: TurnResult;
  liveTranscript?: string;
  avatarColor: { bg: string; text: string; ring: string };
  speakerLabel: string;
  phase?: RolePlayPhase;
  liveWordStatuses?: string[];
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
        인식 안 됨
      </span>
    );
  }
  const colorClass =
    score >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
    score >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' :
                  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${colorClass}`}>
      {score}%
    </span>
  );
}

export function ChatBubble({
  row,
  isUser,
  isActive,
  isTTSPlaying,
  showScript,
  result,
  liveTranscript,
  avatarColor,
  speakerLabel,
  phase,
  liveWordStatuses,
}: ChatBubbleProps) {
  const isCompleted = result !== undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`
          shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
          ${avatarColor.bg} ${avatarColor.text}
          ${isActive && !isUser ? `ring-2 ${avatarColor.ring} ${isTTSPlaying ? 'animate-pulse' : ''}` : ''}
        `}
        title={speakerLabel}
      >
        {speakerLabel.charAt(0).toUpperCase()}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-1 max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Speaker label (only shown on first bubble or active) */}
        {isActive && (
          <span className="text-xs text-gray-500 dark:text-gray-400 px-1">{speakerLabel}</span>
        )}

        <div
          className={`
            relative px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
            ${isUser
              ? `bg-blue-500 text-white rounded-tr-sm ${isActive ? 'shadow-md shadow-blue-200 dark:shadow-blue-900/30' : ''}`
              : `bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-sm ${isActive ? 'shadow-md' : ''}`
            }
            ${isActive ? 'ring-1 ring-offset-1 ' + (isUser ? 'ring-blue-300 dark:ring-blue-600' : `ring-gray-300 dark:ring-gray-500`) : ''}
          `}
        >
          {/* Content */}
          {showScript ? (
            <div>
              <p>{row.english}</p>
              {phase === 'FREE' && row.comprehension && (
                <p className="text-xs mt-1 opacity-70">{row.comprehension}</p>
              )}
            </div>
          ) : (
            <p className="text-gray-400 dark:text-gray-500 italic select-none">•••</p>
          )}

          {/* TTS playing indicator (partner) */}
          {isActive && !isUser && isTTSPlaying && (
            <span className="absolute -bottom-5 left-0 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <Volume2 className="w-3 h-3" />
              재생 중
            </span>
          )}

          {/* Recording indicator (user) */}
          {isActive && isUser && !isCompleted && (
            <span className="absolute -bottom-5 right-0 flex items-center gap-1 text-xs text-blue-500">
              <Mic className="w-3 h-3 animate-pulse" />
              녹음 중
            </span>
          )}
        </div>

        {/* Live word-by-word feedback (user active turn) */}
        {isActive && isUser && liveWordStatuses && liveWordStatuses.length > 0 ? (
          <div className="flex flex-wrap gap-1 px-1 mt-1">
            {row.english.split(' ').map((word, i) => {
              const status = liveWordStatuses[i] ?? 'pending';
              return (
                <span
                  key={i}
                  className={`text-xs font-medium px-1 rounded ${
                    status === 'correct'
                      ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {word}
                </span>
              );
            })}
          </div>
        ) : isActive && isUser && liveTranscript ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic px-1 max-w-full truncate">
            "{liveTranscript}"
          </p>
        ) : null}

        {/* Completed turn: transcript + score */}
        {isCompleted && isUser && (
          <div className="flex items-center gap-2 px-1">
            {result.transcript && (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic truncate max-w-[160px]">
                "{result.transcript}"
              </p>
            )}
            <ScoreBadge score={result.score} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
