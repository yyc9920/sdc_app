import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from './hooks/useAuth';
import { useUserProfile } from './hooks/useUserProfile';
import { LoginOverlay } from './components/auth/LoginOverlay';
import { OnboardingForm } from './components/auth/OnboardingForm';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { ProfilePage } from './components/dashboard/ProfilePage';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { RankingPage } from './components/dashboard/RankingPage';
import { RepetitionLearningPage } from './components/home/RepetitionLearningPage';
import { LearningPage } from './components/learning/LearningPage';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import './App.css';

type TabId = 'home' | 'learning' | 'dashboard' | 'ranking' | 'admin' | 'teacher' | 'profile';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [isNightMode, setIsNightMode] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const { user, role, loading: authLoading, error: authError, loginWithCode } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid);

  useEffect(() => {
    if (isNightMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isNightMode]);

  const toggleNight = () => setIsNightMode(!isNightMode);

  if (showSplash) {
    return (
      <div 
        className={`fixed inset-0 z-[100] flex flex-col items-center justify-center ${isNightMode ? 'bg-gray-900' : 'bg-gray-50'} cursor-pointer overflow-hidden`}
        onClick={() => setShowSplash(false)}
      >
        <motion.h1
          initial={{ scale: 0.8, filter: 'blur(10px)', opacity: 0 }}
          animate={{
            scale: 1,
            filter: 'blur(0px)',
            opacity: 1,
            textShadow: ['0px 0px 0px rgba(59,130,246,0)', '0px 0px 20px rgba(59,130,246,0.8)', '0px 0px 0px rgba(59,130,246,0)'],
          }}
          transition={{
            duration: 1.5,
            textShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
          }}
          className="text-5xl md:text-7xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight text-center px-4"
        >
          SDC English Study
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          className="absolute bottom-20 text-gray-500 dark:text-gray-400 font-medium tracking-widest text-sm uppercase"
        >
          Touch anywhere to start
        </motion.p>
      </div>
    );
  }

  if (!user && !authLoading) {
    return <LoginOverlay onLogin={loginWithCode} loading={authLoading} error={authError} />;
  }

  if (authLoading || (user && profileLoading)) {
    return <LoadingSpinner fullScreen />;
  }

  if (user && profile && !profile.profileCompleted) {
    return <OnboardingForm />;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'admin':
        if (role === 'admin') return <AdminDashboard />;
        break;
      case 'teacher':
        if (role === 'teacher') return <TeacherDashboard />;
        break;
      case 'dashboard':
        return <DashboardPage />;
      case 'ranking':
        return <RankingPage />;
      case 'profile':
        return <ProfilePage />;
      case 'learning':
        return <LearningPage isNightMode={isNightMode} onToggleNight={toggleNight} />;
      case 'home':
      default:
        return <RepetitionLearningPage isNightMode={isNightMode} onToggleNight={toggleNight} />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden pt-safe">
      <ErrorBoundary>
        <div className="flex-1 relative overflow-hidden">
          {renderTab()}
        </div>
      </ErrorBoundary>
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} role={role} />
    </div>
  );
}

export default App;
