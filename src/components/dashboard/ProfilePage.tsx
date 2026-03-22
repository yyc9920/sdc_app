import React from 'react';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const ProfilePage: React.FC = () => {
  const { user, role, logout } = useAuth();

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          내 정보
        </h1>
      </header>

      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center">
          <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
            <UserIcon className="w-12 h-12 text-blue-600 dark:text-blue-400" />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {role === 'admin' ? '관리자' : '학생'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mb-6">
            ID: {user?.uid.substring(0, 10)}...
          </p>

          <button
            onClick={logout}
            className="w-full max-w-xs py-4 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 font-bold rounded-2xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            로그아웃
          </button>
        </div>
      </main>
    </div>
  );
};