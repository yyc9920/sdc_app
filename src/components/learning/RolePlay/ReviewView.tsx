import { motion } from 'framer-motion';
import { Trophy, Clock, RefreshCw, CheckCircle2 } from 'lucide-react';
import { ChatBubble } from './ChatBubble';
import { getSpeakerColor } from '../../../constants/rolePlay';
import type { TrainingRow } from '../../../hooks/training';
import type { TurnResult } from '../../../constants/rolePlay';

interface ReviewViewProps {
  rows: TrainingRow[];
  speakers: string[];
  turnResults: TurnResult[];
  selectedRole: string;
  elapsed: number;
  overallAccuracy: number | null;
  onPlayAgain: () => void;
  onFinish: () => void;
}

function AccuracyDisplay({ accuracy }: { accuracy: number | null }) {
  if (accuracy === null) {
    return (
      <div className="text-center">
        <p className="text-4xl font-bold text-gray-400 dark:text-gray-500">—</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">음성 인식 없음</p>
      </div>
    );
  }
  const colorClass =
    accuracy >= 80 ? 'text-green-500' :
    accuracy >= 50 ? 'text-yellow-500' :
                     'text-red-500';
  return (
    <div className="text-center">
      <p className={`text-5xl font-bold ${colorClass}`}>{accuracy}%</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">평균 정확도</p>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ReviewView({
  rows,
  speakers,
  turnResults,
  selectedRole,
  elapsed,
  overallAccuracy,
  onPlayAgain,
  onFinish,
}: ReviewViewProps) {
  // Build a result lookup by rowIndex + phase (take the FREE phase result if available)
  const resultMap = new Map<number, TurnResult>();
  for (const r of turnResults) {
    // Prefer FREE > PRACTICE > GUIDED for the same row index
    const existing = resultMap.get(r.rowIndex);
    if (!existing || r.phase === 'FREE' || (r.phase === 'PRACTICE' && existing.phase === 'GUIDED')) {
      resultMap.set(r.rowIndex, r);
    }
  }

  const userTurnCount = rows.filter(r => r.speaker === selectedRole).length;

  return (
    <motion.div
      key="review"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-6 pb-6"
    >
      {/* Score card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h2 className="font-bold text-gray-800 dark:text-white">롤플레이 결과</h2>
        </div>

        <AccuracyDisplay accuracy={overallAccuracy} />

        <div className="flex justify-center gap-8 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{userTurnCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">내 턴</p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <Clock className="w-4 h-4 text-gray-400" />
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatTime(elapsed)}</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">학습 시간</p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {turnResults.filter(r => r.speaker === selectedRole && (r.score ?? 0) >= 80).length}
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">우수 턴</p>
          </div>
        </div>
      </div>

      {/* Dialogue replay */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
          대화 다시 보기
        </h3>
        <div className="flex flex-col gap-4">
          {rows.map((row, i) => {
            const isUser = row.speaker === selectedRole;
            const color = getSpeakerColor(row.speaker, speakers);
            const result = isUser ? resultMap.get(i) : undefined;

            return (
              <ChatBubble
                key={`review-${row.id}-${i}`}
                row={row}
                isUser={isUser}
                isActive={false}
                isTTSPlaying={false}
                showScript={true}
                result={result}
                avatarColor={color}
                speakerLabel={row.speaker}
              />
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onPlayAgain}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-[0.98]"
        >
          <RefreshCw className="w-4 h-4" />
          다시 하기
        </button>
        <button
          onClick={onFinish}
          className="flex-1 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-2xl shadow-md transition-all active:scale-[0.98]"
        >
          완료
        </button>
      </div>
    </motion.div>
  );
}
