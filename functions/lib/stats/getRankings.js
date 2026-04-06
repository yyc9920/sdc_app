"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRankings = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
exports.getRankings = (0, https_1.onCall)({
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { type, limit = 50 } = request.data;
    if (!type) {
        throw new https_1.HttpsError('invalid-argument', 'Ranking type is required.');
    }
    const db = (0, firestore_1.getFirestore)();
    const fieldMap = {
        'weekly_study_time': 'stats.weeklyStudyTimeSeconds',
        'total_study_time': 'stats.totalStudyTimeSeconds',
        'total_mastered': 'stats.totalMasteredCount',
        'current_streak': 'stats.currentStreak',
        'longest_streak': 'stats.longestStreak'
    };
    const field = fieldMap[type];
    if (!field) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid ranking type.');
    }
    try {
        const snapshot = await db.collection('users')
            .where('role', '==', 'student')
            .orderBy(field, 'desc')
            .limit(limit)
            .get();
        return snapshot.docs.map((doc, index) => {
            var _a;
            const data = doc.data();
            let value = 0;
            if (data.stats) {
                switch (type) {
                    case 'weekly_study_time':
                        value = data.stats.weeklyStudyTimeSeconds || 0;
                        break;
                    case 'total_study_time':
                        value = data.stats.totalStudyTimeSeconds || 0;
                        break;
                    case 'total_mastered':
                        value = data.stats.totalMasteredCount || 0;
                        break;
                    case 'current_streak':
                        value = data.stats.currentStreak || 0;
                        break;
                    case 'longest_streak':
                        value = data.stats.longestStreak || 0;
                        break;
                }
            }
            return {
                uid: doc.id,
                name: ((_a = data.profile) === null || _a === void 0 ? void 0 : _a.name) || '익명',
                value,
                rank: index + 1
            };
        }).filter(entry => entry.value > 0);
    }
    catch (error) {
        console.error('Error fetching rankings:', error);
        throw new https_1.HttpsError('internal', 'Failed to fetch rankings.');
    }
});
//# sourceMappingURL=getRankings.js.map