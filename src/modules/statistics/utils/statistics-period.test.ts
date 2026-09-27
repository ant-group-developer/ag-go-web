import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { resolveStatisticsRange, toPeriodParams } from './statistics-period';

const DAY = 'YYYY-MM-DD';
// Sunday 27/09/2026, mid-afternoon local time.
const now = dayjs('2026-09-27T15:30:00');

function days(range: ReturnType<typeof resolveStatisticsRange>) {
  return [range.from.format(DAY), range.to.format(DAY)];
}

describe('resolveStatisticsRange', () => {
  it('covers whole local days, weeks from Monday, months and years', () => {
    expect(days(resolveStatisticsRange('today', {}, now))).toEqual(['2026-09-27', '2026-09-28']);
    expect(days(resolveStatisticsRange('week', {}, now))).toEqual(['2026-09-21', '2026-09-28']);
    expect(days(resolveStatisticsRange('month', {}, now))).toEqual(['2026-09-01', '2026-10-01']);
    expect(days(resolveStatisticsRange('year', {}, now))).toEqual(['2026-01-01', '2027-01-01']);
  });

  it('starts the week on the same Monday on a Monday', () => {
    const monday = dayjs('2026-09-21T08:00:00');
    expect(days(resolveStatisticsRange('week', {}, monday))).toEqual(['2026-09-21', '2026-09-28']);
  });

  it('includes the last day of a custom range', () => {
    const range = resolveStatisticsRange('custom', { from: '2026-09-01', to: '2026-09-10' }, now);
    expect(days(range)).toEqual(['2026-09-01', '2026-09-11']);
  });

  it('falls back to the last 7 days for a missing, malformed or reversed custom range', () => {
    const fallback = ['2026-09-21', '2026-09-28'];
    expect(days(resolveStatisticsRange('custom', {}, now))).toEqual(fallback);
    expect(
      days(resolveStatisticsRange('custom', { from: '01/09/2026', to: '2026-09-10' }, now)),
    ).toEqual(fallback);
    expect(
      days(resolveStatisticsRange('custom', { from: '2026-09-10', to: '2026-09-01' }, now)),
    ).toEqual(fallback);
  });

  it('rejects a custom day that does not exist instead of rolling it over', () => {
    const range = resolveStatisticsRange('custom', { from: '2026-02-30', to: '2026-03-05' }, now);
    expect(days(range)).toEqual(['2026-09-21', '2026-09-28']);
  });

  it('keeps the most recent 730 days of a longer custom range', () => {
    const range = resolveStatisticsRange('custom', { from: '2020-01-01', to: '2026-09-26' }, now);
    expect(range.to.diff(range.from, 'day')).toBe(730);
    expect(range.to.format(DAY)).toBe('2026-09-27');
  });

  it('gives stable boundaries within a day', () => {
    const morning = resolveStatisticsRange('month', {}, dayjs('2026-09-27T08:00:00'));
    const evening = resolveStatisticsRange('month', {}, dayjs('2026-09-27T22:00:00'));
    expect(toPeriodParams(morning, 'UTC')).toEqual(toPeriodParams(evening, 'UTC'));
  });
});

describe('toPeriodParams', () => {
  it('sends ISO instants and the time zone', () => {
    const range = resolveStatisticsRange('today', {}, now);
    expect(toPeriodParams(range, 'Asia/Ho_Chi_Minh')).toEqual({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      tz: 'Asia/Ho_Chi_Minh',
    });
  });
});
