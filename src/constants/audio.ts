export const SPEEDS = [1, 1.2, 1.5, 2] as const;
export type Speed = (typeof SPEEDS)[number];

export const AVAILABLE_VOICES = [
  'female1',
  'male1',
  'female2',
  'male2',
  'female3',
  'male3',
] as const;
export type Voice = (typeof AVAILABLE_VOICES)[number];

export const DEFAULT_VOICE: Voice = 'female1';

export const AUDIO_PATHS = {
  ANNOUNCEMENT: 'tts/announcement.mp3',
  TRANSITION_CHIME: 'tts/dingdong.wav',
} as const;

export const getTTSPath = (datasetId: string, voice: Voice, sentenceId: number): string =>
  `tts/${datasetId}/${voice}/${sentenceId}.mp3`;

export const BLANK_MULTIPLIER = 0.15;

/** Korean voice keys for TTS service */
export const KOREAN_VOICES = ['korean_female', 'korean_male'] as const;
export type KoreanVoice = (typeof KOREAN_VOICES)[number];
export const DEFAULT_KOREAN_VOICE: KoreanVoice = 'korean_female';
