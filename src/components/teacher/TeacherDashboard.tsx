import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Search, UserPlus, Users, Eye } from 'lucide-react';
import type { UserProfile } from '../../hooks/useUserProfile';
import { StudentDetailModal } from '../shared/StudentDetailModal';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  const [myStudents, setMyStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // For StudentDetailModal
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 내 학생 가져오기
      const qMy = query(collection(db, 'users'), where('teacherId', '==', user.uid));
      const snapMy = await getDocs(qMy);
      setMyStudents(snapMy.docs.map(doc => doc.data() as UserProfile));

      // 전체 학생 가져오기
      const qAll = query(collection(db, 'users'), where('role', '==', 'student'));
      const snapAll = await getDocs(qAll);
      setAllStudents(snapAll.docs.map(doc => doc.data() as UserProfile));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const searchResults = searchTerm.trim() 
    ? allStudents.filter(student => student.profile.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : allStudents;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleAssignStudent = async (studentId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', studentId), {
        teacherId: user.uid
      });
      alert('내 학생으로 추가되었습니다.');
      fetchData();
    } catch (error) {
      console.error('Error assigning student:', error);
      alert('학생 추가에 실패했습니다.');
    }
  };

  const openStudentDetail = (uid: string, name: string) => {
    setSelectedStudentId(uid);
    setSelectedStudentName(name);
  };

  const closeStudentDetail = () => {
    setSelectedStudentId(null);
    setSelectedStudentName('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <header className="shrink-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <img src="/sdc_logo.png" alt="SDC" className="w-8 h-8 object-contain" />
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            선생님 대시보드
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          학생 관리 및 학습 현황 확인
        </p>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" />
            전체 학생 및 검색
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

          {searchResults.length > 0 ? (
            <div className="mt-4 space-y-3">
              {searchResults.map(student => (
                <div key={student.uid} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{student.profile.name} <span className="text-sm font-normal text-gray-500">({student.profile.age}세)</span></p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{student.profile.email || student.profile.phone}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openStudentDetail(student.uid, student.profile.name)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      상세 현황
                    </button>
                    <button
                      onClick={() => handleAssignStudent(student.uid)}
                      disabled={student.teacherId === user?.uid}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <UserPlus className="w-4 h-4" />
                      {student.teacherId === user?.uid ? '담당중' : '추가'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-6 mt-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              검색 결과가 없거나 등록된 학생이 없습니다.
            </p>
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
                <div 
                  key={student.uid} 
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow bg-gray-50 dark:bg-gray-700/30"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-lg dark:text-white">{student.profile.name} <span className="text-sm font-normal text-gray-500">({student.profile.age}세)</span></h3>
                    <button
                      onClick={() => openStudentDetail(student.uid, student.profile.name)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      상세보기
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 grid grid-cols-3 gap-2 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                    <div>
                      <span className="block text-xs text-gray-500">총 학습시간</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {Math.floor((student.stats?.totalStudyTimeSeconds || 0) / 60)}분
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500">연속 학습</span>
                      <span className="font-bold text-orange-500">
                        {student.stats?.currentStreak || 0}일
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500">마스터 문장</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {student.stats?.totalMasteredCount || 0}개
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <StudentDetailModal 
        uid={selectedStudentId} 
        isOpen={!!selectedStudentId} 
        onClose={closeStudentDetail}
        studentName={selectedStudentName}
      />
    </div>
  );
};
