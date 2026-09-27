import dayjs, { type Dayjs } from 'dayjs';
import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import { useCallback, useMemo } from 'react';
import {
  browserTimeZone,
  DEFAULT_STATISTICS_PRESET,
  resolveStatisticsRange,
  STATISTICS_DATE_PARAM_FORMAT,
  STATISTICS_PERIOD_PRESETS,
  type StatisticsPeriodPreset,
  toPeriodParams,
} from '../utils/statistics-period';

const periodUrlParams = {
  period: parseAsStringLiteral(STATISTICS_PERIOD_PRESETS).withDefault(DEFAULT_STATISTICS_PRESET),
  from: parseAsString,
  to: parseAsString,
};

/** Selected statistics period, kept in the URL so a reload or a shared link shows the same view. */
export function useStatisticsPeriod() {
  const [state, setState] = useQueryStates(periodUrlParams, { history: 'replace' });
  // Recompute the calendar window when the day changes while the page stays open.
  const today = dayjs().format(STATISTICS_DATE_PARAM_FORMAT);

  const range = useMemo(
    () => resolveStatisticsRange(state.period, { from: state.from, to: state.to }, dayjs(today)),
    [state.period, state.from, state.to, today],
  );
  const params = useMemo(() => toPeriodParams(range, browserTimeZone()), [range]);

  const setPreset = useCallback(
    (preset: StatisticsPeriodPreset) => {
      if (preset === 'custom') {
        // Start the custom picker from the window currently shown.
        void setState({
          period: 'custom',
          from: range.from.format(STATISTICS_DATE_PARAM_FORMAT),
          to: range.to.subtract(1, 'day').format(STATISTICS_DATE_PARAM_FORMAT),
        });
        return;
      }
      void setState({ period: preset, from: null, to: null });
    },
    [range, setState],
  );

  const setCustomRange = useCallback(
    (first: Dayjs, last: Dayjs) => {
      void setState({
        period: 'custom',
        from: first.format(STATISTICS_DATE_PARAM_FORMAT),
        to: last.format(STATISTICS_DATE_PARAM_FORMAT),
      });
    },
    [setState],
  );

  return { preset: state.period, range, params, setPreset, setCustomRange };
}
