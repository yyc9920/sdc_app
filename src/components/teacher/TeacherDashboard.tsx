import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Search, UserPlus, Users } from 'lucide-react';
import type { UserProfile } from '../../hooks/useUserProfile';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [myStudents, setMyStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMyStudents = useCallback(async () => {
    if (!user) return;
    const q = query(collection(db, 'users'), where('teacherId', '==', user.uid));
    const snapshot = await getDocs(q);
    const students = snapshot.docs.map(doc => doc.data() as UserProfile);
    setMyStudents(students);
  }, [user]);

  useEffect(() => {
    fetchMyStudents();
  }, [fetchMyStudents]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'), 
        where('role', '==', 'student'),
        where('profile.name', '>=', searchTerm),
        where('profile.name', '<=', searchTerm + '\uf8ff')
      );
      const snapshot = await getDocs(q);
      setSearchResults(snapshot.docs.map(doc => doc.data() as UserProfile));
    } catch (error) {
      console.error('Error searching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignStudent = async (studentId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', studentId), {
        teacherId: user.uid
      });
      alert('내 학생으로 추가되었습니다.');
      setSearchResults(prev => prev.filter(s => s.uid !== studentId));
      fetchMyStudents();
    } catch (error) {
      console.error('Error assigning student:', error);
      alert('학생 추가에 실패했습니다.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          선생님 대시보드
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          학생 관리 및 학습 현황 확인
        </p>
      </header>

      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" />
            학생 검색
          </h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="학생 이름으로 검색"
              className="flex-1 px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              검색
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-3">
              {searchResults.map(student => (
                <div key={student.uid} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{student.profile.name} <span className="text-sm font-normal text-gray-500">({student.profile.age}세)</span></p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{student.profile.email || student.profile.phone}</p>
                  </div>
                  <button
                    onClick={() => handleAssignStudent(student.uid)}
                    disabled={student.teacherId === user?.uid}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    {student.teacherId === user?.uid ? '담당중' : '추가'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            내 학생 목록
          </h2>
          
          {myStudents.length === 0 ? (
            <p className="text-center text-gray-500 py-6">담당하고 있는 학생이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {myStudents.map(student => (
                <div key={student.uid} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg dark:text-white">{student.profile.name} <span className="text-sm font-normal text-gray-500">({student.profile.age}세)</span></h3>
                    <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-full font-medium">
                      학습시간: {Math.floor((student.stats?.totalStudyTimeSeconds || 0) / 60)}분
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 grid grid-cols-2 gap-2">
                    <p>연속 학습: {student.stats?.currentStreak || 0}일</p>
                    <p>마스터 문장: {student.stats?.totalMasteredCount || 0}개</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
