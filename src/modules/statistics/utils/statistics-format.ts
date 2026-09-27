import i18next from 'i18next';
import { formatFileSize } from '../../../shared/lib/format-file-size';

const DAY_MS = 86_400_000;

/** Thousands grouping of the UI language (Vietnamese until i18n is ready). */
export function formatNumber(value: number | string | null | undefined): string {
  const number = Number(value ?? 0);
  const locale = i18next.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN';
  return Number.isFinite(number) ? number.toLocaleString(locale) : '0';
}

/** File size where an empty total is a real "0 B", not the "-" of a missing size. */
export function formatStorage(bytes: number | string | null | undefined): string {
  return Number(bytes ?? 0) > 0 ? formatFileSize(bytes) : '0 B';
}

export type StatisticsDelta =
  | { direction: 'flat' }
  /** Something happened in this window but nothing in the previous one: no percentage. */
  | { direction: 'new' }
  | { direction: 'up' | 'down'; percent: number };

/** Change of a period count compared with the previous window of the same length. */
export function computeDelta(current: number, previous: number): StatisticsDelta {
  if (current === previous) return { direction: 'flat' };
  if (previous === 0) return { direction: 'new' };
  const percent = Math.round((Math.abs(current - previous) / previous) * 100);
  return { direction: current > previous ? 'up' : 'down', percent };
}

/** "45s", "3m 20s", "1h 05m". */
export function formatDuration(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.round(Number(seconds ?? 0)));
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes}m ${String(total % 60).padStart(2, '0')}s`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

/** Whole days elapsed since `value` (0 for today or a missing value). */
export function ageInDays(value: string | null | undefined, now: Date = new Date()): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, Math.floor((now.getTime() - time) / DAY_MS));
}

/** Share of `part` in `total`, rounded to a whole percent (0 when there is nothing). */
export function percentOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}
