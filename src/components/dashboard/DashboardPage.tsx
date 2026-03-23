import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useDailyStats } from '../../hooks/useDailyStats';
import { useQuizHistory } from '../../hooks/useQuizHistory';
import { StatsOverview } from './StatsOverview';
import { ProgressRing } from './ProgressRing';
import { LearningHeatmap } from './LearningHeatmap';
import { QuizHistory } from './QuizHistory';
import { LoadingSpinner } from '../LoadingSpinner';

const TOTAL_SENTENCES = 1180;

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid);
  const { stats: dailyStats, loading: statsLoading, getTodayStats } = useDailyStats(user?.uid);
  const { results: quizResults, loading: quizLoading } = useQuizHistory(user?.uid);

  if (profileLoading || statsLoading) {
    return <LoadingSpinner fullScreen />;
  }

  const todayStats = getTodayStats();
  const masteredCount = profile?.stats?.totalMasteredCount || 0;
  const progressPercent = (masteredCount / TOTAL_SENTENCES) * 100;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          학습 현황
        </h1>
        {profile?.profile?.name && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {profile.profile.name}님, 오늘도 화이팅!
          </p>
        )}
      </header>

      <main className="flex-1 p-4 sm:p-6 space-y-6">
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
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">학습 팁</h3>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              {profile?.stats?.currentStreak === 0 ? (
                <p>🎯 오늘 학습을 시작해서 연속 기록을 만들어보세요!</p>
              ) : (
                <p>🔥 {profile?.stats?.currentStreak}일 연속 학습 중! 계속 이어가세요!</p>
              )}
              {(todayStats?.studyTimeSeconds || 0) < 600 && (
                <p>⏰ 하루 10분 학습으로 꾸준히 실력을 쌓아보세요.</p>
              )}
              {progressPercent < 10 && (
                <p>📚 문장을 5분 이상 학습하거나 10회 반복하면 마스터됩니다.</p>
              )}
              {progressPercent >= 50 && (
                <p>🏆 벌써 절반 이상 마스터했어요! 대단해요!</p>
              )}
            </div>
          </div>
        </div>

        <LearningHeatmap stats={dailyStats} weeks={12} />

        <QuizHistory results={quizResults} loading={quizLoading} />
      </main>
    </div>
  );
};
