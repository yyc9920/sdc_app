import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { UserProfile } from '../../hooks/useUserProfile';
import { Users, UserX } from 'lucide-react';

export const UserManager: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChangeRole = async (uid: string, newRole: string) => {
    if (!window.confirm(`권한을 ${newRole}로 변경하시겠습니까?`)) return;
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      alert('권한이 변경되었습니다.');
      fetchUsers();
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
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('사용자 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 col-span-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          전체 사용자 관리
        </h3>
        <button onClick={fetchUsers} className="text-sm font-medium text-blue-600 hover:text-blue-700">새로고침</button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><span className="animate-pulse">Loading users...</span></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium">
              <tr>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">권한</th>
                <th className="px-4 py-3">이메일/연락처</th>
                <th className="px-4 py-3">가입일</th>
                <th className="px-4 py-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map(user => (
                <tr key={user.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
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
                  <td className="px-4 py-3 text-right flex justify-end gap-2">
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
