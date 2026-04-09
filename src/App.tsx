import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import sdcLogo from './assets/sdc_logo.png';
import sdcLogoLong from './assets/sdc_logo_long.png';
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
import { LearningPage } from './components/learning/LearningPage';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { useTheme } from './hooks/useTheme';
import './App.css';

type TabId = 'learning' | 'dashboard' | 'ranking' | 'admin' | 'teacher' | 'profile';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('learning');
  const [tabResetKey, setTabResetKey] = useState(0);

  const handleTabChange = useCallback((tab: TabId) => {
    if (tab === activeTab) {
      setTabResetKey(prev => prev + 1);
    } else {
      setActiveTab(tab);
    }
  }, [activeTab]);
  const { isNightMode, toggleNight } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const { user, role, loading: authLoading, error: authError, loginWithCode } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid);

  if (showSplash) {
    return (
      <div 
        className={`fixed inset-0 z-[100] flex flex-col items-center justify-center ${isNightMode ? 'bg-gray-900' : 'bg-gray-50'} cursor-pointer overflow-hidden`}
        onClick={() => setShowSplash(false)}
      >
        {/* Mobile: square logo, PC: wide logo */}
        <motion.img
          src={sdcLogo}
          alt="SDC Academy"
          initial={{ scale: 0.8, filter: 'blur(10px)', opacity: 0 }}
          animate={{ scale: 1, filter: 'blur(0px)', opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="w-40 h-40 object-contain block md:hidden"
        />
        <motion.img
          src={sdcLogoLong}
          alt="SDC Academy"
          initial={{ scale: 0.8, filter: 'blur(10px)', opacity: 0 }}
          animate={{ scale: 1, filter: 'blur(0px)', opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="h-24 object-contain hidden md:block px-8"
        />
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
      default:
        return <LearningPage isNightMode={isNightMode} onToggleNight={toggleNight} />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden pt-safe">
      <ErrorBoundary>
        <div className="flex-1 relative overflow-hidden" key={`${activeTab}-${tabResetKey}`}>
          {renderTab()}
        </div>
      </ErrorBoundary>
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} role={role} />
    </div>
  );
}

export default App;
