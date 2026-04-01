"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetWeeklyRankings = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const getWeekStartString = (date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
exports.resetWeeklyRankings = (0, scheduler_1.onSchedule)({
    schedule: '0 0 * * 1',
    timeZone: 'Asia/Seoul',
}, async () => {
    var _a, _b, _c;
    const db = (0, firestore_1.getFirestore)();
    const now = new Date();
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const weekId = getWeekStartString(lastWeekStart);
    console.log(`Archiving weekly rankings for week starting: ${weekId}`);
    const usersSnapshot = await db.collection('users').where('role', '==', 'student').get();
    const weeklyRankings = [];
    for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const weeklyTime = ((_a = userData.stats) === null || _a === void 0 ? void 0 : _a.weeklyStudyTimeSeconds) || 0;
        if (weeklyTime > 0) {
            weeklyRankings.push({
                uid: userDoc.id,
                name: ((_b = userData.profile) === null || _b === void 0 ? void 0 : _b.name) || '익명',
                weeklyStudyTimeSeconds: weeklyTime,
            });
        }
    }
    weeklyRankings.sort((a, b) => b.weeklyStudyTimeSeconds - a.weeklyStudyTimeSeconds);
    const rankedEntries = weeklyRankings.slice(0, 50).map((entry, index) => (Object.assign(Object.assign({}, entry), { rank: index + 1 })));
    if (rankedEntries.length > 0) {
        await db.collection('weekly_ranking_archives').doc(weekId).set({
            weekId,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            entries: rankedEntries,
            totalParticipants: weeklyRankings.length,
        });
        console.log(`Archived ${rankedEntries.length} rankings for week ${weekId}`);
    }
    const batch = db.batch();
    let resetCount = 0;
    for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        if (((_c = userData.stats) === null || _c === void 0 ? void 0 : _c.weeklyStudyTimeSeconds) > 0) {
            batch.update(userDoc.ref, {
                'stats.weeklyStudyTimeSeconds': 0,
            });
            resetCount++;
        }
    }
    if (resetCount > 0) {
        await batch.commit();
        console.log(`Reset weekly study time for ${resetCount} users`);
    }
    console.log('Weekly ranking reset complete');
});
//# sourceMappingURL=resetWeeklyRankings.js.map