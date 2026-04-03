import React, { useState, useEffect } from 'react';
import { LogOut, User as UserIcon, Edit2, Check, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export const ProfilePage: React.FC = () => {
  const { user, role, logout } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    age: ''
  });

  useEffect(() => {
    if (profile && !isEditing) {
      setFormData({
        name: profile.profile.name || '',
        phone: profile.profile.phone || '',
        email: profile.profile.email || '',
        age: profile.profile.age ? String(profile.profile.age) : ''
      });
    }
  }, [profile, isEditing]);

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updates: Record<string, string | number> = {
        'profile.name': formData.name,
        'profile.phone': formData.phone,
        'profile.email': formData.email,
      };
      
      if (role === 'student' && formData.age) {
        updates['profile.age'] = parseInt(formData.age, 10);
      }
      
      await updateDoc(userRef, updates);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      alert('프로필 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const roleLabel = 
    role === 'admin' ? '관리자' : 
    role === 'teacher' ? '선생님' : '학생';

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <header className="shrink-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          내 정보
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-700">
          
          <div className="flex flex-col items-center border-b border-gray-100 dark:border-gray-700 pb-8 mb-8">
            <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <UserIcon className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {profile?.profile?.name || '로딩 중...'}
            </h2>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                role === 'teacher' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
              }`}>
                {roleLabel}
              </span>
            </div>
          </div>

          <div className="space-y-6 max-w-sm mx-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">프로필 정보</h3>
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  <Edit2 className="w-4 h-4" /> 수정
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsEditing(false)}
                    disabled={loading}
                    className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">이름</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                ) : (
                  <p className="font-medium text-gray-900 dark:text-white pb-2">{profile?.profile?.name || '-'}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">전화번호</label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                ) : (
                  <p className="font-medium text-gray-900 dark:text-white pb-2">{profile?.profile?.phone || '-'}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">이메일</label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                ) : (
                  <p className="font-medium text-gray-900 dark:text-white pb-2">{profile?.profile?.email || '-'}</p>
                )}
              </div>

              {role === 'student' && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">나이</label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  ) : (
                    <p className="font-medium text-gray-900 dark:text-white pb-2">{profile?.profile?.age ? `${profile.profile.age}세` : '-'}</p>
                  )}
                </div>
              )}
            </div>

            <div className="pt-8 mt-8 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={logout}
                className="w-full py-4 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 font-bold rounded-2xl transition-colors"
              >
                <LogOut className="w-5 h-5" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};