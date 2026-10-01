import { DatePicker, Flex, Segmented, Typography } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { StatisticsPeriodInfo } from '../types/statistics.type';
import type { StatisticsPeriodPreset, StatisticsRange } from '../utils/statistics-period';

const DAY_FORMAT = 'DD/MM/YYYY';

/** "01/09/2026 – 30/09/2026" for a [from, to) window. */
function formatWindow(from: string | dayjs.Dayjs, to: string | dayjs.Dayjs) {
  const last = dayjs(to).subtract(1, 'millisecond');
  return `${dayjs(from).format(DAY_FORMAT)} – ${last.format(DAY_FORMAT)}`;
}

/** Period presets, the custom range picker and the window the deltas are compared with. */
export function StatisticsPeriodFilter({
  preset,
  range,
  comparedWith,
  onPresetChange,
  onCustomRangeChange,
}: {
  preset: StatisticsPeriodPreset;
  range: StatisticsRange;
  comparedWith?: StatisticsPeriodInfo;
  onPresetChange: (preset: StatisticsPeriodPreset) => void;
  onCustomRangeChange: (from: dayjs.Dayjs, to: dayjs.Dayjs) => void;
}) {
  const { t } = useTranslation();
  const options: Array<{ label: string; value: StatisticsPeriodPreset }> = [
    { label: t('statistics.today'), value: 'today' },
    { label: t('statistics.thisWeek'), value: 'week' },
    { label: t('statistics.last30Days'), value: 'last30' },
    { label: t('statistics.thisMonth'), value: 'month' },
    { label: t('statistics.thisYear'), value: 'year' },
    { label: t('statistics.customRange'), value: 'custom' },
  ];

  return (
    <Flex vertical align="end" gap={6}>
      <Flex wrap gap={8} justify="end">
        {preset === 'custom' ? (
          <DatePicker.RangePicker
            value={[range.from, range.to.subtract(1, 'day')]}
            onChange={(values) => {
              if (values?.[0] && values[1]) onCustomRangeChange(values[0], values[1]);
            }}
            allowClear={false}
            format={DAY_FORMAT}
            disabledDate={(day) => day.isAfter(dayjs().endOf('day'))}
          />
        ) : null}
        <Segmented<StatisticsPeriodPreset>
          value={preset}
          onChange={onPresetChange}
          options={options}
        />
      </Flex>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {comparedWith
          ? t('statistics.periodCaption', {
              range: formatWindow(range.from, comparedWith.effectiveTo),
              previous: formatWindow(comparedWith.previousFrom, comparedWith.previousTo),
            })
          : formatWindow(range.from, range.to)}
      </Typography.Text>
    </Flex>
  );
}
