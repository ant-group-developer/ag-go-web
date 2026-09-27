import { describe, expect, it } from 'vitest';
import { compareSortValues, sortRows, toTimestamp } from './compare-sort-values';

describe('compareSortValues', () => {
  it('sorts text naturally, ignoring case and accents', () => {
    expect(['file 10', 'File 2', 'file 1'].sort(compareSortValues)).toEqual([
      'file 1',
      'File 2',
      'file 10',
    ]);
    expect(compareSortValues('Ảnh', 'anh')).toBe(0);
  });

  it('sorts numbers numerically with missing values last', () => {
    expect([3, null, 1, Number.NaN, 2].sort(compareSortValues)).toEqual([
      1,
      2,
      3,
      null,
      Number.NaN,
    ]);
  });
});

describe('toTimestamp', () => {
  it('returns epoch ms, or null for missing and invalid values', () => {
    expect(toTimestamp('2026-09-27T00:00:00Z')).toBe(Date.UTC(2026, 8, 27));
    expect(toTimestamp(null)).toBeNull();
    expect(toTimestamp('')).toBeNull();
    expect(toTimestamp('invalid')).toBeNull();
  });
});

describe('sortRows', () => {
  const rows = [{ v: 2 }, { v: null }, { v: 1 }, { v: 3 }];

  it('keeps missing values last in both directions', () => {
    expect(sortRows(rows, (row) => row.v, 'asc').map((row) => row.v)).toEqual([1, 2, 3, null]);
    expect(sortRows(rows, (row) => row.v, 'desc').map((row) => row.v)).toEqual([3, 2, 1, null]);
  });

  it('does not mutate the input', () => {
    sortRows(rows, (row) => row.v, 'asc');
    expect(rows.map((row) => row.v)).toEqual([2, null, 1, 3]);
  });
});
