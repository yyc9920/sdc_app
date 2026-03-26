import React, { useMemo } from 'react';
import { BookOpen, Clock, Repeat } from 'lucide-react';
import type { SentenceProgress } from '../../hooks/useSentenceProgress';
import { useSetTitles } from '../../hooks/useSetTitles';

interface SentenceHistoryProps {
  progressData: SentenceProgress[];
  loading?: boolean;
}

const formatDate = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = today.getTime() - targetDate.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return '오늘 ' + date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return '어제 ' + date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  if (days < 7) return `${days}일 전`;
  
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}초`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}분 ${secs}초`;
};



export const SentenceHistory: React.FC<SentenceHistoryProps> = ({ progressData, loading }) => {
  const setIds = useMemo(() => [...new Set(progressData.map(p => p.setId))], [progressData]);
  const { getTitle } = useSetTitles(setIds);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">최근 학습한 문장</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (progressData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">최근 학습한 문장</h3>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          아직 학습 기록이 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">최근 학습한 문장 (최대 50개)</h3>
      
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
        {progressData.map((progress) => (
          <div 
            key={progress.id}
            className="flex items-center justify-between gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 shrink-0">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 dark:text-white line-clamp-2">
                  {progress.english || `${getTitle(progress.setId)} - #${progress.sentenceId}`}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                  {getTitle(progress.setId)} • #{progress.sentenceId}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 sm:gap-2 mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(progress.studyTimeSeconds)}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1">
                    <Repeat className="w-3 h-3" />
                    {progress.repeatCount}회
                  </span>
                  <span>•</span>
                  <span>{formatDate(progress.lastStudiedAt)}</span>
                </div>
              </div>
            </div>
            
            <div className="shrink-0">
              <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                progress.status === 'mastered' || progress.studyTimeSeconds >= 300 || progress.repeatCount >= 10
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {progress.status === 'mastered' || progress.studyTimeSeconds >= 300 || progress.repeatCount >= 10 ? '마스터' : '학습중'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
