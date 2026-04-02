import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { DashboardContent } from './DashboardContent';
import { LoadingSpinner } from '../LoadingSpinner';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { profile, loading } = useUserProfile(user?.uid);

  if (loading || !user) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 pb-32">
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

      <main className="flex-1">
        <DashboardContent uid={user.uid} />
      </main>
    </div>
  );
};
