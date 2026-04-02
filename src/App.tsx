import { useState, useEffect } from 'react';
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
import './App.css';

type TabId = 'home' | 'learning' | 'dashboard' | 'ranking' | 'admin' | 'teacher' | 'profile';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [isNightMode, setIsNightMode] = useState(false);
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
    <>
      {renderTab()}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} role={role} />
    </>
  );
}

export default App;
