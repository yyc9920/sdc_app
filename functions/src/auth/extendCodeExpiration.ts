import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

export const extendCodeExpiration = onCall({ 
  cors: [
    'https://sdc-app-1d02c.web.app',
    'https://sdc-app-1d02c.firebaseapp.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ] 
}, async (request) => {
  if (request.auth?.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin access required');
  }
  
  const { codeId, extensionDays } = request.data;
  
  if (!codeId || typeof extensionDays !== 'number' || extensionDays < 1) {
    throw new HttpsError('invalid-argument', 'Valid codeId and extensionDays required');
  }
  
  const db = getFirestore();
  const codeRef = db.collection('access_codes').doc(codeId);
  const codeDoc = await codeRef.get();
  
  if (!codeDoc.exists) {
    throw new HttpsError('not-found', 'Code not found');
  }
  
  const codeData = codeDoc.data()!;
  
  if (codeData.role === 'admin') {
    throw new HttpsError('invalid-argument', 'Admin codes do not expire');
  }
  
  const currentExpiry = codeData.expiresAt?.toDate() || new Date();
  const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
  const newExpiry = new Date(baseDate.getTime() + extensionDays * 24 * 60 * 60 * 1000);
  
  await codeRef.update({
    expiresAt: Timestamp.fromDate(newExpiry),
    extendedBy: request.auth.uid,
    extendedAt: FieldValue.serverTimestamp(),
  });
  
  return { 
    success: true, 
    newExpiresAt: newExpiry.toISOString(),
    message: `Code extended by ${extensionDays} days`
  };
});
