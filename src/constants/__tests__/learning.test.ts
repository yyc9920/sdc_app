import { describe, it, expect } from 'vitest';
import { getIntensity, getMotivationalMessage, MOTIVATIONAL_MESSAGES } from '../learning';

describe('getIntensity', () => {
  it('0 seconds returns 0', () => {
    expect(getIntensity(0)).toBe(0);
  });

  it('1 second returns 1', () => {
    expect(getIntensity(1)).toBe(1);
  });

  it('299 seconds returns 1 (below LIGHT threshold)', () => {
    expect(getIntensity(299)).toBe(1);
  });

  it('300 seconds returns 2 (at LIGHT threshold)', () => {
    expect(getIntensity(300)).toBe(2);
  });

  it('899 seconds returns 2 (below MODERATE threshold)', () => {
    expect(getIntensity(899)).toBe(2);
  });

  it('900 seconds returns 3 (at MODERATE threshold)', () => {
    expect(getIntensity(900)).toBe(3);
  });

  it('1799 seconds returns 3 (below HEAVY threshold)', () => {
    expect(getIntensity(1799)).toBe(3);
  });

  it('1800 seconds returns 4 (at HEAVY threshold)', () => {
    expect(getIntensity(1800)).toBe(4);
  });

  it('very large value returns 4', () => {
    expect(getIntensity(99999)).toBe(4);
  });
});

describe('getMotivationalMessage', () => {
  it('0 seconds returns NONE message', () => {
    expect(getMotivationalMessage(0)).toBe(MOTIVATIONAL_MESSAGES.NONE);
  });

  it('light activity returns LIGHT message', () => {
    expect(getMotivationalMessage(150)).toBe(MOTIVATIONAL_MESSAGES.LIGHT);
  });

  it('moderate activity returns MODERATE message', () => {
    expect(getMotivationalMessage(500)).toBe(MOTIVATIONAL_MESSAGES.MODERATE);
  });

  it('heavy activity returns HEAVY message', () => {
    expect(getMotivationalMessage(1200)).toBe(MOTIVATIONAL_MESSAGES.HEAVY);
  });

  it('intense activity returns INTENSE message', () => {
    expect(getMotivationalMessage(2000)).toBe(MOTIVATIONAL_MESSAGES.INTENSE);
  });
});
