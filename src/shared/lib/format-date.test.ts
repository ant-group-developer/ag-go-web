import { describe, expect, it } from 'vitest';
import { formatDate } from './format-date';

describe('formatDate', () => {
  it('uses HH:mm DD/MM/YYYY by default', () => {
    expect(formatDate(new Date(2026, 8, 25, 15, 0))).toBe('15:00 25/09/2026');
  });

  it('accepts a custom format', () => {
    expect(formatDate(new Date(2026, 8, 5, 9, 7), 'DD/MM/YYYY')).toBe('05/09/2026');
  });

  it('renders missing or invalid values as "-"', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
    expect(formatDate('')).toBe('-');
    expect(formatDate('not a date')).toBe('-');
  });
});
