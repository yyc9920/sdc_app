"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCode = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
exports.validateCode = (0, https_1.onCall)(async (request) => {
    const { code } = request.data;
    console.log(`[validateCode] Received code from client: '${code}'`);
    if (!code || typeof code !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'Code is required');
    }
    const db = (0, firestore_1.getFirestore)();
    const auth = (0, auth_1.getAuth)();
    const codesRef = db.collection('access_codes');
    console.log(`[validateCode] Querying Firestore for code: '${code}'`);
    const snapshot = await codesRef.where('code', '==', code).limit(1).get();
    console.log(`[validateCode] Query result empty? ${snapshot.empty}`);
    if (snapshot.empty) {
        throw new https_1.HttpsError('not-found', 'Invalid code');
    }
    const codeDoc = snapshot.docs[0];
    const codeData = codeDoc.data();
    if (codeData.status === 'revoked') {
        throw new https_1.HttpsError('permission-denied', 'Code has been revoked');
    }
    if (codeData.expiresAt && codeData.expiresAt.toDate() < new Date()) {
        throw new https_1.HttpsError('permission-denied', 'Code has expired. Please contact your administrator to extend the expiration date.');
    }
    let uid;
    if (codeData.status === 'used' && codeData.assignedTo) {
        uid = codeData.assignedTo;
    }
    else {
        const userRecord = await auth.createUser({});
        uid = userRecord.uid;
        await codeDoc.ref.update({
            status: 'used',
            assignedTo: uid,
            usedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        await db.collection('users').doc(uid).set({
            uid,
            profile: { name: '', goal: '', createdAt: firestore_1.FieldValue.serverTimestamp() },
            role: codeData.role,
            accessCode: code,
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
//# sourceMappingURL=validateCode.js.map