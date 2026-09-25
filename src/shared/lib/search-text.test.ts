import { describe, expect, it } from 'vitest';
import { bilingualSearchText, matchesSearch, normalizeSearchText } from './search-text';
import { selectFilterOption } from './select-search';

describe('normalizeSearchText', () => {
  it('ignores case, Vietnamese diacritics and extra whitespace', () => {
    expect(normalizeSearchText('  Thành phố   HỒ CHÍ Minh ')).toBe('thanh pho ho chi minh');
    expect(normalizeSearchText('Đà Nẵng')).toBe('da nang');
  });
});

describe('matchesSearch', () => {
  it('matches unaccented, uppercase and space-less input', () => {
    expect(matchesSearch('ha noi', 'Hà Nội')).toBe(true);
    expect(matchesSearch('HÀ NỘI', 'Hà Nội')).toBe(true);
    expect(matchesSearch('hanoi', 'Hà Nội')).toBe(true);
    expect(matchesSearch('da nang', 'Hà Nội')).toBe(false);
  });

  it('treats empty input as a match', () => {
    expect(matchesSearch('  ', 'anything')).toBe(true);
  });
});

describe('bilingualSearchText', () => {
  it('lets options be found by their Vietnamese or English label', () => {
    const text = bilingualSearchText('projects.evaluationRejected');
    expect(matchesSearch('khong dat', text)).toBe(true);
    expect(matchesSearch('rejected', text)).toBe(true);
  });
});

describe('selectFilterOption', () => {
  it('matches label and searchText but not an id value when a label exists', () => {
    expect(selectFilterOption('viet', { value: 'id-1', label: 'Việt Nam' })).toBe(true);
    expect(
      selectFilterOption('pending', {
        value: 'x',
        label: 'Chưa đánh giá',
        searchText: 'Chưa đánh giá | Pending',
      }),
    ).toBe(true);
    expect(selectFilterOption('id-1', { value: 'id-1', label: 'Việt Nam' })).toBe(false);
    expect(selectFilterOption('arial', { value: 'Arial' })).toBe(true);
  });
});
