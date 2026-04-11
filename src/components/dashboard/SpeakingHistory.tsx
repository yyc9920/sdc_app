import React from 'react';
import { Mic2, Clock, type LucideIcon } from 'lucide-react';
import type { SpeakingResult } from '../../hooks/useSpeakingHistory';

interface SpeakingHistoryProps {
  results: SpeakingResult[];
  loading?: boolean;
  modeLabel?: string;
  modeColor?: string;
  modeBgClass?: string;
  modeIconClass?: string;
  ModeIcon?: LucideIcon;
  emptyMessage?: string;
  embedded?: boolean;
}

const formatDate = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = today.getTime() - targetDate.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;

  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}분 ${secs}초`;
  return `${secs}초`;
};

const getScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-600 dark:text-green-400';
  if (score >= 70) return 'text-blue-600 dark:text-blue-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

export const SpeakingHistory: React.FC<SpeakingHistoryProps> = ({
  results,
  loading,
  modeLabel = '무한 스피킹',
  modeBgClass = 'bg-purple-100 dark:bg-purple-900/30',
  modeIconClass = 'text-purple-600 dark:text-purple-400',
  ModeIcon = Mic2,
  emptyMessage = '아직 스피킹 기록이 없습니다.',
  embedded = false,
}) => {
  const title = `${modeLabel} 기록`;

  const wrapperClass = embedded
    ? ''
    : 'bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-100 dark:border-gray-700';

  if (loading) {
    return (
      <div className={wrapperClass}>
        {!embedded && <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h3>}
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={wrapperClass}>
        {!embedded && <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h3>}
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      {!embedded && <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h3>}

      <div className="space-y-3">
        {results.slice(0, 10).map((result) => (
          <div
            key={result.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${modeBgClass}`}>
                <ModeIcon className={`w-5 h-5 ${modeIconClass}`} />
              </div>

              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {result.sentenceCount || result.roundsCompleted ? (
                    <>
                      {result.sentenceCount ? `${result.sentenceCount}문장` : ''}
                      {result.sentenceCount && result.roundsCompleted ? ' · ' : ''}
                      {result.roundsCompleted ? `Round ${result.roundsCompleted}` : ''}
                    </>
                  ) : '완료'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span>{formatDate(result.completedAt)}</span>
                  <span>·</span>
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(result.timeSpentSeconds)}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              {result.score != null ? (
                <div className={`text-lg font-bold ${getScoreColor(result.score)}`}>
                  {result.score}점
                </div>
              ) : (
                <div className={`text-lg font-bold ${modeIconClass}`}>
                  {formatTime(result.timeSpentSeconds)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
