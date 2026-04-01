export const SPEEDS = [1, 1.2, 1.5, 2] as const;
export type Speed = (typeof SPEEDS)[number];

export const AVAILABLE_VOICES = [
  'female',
  'male',
  'child_female',
  'child_male',
  'elderly_female',
  'elderly_male',
] as const;
export type Voice = (typeof AVAILABLE_VOICES)[number];

export const DEFAULT_VOICE: Voice = 'female';

export const AUDIO_PATHS = {
  ANNOUNCEMENT: 'tts/announcement.mp3',
  TRANSITION_CHIME: 'tts/dingdong.wav',
} as const;

export const getTTSPath = (datasetId: string, voice: Voice, sentenceId: number): string =>
  `tts/${datasetId}/${voice}/${sentenceId}.mp3`;

export const BLANK_MULTIPLIER = 0.15;
