import React from 'react';
import { AdminCodeGenerator } from './AdminCodeGenerator';
import { CodeExpirationManager } from './CodeExpirationManager';
import { UserManager } from './UserManager';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <header className="shrink-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <img src="/sdc_logo.png" alt="SDC" className="w-8 h-8 object-contain" />
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            관리자 대시보드
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          사용자 및 권한 관리
        </p>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 text-white shadow-lg flex justify-between items-center">
          <div>
            <h2 className="text-blue-100 font-medium mb-1">현재 로그인된 관리자</h2>
            <p className="text-xl font-bold truncate">{profile?.profile?.name || '관리자'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AdminCodeGenerator />
          <CodeExpirationManager />
          <UserManager />
        </div>
      </main>
    </div>
  );
};
