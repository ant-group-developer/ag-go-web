import { describe, expect, it } from 'vitest';
import {
  ageInDays,
  computeDelta,
  formatDuration,
  formatNumber,
  percentOf,
} from './statistics-format';

describe('computeDelta', () => {
  it('reports the rounded change against the previous period', () => {
    expect(computeDelta(15, 10)).toEqual({ direction: 'up', percent: 50 });
    expect(computeDelta(5, 20)).toEqual({ direction: 'down', percent: 75 });
    expect(computeDelta(2, 3)).toEqual({ direction: 'down', percent: 33 });
  });

  it('marks an unchanged count as flat, including zero against zero', () => {
    expect(computeDelta(4, 4)).toEqual({ direction: 'flat' });
    expect(computeDelta(0, 0)).toEqual({ direction: 'flat' });
  });

  it('does not invent a percentage when the previous period had nothing', () => {
    expect(computeDelta(7, 0)).toEqual({ direction: 'new' });
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0s'],
    [44.6, '45s'],
    [200, '3m 20s'],
    [3900, '1h 05m'],
    [null, '0s'],
    [-5, '0s'],
  ])('%s seconds -> %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe('ageInDays', () => {
  const now = new Date('2026-09-27T12:00:00Z');

  it('counts whole days elapsed', () => {
    expect(ageInDays('2026-09-20T12:00:00Z', now)).toBe(7);
    expect(ageInDays('2026-09-27T01:00:00Z', now)).toBe(0);
  });

  it('treats missing, invalid and future values as 0', () => {
    expect(ageInDays(null, now)).toBe(0);
    expect(ageInDays('not a date', now)).toBe(0);
    expect(ageInDays('2026-10-01T00:00:00Z', now)).toBe(0);
  });
});

describe('percentOf and formatNumber', () => {
  it('rounds shares and handles an empty total', () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(5, 0)).toBe(0);
  });

  it('groups thousands and tolerates bad input', () => {
    expect(formatNumber(1234567)).toBe('1.234.567');
    expect(formatNumber('42')).toBe('42');
    expect(formatNumber('abc')).toBe('0');
  });
});
