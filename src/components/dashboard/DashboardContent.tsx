import React from 'react';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useDailyStats } from '../../hooks/useDailyStats';
import { useQuizHistory } from '../../hooks/useQuizHistory';
import { useSentenceProgress } from '../../hooks/useSentenceProgress';
import { StatsOverview } from './StatsOverview';
import { ProgressRing } from './ProgressRing';
import { LearningHeatmap } from './LearningHeatmap';
import { QuizHistory } from './QuizHistory';
import { SentenceHistory } from './SentenceHistory';
import { LoadingSpinner } from '../LoadingSpinner';

const TOTAL_SENTENCES = 1180;

interface DashboardContentProps {
  uid: string;
}

export const DashboardContent: React.FC<DashboardContentProps> = ({ uid }) => {
  const { profile, loading: profileLoading } = useUserProfile(uid);
  const { stats: dailyStats, loading: statsLoading, getTodayStats } = useDailyStats(uid);
  const { results: quizResults, loading: quizLoading } = useQuizHistory(uid);
  const { progressData: sentenceProgress, loading: progressLoading } = useSentenceProgress(uid, 50);

  if (profileLoading || statsLoading) {
    return <LoadingSpinner fullScreen />;
  }

  const todayStats = getTodayStats();
  const masteredCount = profile?.stats?.totalMasteredCount || 0;
  const progressPercent = (masteredCount / TOTAL_SENTENCES) * 100;

  return (
    <div className="w-full h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-8 custom-scrollbar">
      <div className="p-4 sm:p-6 space-y-6">
        <StatsOverview profile={profile} todayStats={todayStats} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
            <ProgressRing 
              progress={progressPercent} 
              label="전체 진행률"
              sublabel={`${masteredCount}/${TOTAL_SENTENCES}`}
            />
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">학습 요약</h3>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <p>🔥 {profile?.stats?.currentStreak || 0}일 연속 학습 중</p>
              <p>⏰ 오늘 학습 시간: {Math.floor((todayStats?.studyTimeSeconds || 0) / 60)}분</p>
              <p>📚 총 학습한 문장 수: {profile?.stats?.totalMasteredCount || 0}개</p>
              <p>📅 최근 학습일: {profile?.stats?.lastActiveDate || '없음'}</p>
            </div>
          </div>
        </div>

        <LearningHeatmap stats={dailyStats} weeks={12} />

        <div className="grid grid-cols-1 gap-6">
          <SentenceHistory progressData={sentenceProgress} loading={progressLoading} />
          <QuizHistory results={quizResults} loading={quizLoading} />
        </div>
      </div>
    </div>
  );
};
