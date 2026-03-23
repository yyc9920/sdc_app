import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const validateCode = onCall({ 
  cors: [
    'https://sdc-app-1d02c.web.app',
    'https://sdc-app-1d02c.firebaseapp.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ] 
}, async (request) => {
  const { code } = request.data;
  
  console.log(`[validateCode] Received code from client: '${code}'`); 
  
  if (!code || typeof code !== 'string') {
    throw new HttpsError('invalid-argument', 'Code is required');
  }
  
  const db = getFirestore();
  const auth = getAuth();
  
  const codesRef = db.collection('access_codes');
  console.log(`[validateCode] Querying Firestore for code: '${code}'`); 
  
  const snapshot = await codesRef.where('code', '==', code).limit(1).get();
  
  console.log(`[validateCode] Query result empty? ${snapshot.empty}`); 
  
  if (snapshot.empty) {
    throw new HttpsError('not-found', 'Invalid code');
  }
  
  const codeDoc = snapshot.docs[0];
  const codeData = codeDoc.data();
  
  if (codeData.status === 'revoked') {
    throw new HttpsError('permission-denied', 'Code has been revoked');
  }
  
  if (codeData.expiresAt && codeData.expiresAt.toDate() < new Date()) {
    throw new HttpsError(
      'permission-denied', 
      'Code has expired. Please contact your administrator to extend the expiration date.'
    );
  }
  
  let uid: string;
  
  if (codeData.status === 'used' && codeData.assignedTo) {
    uid = codeData.assignedTo;
  } else {
    const userRecord = await auth.createUser({});
    uid = userRecord.uid;
    
    await codeDoc.ref.update({
      status: 'used',
      assignedTo: uid,
      usedAt: FieldValue.serverTimestamp(),
    });
    
    await db.collection('users').doc(uid).set({
      uid,
      profile: { name: '', goal: '', phone: '', email: '', age: null, createdAt: FieldValue.serverTimestamp() },
      profileCompleted: false,
      role: codeData.role,
      accessCode: code,
      teacherId: null,
      stats: {
        totalStudyTimeSeconds: 0,
        totalMasteredCount: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
      },
      lastPosition: null,
    });
  }
  
  const customToken = await auth.createCustomToken(uid, {
    role: codeData.role,
  });
  
  return { customToken, role: codeData.role };
});