import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';

export const createAccessCode = onCall(async (request) => {
  if (request.auth?.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin access required');
  }
  
  const { role } = request.data;
  
  if (!role || !['admin', 'teacher', 'student'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Valid role required (admin, teacher, or student)');
  }
  
  const db = getFirestore();
  
  const generateCode = () => {
    const charsList = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
    let code = '';
    const bytes = randomBytes(8);
    for (let i = 0; i < 8; i++) {
      code += charsList[bytes[i] % charsList.length];
      if (i === 3) code += '-';
    }
    return code;
  };
  
  const code = generateCode();
  
  const expiresAt = ['admin', 'teacher'].includes(role)
    ? null  
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); 
  
  const codeDoc = await db.collection('access_codes').add({
    code,
    role,
    status: 'available',
    assignedTo: null,
    createdAt: FieldValue.serverTimestamp(),
    usedAt: null,
    expiresAt: expiresAt ? expiresAt : null,
    extendedBy: null,
    extendedAt: null,
  });
  
  return { 
    success: true,
    codeId: codeDoc.id,
    code,
    role,
    expiresAt: expiresAt?.toISOString() || null,
  };
});