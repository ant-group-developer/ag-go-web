import type { ReactNode } from 'react';
import { isValidElement } from 'react';
import i18n from '../../i18n/config';

/**
 * Lowercases, strips Vietnamese diacritics (including đ/Đ) and collapses whitespace so
 * "Hà Nội", "ha noi" and "HA  NOI" all compare equal.
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extracts the plain text rendered by a ReactNode (strings, numbers and nested elements). */
export function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') {
    return String(node);
  }
  if (Array.isArray(node)) return node.map(nodeToText).join(' ');
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeToText(node.props.children);
  return '';
}

/**
 * True when every word of `input` appears in one of the candidates, ignoring case,
 * diacritics and whitespace differences.
 */
export function matchesSearch(input: string, ...candidates: ReactNode[]): boolean {
  const query = normalizeSearchText(input);
  if (!query) return true;
  const compactQuery = query.replace(/ /g, '');

  return candidates.some((candidate) => {
    const text = normalizeSearchText(nodeToText(candidate));
    if (!text) return false;
    return text.includes(query) || text.replace(/ /g, '').includes(compactQuery);
  });
}

/** Vietnamese and English translations of a key, so options can be found in either language. */
export function bilingualSearchText(key: string, options?: Record<string, unknown>): string {
  return [i18n.t(key, { ...options, lng: 'vi' }), i18n.t(key, { ...options, lng: 'en' })].join(
    ' | ',
  );
}
