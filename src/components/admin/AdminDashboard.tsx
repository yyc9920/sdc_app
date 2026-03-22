import React from 'react';
import { AdminCodeGenerator } from './AdminCodeGenerator';
import { CodeExpirationManager } from './CodeExpirationManager';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              관리자 대시보드
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              접속 코드 발급 및 관리
            </p>
          </div>
          <button 
            onClick={logout}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
            title="로그아웃"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 text-white shadow-lg">
          <h2 className="text-blue-100 font-medium mb-1">현재 로그인된 관리자</h2>
          <p className="text-xl font-bold truncate">UID: <span className="font-mono">{user?.uid.substring(0, 12)}...</span></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AdminCodeGenerator />
          
          <CodeExpirationManager />
        </div>
      </main>
    </div>
  );
};
