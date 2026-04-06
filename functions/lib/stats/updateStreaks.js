"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStreaks = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const getDateString = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const getYesterdayString = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return getDateString(yesterday);
};
const getTodayString = () => getDateString(new Date());
exports.updateStreaks = (0, scheduler_1.onSchedule)({
    schedule: '0 0 * * *',
    timeZone: 'Asia/Seoul',
}, async () => {
    var _a, _b, _c;
    const db = (0, firestore_1.getFirestore)();
    const yesterday = getYesterdayString();
    const today = getTodayString();
    console.log(`Running streak update. Yesterday: ${yesterday}, Today: ${today}`);
    const usersSnapshot = await db.collection('users').get();
    let updatedCount = 0;
    let resetCount = 0;
    for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const lastActive = (_a = userData.stats) === null || _a === void 0 ? void 0 : _a.lastActiveDate;
        const currentStreak = ((_b = userData.stats) === null || _b === void 0 ? void 0 : _b.currentStreak) || 0;
        const longestStreak = ((_c = userData.stats) === null || _c === void 0 ? void 0 : _c.longestStreak) || 0;
        let newStreak = currentStreak;
        let newLongestStreak = longestStreak;
        if (lastActive === yesterday) {
            newStreak = currentStreak + 1;
            if (newStreak > longestStreak) {
                newLongestStreak = newStreak;
            }
            updatedCount++;
        }
        else if (lastActive !== today) {
            newStreak = 0;
            resetCount++;
        }
        if (newStreak !== currentStreak || newLongestStreak !== longestStreak) {
            await userDoc.ref.update({
                'stats.currentStreak': newStreak,
                'stats.longestStreak': newLongestStreak,
            });
        }
    }
    console.log(`Streak update complete. Incremented: ${updatedCount}, Reset: ${resetCount}`);
});
//# sourceMappingURL=updateStreaks.js.map