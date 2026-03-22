import React from 'react';
import { Home, Settings, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  activeTab: 'home' | 'admin' | 'teacher' | 'profile';
  onTabChange: (tab: 'home' | 'admin' | 'teacher' | 'profile') => void;
  role: 'admin' | 'teacher' | 'student' | null;
}

export const BottomNavigation: React.FC<Props> = ({ activeTab, onTabChange, role }) => {
  const tabs = [
    { id: 'home', icon: Home, label: '학습' },
    { id: 'profile', icon: User, label: '내 정보' },
  ] as const;

  let activeTabs: Array<{id: string, icon: React.ElementType, label: string}> = [...tabs];
  if (role === 'admin') {
    activeTabs = [...tabs, { id: 'admin', icon: Settings, label: '관리자' } as const];
  } else if (role === 'teacher') {
    activeTabs = [...tabs, { id: 'teacher', icon: Settings, label: '선생님' } as const];
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 pb-safe">
      <div className="max-w-md mx-auto flex justify-around items-center px-6 py-2">
        {activeTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as 'home' | 'admin' | 'teacher' | 'profile')}
              className="relative flex flex-col items-center justify-center w-16 h-14 select-none focus:outline-none group"
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute inset-0 bg-blue-50 dark:bg-blue-900/30 rounded-2xl"
                  initial={false}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              
              <div className="relative flex flex-col items-center gap-1 z-10">
                <Icon 
                  className={`w-6 h-6 transition-colors duration-200 ${
                    isActive 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                  }`} 
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={`text-[10px] font-medium transition-colors duration-200 ${
                  isActive 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {tab.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
