"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.textToSpeech = void 0;
const https_1 = require("firebase-functions/v2/https");
const text_to_speech_1 = require("@google-cloud/text-to-speech");
/**
 * Voice configurations — English voices match processCSV.ts (Google Cloud TTS).
 * Korean voices use Neural2 for high-quality synthesis.
 */
const VOICE_CONFIGS = {
    female: { languageCode: 'en-US', name: 'en-US-Journey-F', ssmlGender: 'FEMALE' },
    male: { languageCode: 'en-US', name: 'en-US-Journey-D', ssmlGender: 'MALE' },
    child_female: { languageCode: 'en-US', name: 'en-US-Studio-O', ssmlGender: 'FEMALE' },
    child_male: { languageCode: 'en-US', name: 'en-US-Studio-Q', ssmlGender: 'MALE' },
    elderly_female: { languageCode: 'en-US', name: 'en-US-Wavenet-H', ssmlGender: 'FEMALE' },
    elderly_male: { languageCode: 'en-US', name: 'en-US-Wavenet-J', ssmlGender: 'MALE' },
    korean_female: { languageCode: 'ko-KR', name: 'ko-KR-Neural2-A', ssmlGender: 'FEMALE' },
    korean_male: { languageCode: 'ko-KR', name: 'ko-KR-Neural2-C', ssmlGender: 'MALE' },
};
const AUDIO_CONFIG = {
    audioEncoding: 'MP3',
    speakingRate: 1.0,
    pitch: 0,
    sampleRateHertz: 24000,
};
// Reuse client across invocations within the same instance
let ttsClient = null;
function getClient() {
    if (!ttsClient)
        ttsClient = new text_to_speech_1.TextToSpeechClient();
    return ttsClient;
}
exports.textToSpeech = (0, https_1.onCall)({
    memory: '256MiB',
    timeoutSeconds: 15,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    }
    const { text, voiceKey } = request.data;
    if (!text || typeof text !== 'string' || text.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'Missing or invalid text');
    }
    if (text.length > 500) {
        throw new https_1.HttpsError('invalid-argument', 'Text too long (max 500 characters)');
    }
    if (!voiceKey || !VOICE_CONFIGS[voiceKey]) {
        throw new https_1.HttpsError('invalid-argument', `Invalid voiceKey: ${voiceKey}`);
    }
    const voice = VOICE_CONFIGS[voiceKey];
    try {
        const client = getClient();
        const [response] = await client.synthesizeSpeech({
            input: { text },
            voice,
            audioConfig: AUDIO_CONFIG,
        });
        if (!response.audioContent) {
            throw new https_1.HttpsError('internal', 'No audio content returned');
        }
        const audioBase64 = typeof response.audioContent === 'string'
            ? response.audioContent
            : Buffer.from(response.audioContent).toString('base64');
        return { audio: audioBase64 };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        console.error('TTS generation error:', error);
        throw new https_1.HttpsError('internal', 'TTS generation failed');
    }
});
//# sourceMappingURL=textToSpeech.js.map