import type { BaseOptionType } from 'antd/es/select';
import type { ReactNode } from 'react';
import { matchesSearch } from './search-text';

/**
 * `filterOption` for antd Select: matches the option's `searchText` (e.g. bilingual text),
 * its label, and — only when there is no label — its value.
 */
export function selectFilterOption(input: string, option?: BaseOptionType): boolean {
  if (!option) return false;
  const label: ReactNode = option.label ?? option.children;
  return matchesSearch(input, option.searchText, label, label == null ? option.value : undefined);
}

/** `showSearch.filter` for antd Cascader: matches any level of the option path. */
export function cascaderSearchFilter(
  input: string,
  path: { label?: ReactNode; searchText?: string }[],
): boolean {
  return path.some((option) => matchesSearch(input, option.searchText, option.label));
}
