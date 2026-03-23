"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkMastery = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const MASTERY_TIME_THRESHOLD = 300;
const MASTERY_REPEAT_THRESHOLD = 10;
exports.checkMastery = (0, firestore_1.onDocumentWritten)('users/{uid}/progress/{progressId}', async (event) => {
    var _a, _b, _c;
    const after = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after.data();
    const before = (_b = event.data) === null || _b === void 0 ? void 0 : _b.before.data();
    if (!after)
        return;
    const wasMastered = (before === null || before === void 0 ? void 0 : before.status) === 'mastered';
    const shouldBeMastered = after.studyTimeSeconds >= MASTERY_TIME_THRESHOLD ||
        after.repeatCount >= MASTERY_REPEAT_THRESHOLD;
    if (shouldBeMastered && !wasMastered) {
        const db = (0, firestore_2.getFirestore)();
        const { uid } = event.params;
        await ((_c = event.data) === null || _c === void 0 ? void 0 : _c.after.ref.update({
            status: 'mastered',
            masteredAt: firestore_2.FieldValue.serverTimestamp(),
        }));
        await db.doc(`users/${uid}`).update({
            'stats.totalMasteredCount': firestore_2.FieldValue.increment(1),
        });
        console.log(`User ${uid} mastered sentence ${event.params.progressId}`);
    }
});
//# sourceMappingURL=checkMastery.js.map