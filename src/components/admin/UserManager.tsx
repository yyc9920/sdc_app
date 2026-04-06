import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import app from '../../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { FIREBASE_REGION } from '../../constants';
import type { UserProfile } from '../../hooks/useUserProfile';
import { Users, UserX, Clock, CheckSquare, Eye } from 'lucide-react';
import { StudentDetailModal } from '../shared/StudentDetailModal';

export const UserManager: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [accessCodes, setAccessCodes] = useState<Record<string, { codeId: string, expiresAt: Date | null }>>({});
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [extensionDays, setExtensionDays] = useState<number>(30);
  const [isExtending, setIsExtending] = useState(false);

  // For StudentDetailModal
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');

  const fetchUsersAndCodes = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(query(collection(db, 'users')));
      setUsers(usersSnap.docs.map(doc => doc.data() as UserProfile));

      const codesSnap = await getDocs(query(collection(db, 'access_codes')));
      const codesMap: Record<string, { codeId: string, expiresAt: Date | null }> = {};
      codesSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.code) {
          codesMap[data.code] = {
            codeId: doc.id,
            expiresAt: data.expiresAt ? data.expiresAt.toDate() : null
          };
        }
      });
      setAccessCodes(codesMap);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndCodes();
  }, []);

  const handleChangeRole = async (uid: string, newRole: string) => {
    if (!window.confirm(`권한을 ${newRole}로 변경하시겠습니까?`)) return;
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      alert('권한이 변경되었습니다.');
      fetchUsersAndCodes();
    } catch (error) {
      console.error('Error changing role:', error);
      alert('권한 변경에 실패했습니다.');
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm('이 사용자를 영구 삭제하시겠습니까?\n(Firestore 데이터만 삭제되며 Auth에서는 수동 삭제 필요)')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      alert('사용자가 삭제되었습니다.');
      fetchUsersAndCodes();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('사용자 삭제에 실패했습니다.');
    }
  };

  const toggleSelectUser = (uid: string) => {
    setSelectedUsers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const selectable = users
        .filter(u => u.role === 'student' && u.accessCode && accessCodes[u.accessCode])
        .map(u => u.uid);
      setSelectedUsers(selectable);
    } else {
      setSelectedUsers([]);
    }
  };

  const handleExtend = async () => {
    if (selectedUsers.length === 0) {
      alert('연장할 사용자를 선택해주세요.');
      return;
    }
    
    if (!window.confirm(`선택한 ${selectedUsers.length}명의 학생 코드를 ${extensionDays}일 연장하시겠습니까?`)) return;
    
    setIsExtending(true);
    let successCount = 0;
    
    try {
      const functions = getFunctions(app, FIREBASE_REGION);
      const extendCodeFn = httpsCallable<{codeId: string, extensionDays: number}, {success: boolean, message: string, newExpiresAt: string}>(functions, 'extendCodeExpiration');
      
      for (const uid of selectedUsers) {
        const user = users.find(u => u.uid === uid);
        if (!user || !user.accessCode) continue;
        
        const codeData = accessCodes[user.accessCode];
        if (!codeData) continue;
        
        try {
          await extendCodeFn({ codeId: codeData.codeId, extensionDays });
          successCount++;
        } catch (e) {
          console.error(`Error extending code for user ${uid}:`, e);
        }
      }
      
      alert(`${successCount}명의 사용자 코드가 연장되었습니다.`);
      setSelectedUsers([]);
      fetchUsersAndCodes();
    } catch (error) {
      console.error('Error during bulk extension:', error);
      alert('연장 처리 중 오류가 발생했습니다.');
    } finally {
      setIsExtending(false);
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

  const isAllSelected = users.filter(u => u.role === 'student' && u.accessCode && accessCodes[u.accessCode]).length > 0 && 
                        selectedUsers.length === users.filter(u => u.role === 'student' && u.accessCode && accessCodes[u.accessCode]).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 col-span-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          전체 사용자 관리
        </h3>
        <button onClick={fetchUsersAndCodes} className="text-sm font-medium text-blue-600 hover:text-blue-700">새로고침</button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            선택된 학생: <span className="text-blue-600 dark:text-blue-400 font-bold">{selectedUsers.length}</span>명
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={extensionDays}
            onChange={(e) => setExtensionDays(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300"
            disabled={selectedUsers.length === 0 || isExtending}
          >
            <option value={7}>+7일 연장</option>
            <option value={15}>+15일 연장</option>
            <option value={30}>+30일 연장</option>
          </select>
          
          <button
            onClick={handleExtend}
            disabled={selectedUsers.length === 0 || isExtending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
          >
            {isExtending ? (
              <span className="animate-pulse">연장 중...</span>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                선택 일괄 연장
              </>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><span className="animate-pulse">Loading users...</span></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium">
              <tr>
                <th className="px-4 py-3 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">권한</th>
                <th className="px-4 py-3">이메일/연락처</th>
                <th className="px-4 py-3">가입일</th>
                <th className="px-4 py-3">만료일</th>
                <th className="px-4 py-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map(user => {
                const codeData = user.accessCode ? accessCodes[user.accessCode] : null;
                const isStudent = user.role === 'student';
                const canSelect = isStudent && !!codeData;
                
                return (
                  <tr key={user.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-center">
                      {canSelect && (
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedUsers.includes(user.uid)}
                          onChange={() => toggleSelectUser(user.uid)}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold dark:text-white">
                      {user.profile?.name || '미등록'}
                      {user.profile?.age && <span className="text-xs font-normal text-gray-500 ml-1">({user.profile.age}세)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                        user.role === 'teacher' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {user.profile?.email || '-'}<br />{user.profile?.phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {user.profile?.createdAt?.toDate ? user.profile.createdAt.toDate().toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">
                      {codeData?.expiresAt ? (
                        <span className={codeData.expiresAt < new Date() ? 'text-red-500' : ''}>
                          {codeData.expiresAt.toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right flex justify-end items-center gap-2">
                      {isStudent && (
                        <button
                          onClick={() => openStudentDetail(user.uid, user.profile?.name || '학생')}
                          className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          title="상세 학습 현황 보기"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <select 
                        value={user.role} 
                        onChange={(e) => handleChangeRole(user.uid, e.target.value)}
                        className="px-2 py-1 border rounded bg-white text-xs dark:bg-gray-800"
                      >
                        <option value="admin">Admin</option>
                        <option value="teacher">Teacher</option>
                        <option value="student">Student</option>
                      </select>
                      <button 
                        onClick={() => handleDeleteUser(user.uid)}
                        className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <StudentDetailModal 
        uid={selectedStudentId} 
        isOpen={!!selectedStudentId} 
        onClose={closeStudentDetail}
        studentName={selectedStudentName}
      />
    </div>
  );
};
