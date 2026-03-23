"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccessCode = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const crypto_1 = require("crypto");
exports.createAccessCode = (0, https_1.onCall)({
    cors: [
        'https://sdc-app-1d02c.web.app',
        'https://sdc-app-1d02c.firebaseapp.com',
        'http://localhost:5173',
        'http://127.0.0.1:5173'
    ]
}, async (request) => {
    var _a;
    if (((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.role) !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
    const { role } = request.data;
    if (!role || !['admin', 'teacher', 'student'].includes(role)) {
        throw new https_1.HttpsError('invalid-argument', 'Valid role required (admin, teacher, or student)');
    }
    const db = (0, firestore_1.getFirestore)();
    const generateCode = () => {
        const charsList = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        const bytes = (0, crypto_1.randomBytes)(8);
        for (let i = 0; i < 8; i++) {
            code += charsList[bytes[i] % charsList.length];
            if (i === 3)
                code += '-';
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
        createdAt: firestore_1.FieldValue.serverTimestamp(),
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
        expiresAt: (expiresAt === null || expiresAt === void 0 ? void 0 : expiresAt.toISOString()) || null,
    };
});
//# sourceMappingURL=createAccessCode.js.map