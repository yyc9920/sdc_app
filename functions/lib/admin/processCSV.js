"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processCSV = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const text_to_speech_1 = require("@google-cloud/text-to-speech");
const papaparse_1 = __importDefault(require("papaparse"));
const CORS_ORIGINS = [
    'https://sdc-app-1d02c.web.app',
    'https://sdc-app-1d02c.firebaseapp.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
];
const VOICE_CONFIGS = {
    female: { languageCode: 'en-US', name: 'en-US-Journey-F', ssmlGender: 'FEMALE' },
    male: { languageCode: 'en-US', name: 'en-US-Journey-D', ssmlGender: 'MALE' },
    child_female: { languageCode: 'en-US', name: 'en-US-Studio-O', ssmlGender: 'FEMALE' },
    child_male: { languageCode: 'en-US', name: 'en-US-Studio-Q', ssmlGender: 'MALE' },
    elderly_female: { languageCode: 'en-US', name: 'en-US-Wavenet-H', ssmlGender: 'FEMALE' },
    elderly_male: { languageCode: 'en-US', name: 'en-US-Wavenet-J', ssmlGender: 'MALE' },
};
const AUDIO_CONFIG = {
    audioEncoding: 'MP3',
    speakingRate: 1.0,
    pitch: 0,
    sampleRateHertz: 24000,
};
exports.processCSV = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    timeoutSeconds: 540,
    memory: '1GiB',
}, async (request) => {
    var _a, _b;
    if (((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.role) !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
    const { csvUrl, title, description, storagePath } = request.data;
    if (!csvUrl || !title) {
        throw new https_1.HttpsError('invalid-argument', 'csvUrl and title are required');
    }
    const db = (0, firestore_1.getFirestore)();
    const storage = (0, storage_1.getStorage)();
    const bucket = storage.bucket();
    const ttsClient = new text_to_speech_1.TextToSpeechClient();
    const setId = generateSetId(title);
    const setRef = db.collection('learning_sets').doc(setId);
    try {
        await setRef.set({
            setId,
            title,
            description: description || '',
            sentenceCount: 0,
            status: 'processing',
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            createdBy: ((_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid) || 'unknown',
            processingError: null,
            sourceFile: storagePath,
        });
        const csvResponse = await fetch(csvUrl);
        if (!csvResponse.ok) {
            throw new Error(`Failed to fetch CSV: ${csvResponse.statusText}`);
        }
        const csvContent = await csvResponse.text();
        const parseResult = papaparse_1.default.parse(csvContent, {
            header: true,
            skipEmptyLines: true,
        });
        if (parseResult.errors.length > 0) {
            throw new Error(`CSV parse error: ${parseResult.errors[0].message}`);
        }
        const rows = parseResult.data;
        if (rows.length === 0) {
            throw new Error('CSV file is empty');
        }
        const requiredColumns = ['English Sentence', 'Korean Pronounce', 'Direct Comprehension', 'Comprehension'];
        const firstRow = rows[0];
        for (const col of requiredColumns) {
            if (!(col in firstRow)) {
                throw new Error(`Missing required column: ${col}`);
            }
        }
        await setRef.update({ sentenceCount: rows.length });
        const BATCH_SIZE = 5;
        const voiceKeys = Object.keys(VOICE_CONFIGS);
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (row, idx) => {
                const sentenceIndex = i + idx;
                const englishText = row['English Sentence'];
                if (!englishText || englishText.trim() === '') {
                    return;
                }
                const ttsUrls = {};
                for (const voiceKey of voiceKeys) {
                    const voiceConfig = VOICE_CONFIGS[voiceKey];
                    const [response] = await ttsClient.synthesizeSpeech({
                        input: { text: englishText },
                        voice: voiceConfig,
                        audioConfig: AUDIO_CONFIG,
                    });
                    if (!response.audioContent) {
                        throw new Error(`TTS failed for sentence ${sentenceIndex}, voice ${voiceKey}`);
                    }
                    const ttsPath = `tts/${setId}/${voiceKey}/${sentenceIndex}.mp3`;
                    const file = bucket.file(ttsPath);
                    await file.save(response.audioContent, {
                        contentType: 'audio/mpeg',
                        metadata: {
                            cacheControl: 'public, max-age=31536000',
                        },
                    });
                    await file.makePublic();
                    ttsUrls[voiceKey] = `https://storage.googleapis.com/${bucket.name}/${ttsPath}`;
                }
                const sentenceRef = setRef.collection('sentences').doc(String(sentenceIndex));
                await sentenceRef.set({
                    id: sentenceIndex,
                    english: englishText,
                    koreanPronounce: row['Korean Pronounce'] || '',
                    directComprehension: row['Direct Comprehension'] || '',
                    comprehension: row['Comprehension'] || '',
                    ttsUrls,
                });
            }));
        }
        await setRef.update({
            status: 'ready',
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return {
            success: true,
            setId,
            message: `Successfully processed ${rows.length} sentences with TTS`,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await setRef.update({
            status: 'error',
            processingError: errorMessage,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
function generateSetId(title) {
    const timestamp = Date.now();
    const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 30);
    return `${slug}_${timestamp}`;
}
//# sourceMappingURL=processCSV.js.map