import dayjs from 'dayjs';

export const DEFAULT_DATE_FORMAT = 'HH:mm DD/MM/YYYY';

/** Formats a timestamp for display, e.g. "15:00 25/09/2026". Missing or invalid values render as "-". */
export function formatDate(
  value: string | number | Date | null | undefined,
  format: string = DEFAULT_DATE_FORMAT,
): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const date = dayjs(value);
  return date.isValid() ? date.format(format) : '-';
}
