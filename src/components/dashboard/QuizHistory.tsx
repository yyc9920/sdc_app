import React, { useMemo } from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import type { QuizResult } from '../../hooks/useQuizHistory';
import { useSetTitles } from '../../hooks/useSetTitles';

interface QuizHistoryProps {
  results: QuizResult[];
  loading?: boolean;
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
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-600 dark:text-green-400';
  if (score >= 70) return 'text-blue-600 dark:text-blue-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};



export const QuizHistory: React.FC<QuizHistoryProps> = ({ results, loading }) => {
  const setIds = useMemo(() => [...new Set(results.map(r => r.setId))], [results]);
  const { getTitle } = useSetTitles(setIds);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">스피드 리스닝 기록</h3>
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">스피드 리스닝 기록</h3>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          아직 퀴즈 기록이 없습니다.
          <br />
          <span className="text-sm">스피드 리스닝에 도전해보세요!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">스피드 리스닝 기록</h3>
      
      <div className="space-y-3">
        {results.slice(0, 5).map((result) => (
          <div 
            key={result.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                result.score >= 70 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : 'bg-amber-100 dark:bg-amber-900/30'
              }`}>
                {result.score >= 70 ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                )}
              </div>
              
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {getTitle(result.setId)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  {result.level != null && <><span>Lv.{result.level}</span><span>•</span></>}
                  <span>{formatDate(result.completedAt)}</span>
                  <span>•</span>
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(result.timeSpentSeconds)}</span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`text-xl font-bold ${getScoreColor(result.score)}`}>
                {result.score}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {result.blanksCorrect}/{result.blanksTotal}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
