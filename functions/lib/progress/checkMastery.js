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
        const userRef = db.doc(`users/${uid}`);
        const progressRef = (_c = event.data) === null || _c === void 0 ? void 0 : _c.after.ref;
        if (!progressRef)
            return;
        try {
            await db.runTransaction(async (transaction) => {
                var _a;
                const progressDoc = await transaction.get(progressRef);
                const currentStatus = (_a = progressDoc.data()) === null || _a === void 0 ? void 0 : _a.status;
                // Double check status in transaction
                if (currentStatus === 'mastered')
                    return;
                transaction.update(progressRef, {
                    status: 'mastered',
                    masteredAt: firestore_2.FieldValue.serverTimestamp(),
                });
                transaction.update(userRef, {
                    'stats.totalMasteredCount': firestore_2.FieldValue.increment(1),
                });
            });
            // Today's stats update (non-transactional is fine for daily stats)
            const now = new Date();
            const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
            const today = kst.toISOString().split('T')[0];
            await db.doc(`users/${uid}/daily_stats/${today}`).set({
                sentencesMastered: firestore_2.FieldValue.increment(1),
            }, { merge: true });
            console.log(`User ${uid} mastered sentence ${event.params.progressId}`);
        }
        catch (error) {
            console.error('Transaction failed: ', error);
        }
    }
});
//# sourceMappingURL=checkMastery.js.map