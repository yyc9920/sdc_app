"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extendCodeExpiration = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
exports.extendCodeExpiration = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    if (((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.role) !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
    const { codeId, extensionDays } = request.data;
    if (!codeId || typeof extensionDays !== 'number' || extensionDays < 1) {
        throw new https_1.HttpsError('invalid-argument', 'Valid codeId and extensionDays required');
    }
    const db = (0, firestore_1.getFirestore)();
    const codeRef = db.collection('access_codes').doc(codeId);
    const codeDoc = await codeRef.get();
    if (!codeDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Code not found');
    }
    const codeData = codeDoc.data();
    if (codeData.role === 'admin') {
        throw new https_1.HttpsError('invalid-argument', 'Admin codes do not expire');
    }
    const currentExpiry = ((_b = codeData.expiresAt) === null || _b === void 0 ? void 0 : _b.toDate()) || new Date();
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    const newExpiry = new Date(baseDate.getTime() + extensionDays * 24 * 60 * 60 * 1000);
    await codeRef.update({
        expiresAt: firestore_1.Timestamp.fromDate(newExpiry),
        extendedBy: request.auth.uid,
        extendedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return {
        success: true,
        newExpiresAt: newExpiry.toISOString(),
        message: `Code extended by ${extensionDays} days`
    };
});
//# sourceMappingURL=extendCodeExpiration.js.map