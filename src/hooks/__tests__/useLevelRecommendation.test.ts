import { describe, it, expect } from 'vitest';
import { calculateSpeedBonus, getSpeedRating } from '../useLevelRecommendation';

describe('calculateSpeedBonus', () => {
  it('<= 4 seconds returns 15', () => {
    expect(calculateSpeedBonus(3)).toBe(15);
    expect(calculateSpeedBonus(4)).toBe(15);
  });

  it('5-6 seconds returns 10', () => {
    expect(calculateSpeedBonus(5)).toBe(10);
    expect(calculateSpeedBonus(6)).toBe(10);
  });

  it('7-8 seconds returns 5', () => {
    expect(calculateSpeedBonus(7)).toBe(5);
    expect(calculateSpeedBonus(8)).toBe(5);
  });

  it('9-12 seconds returns 0', () => {
    expect(calculateSpeedBonus(9)).toBe(0);
    expect(calculateSpeedBonus(12)).toBe(0);
  });

  it('13-16 seconds returns -5', () => {
    expect(calculateSpeedBonus(13)).toBe(-5);
    expect(calculateSpeedBonus(16)).toBe(-5);
  });

  it('> 16 seconds returns -10', () => {
    expect(calculateSpeedBonus(17)).toBe(-10);
    expect(calculateSpeedBonus(30)).toBe(-10);
  });
});

describe('getSpeedRating', () => {
  it('<= 6 returns fast', () => {
    expect(getSpeedRating(4)).toBe('fast');
    expect(getSpeedRating(6)).toBe('fast');
  });

  it('7-12 returns normal', () => {
    expect(getSpeedRating(7)).toBe('normal');
    expect(getSpeedRating(12)).toBe('normal');
  });

  it('> 12 returns slow', () => {
    expect(getSpeedRating(13)).toBe('slow');
    expect(getSpeedRating(20)).toBe('slow');
  });
});
