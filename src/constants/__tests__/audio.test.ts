import { describe, it, expect } from 'vitest';
import { getTTSPath } from '../audio';

describe('getTTSPath', () => {
  it('generates correct path for standard input', () => {
    expect(getTTSPath('set1', 'female1', 42)).toBe('tts/set1/female1/42.mp3');
  });

  it('generates correct path for different voice', () => {
    expect(getTTSPath('set1', 'male1', 1)).toBe('tts/set1/male1/1.mp3');
  });

  it('handles dataset with underscores', () => {
    expect(getTTSPath('ultimate_speaking_beginner', 'female2', 100))
      .toBe('tts/ultimate_speaking_beginner/female2/100.mp3');
  });

  it('handles sentence ID 0', () => {
    expect(getTTSPath('set1', 'female1', 0)).toBe('tts/set1/female1/0.mp3');
  });
});
