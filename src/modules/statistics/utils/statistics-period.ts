import dayjs, { type Dayjs } from 'dayjs';
import type { StatisticsPeriodParams } from '../types/statistics.type';

export const STATISTICS_PERIOD_PRESETS = ['today', 'week', 'month', 'year', 'custom'] as const;
export type StatisticsPeriodPreset = (typeof STATISTICS_PERIOD_PRESETS)[number];
export const DEFAULT_STATISTICS_PRESET: StatisticsPeriodPreset = 'month';

/** Format of the custom `from`/`to` days kept in the URL. */
export const STATISTICS_DATE_PARAM_FORMAT = 'YYYY-MM-DD';

const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** The API accepts at most 731 days; longer custom ranges keep their most recent part. */
const MAX_CUSTOM_DAYS = 730;
const FALLBACK_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export type StatisticsRange = { from: Dayjs; to: Dayjs };

function parseDay(value: string | null | undefined): Dayjs | null {
  if (!value || !DATE_PARAM_PATTERN.test(value)) return null;
  const day = dayjs(value);
  return day.isValid() && day.format(STATISTICS_DATE_PARAM_FORMAT) === value
    ? day.startOf('day')
    : null;
}

/**
 * Local calendar window [from, to) of a preset. Boundaries are whole days (not "now"), so the
 * query keys stay the same while the page is open. A custom range includes its last day; an
 * invalid one falls back to the last 7 days.
 */
export function resolveStatisticsRange(
  preset: StatisticsPeriodPreset,
  custom: { from?: string | null; to?: string | null } = {},
  now: Dayjs = dayjs(),
): StatisticsRange {
  const today = now.startOf('day');
  switch (preset) {
    case 'today':
      return { from: today, to: today.add(1, 'day') };
    case 'week': {
      // ISO week: Monday is the first day (dayjs().day() is 0 for Sunday).
      const monday = today.subtract((today.day() + 6) % 7, 'day');
      return { from: monday, to: monday.add(1, 'week') };
    }
    case 'month':
      return { from: today.startOf('month'), to: today.startOf('month').add(1, 'month') };
    case 'year':
      return { from: today.startOf('year'), to: today.startOf('year').add(1, 'year') };
    case 'custom': {
      const first = parseDay(custom.from);
      const last = parseDay(custom.to);
      if (!first || !last || first.isAfter(last)) {
        return { from: today.subtract(6, 'day'), to: today.add(1, 'day') };
      }
      const earliest = last.subtract(MAX_CUSTOM_DAYS - 1, 'day');
      return { from: first.isBefore(earliest) ? earliest : first, to: last.add(1, 'day') };
    }
  }
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIME_ZONE;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

export function toPeriodParams(range: StatisticsRange, timeZone: string): StatisticsPeriodParams {
  return { from: range.from.toISOString(), to: range.to.toISOString(), tz: timeZone };
}
