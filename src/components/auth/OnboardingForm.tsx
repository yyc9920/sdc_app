import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';

export const OnboardingForm: React.FC = () => {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    age: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updates: Record<string, string | boolean | number> = {
        'profile.name': formData.name,
        'profile.phone': formData.phone,
        'profile.email': formData.email,
        profileCompleted: true
      };
      
      if (role === 'student' && formData.age) {
        updates['profile.age'] = parseInt(formData.age, 10);
      }
      
      await updateDoc(userRef, updates);
    } catch (err) {
      console.error("Error saving profile:", err);
      alert('프로필 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 p-8 sm:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700"
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">환영합니다!</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            서비스 시작을 위해 기본 정보를 입력해 주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">이름 *</label>
            <input 
              required type="text" name="name" value={formData.name} onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="홍길동"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">전화번호 *</label>
            <input 
              required type="tel" name="phone" value={formData.phone} onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="010-1234-5678"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">이메일 *</label>
            <input 
              required type="email" name="email" value={formData.email} onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="example@email.com"
            />
          </div>
          
          {role === 'student' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">나이 *</label>
              <input 
                required type="number" name="age" min="1" max="100" value={formData.age} onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="나이를 입력하세요"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl transition-all"
          >
            {loading ? '저장 중...' : '시작하기'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
