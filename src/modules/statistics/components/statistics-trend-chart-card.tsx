import { Flex, Typography, theme } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { StatisticsTrend } from '../types/statistics.type';
import { ADDED_MEDIA_COLOR, EVALUATION_COLORS } from '../utils/statistics-colors';
import { formatNumber } from '../utils/statistics-format';
import { StatisticsSectionCard, type StatisticsQueryState } from './statistics-section-card';

const SYNC_ID = 'statistics-trend';
const MAX_TICKS = 8;
const Y_AXIS_WIDTH = 44;
const CHART_MARGIN = { top: 8, right: 8, left: 0, bottom: 0 };

/**
 * Flow chart (media added vs. media decided per day or week) above a separate backlog chart.
 * The backlog is a stock, not a flow, and is usually far larger, so it gets its own chart and
 * axis instead of a second y-axis; both share the x-axis and a synced tooltip.
 */
export function StatisticsTrendChartCard({
  query,
}: {
  query: StatisticsQueryState & { data: StatisticsTrend | undefined };
}) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const trend = query.data;
  const weekly = trend?.period.granularity === 'week';
  const points = trend?.points ?? [];
  const hasActivity = points.some(
    (point) => point.added || point.approved || point.rejected || point.backlog,
  );

  const tooltipLabel = (value: unknown) =>
    weekly
      ? t('statistics.trend.weekOf', { date: dayjs(String(value)).format('DD/MM/YYYY') })
      : dayjs(String(value)).format('DD/MM/YYYY');
  const axisStyle = {
    tick: { fontSize: 12, fill: token.colorTextSecondary },
    axisLine: false,
    tickLine: false,
  };
  /*
   * Both charts share the same x-axis (band scale, same ticks) and y-axis width so their days
   * line up. Only about MAX_TICKS dates are labelled to keep the axis readable.
   */
  const xAxisProps = {
    dataKey: 'bucketStart',
    scale: 'band' as const,
    interval: Math.max(0, Math.ceil(points.length / MAX_TICKS) - 1),
    tickFormatter: (value: string) => dayjs(value).format('DD/MM'),
    ...axisStyle,
  };
  const yAxisProps = { width: Y_AXIS_WIDTH, allowDecimals: false, ...axisStyle };
  const tooltipProps = {
    labelFormatter: tooltipLabel,
    formatter: (value: unknown) => formatNumber(Number(value ?? 0)),
    contentStyle: {
      borderRadius: 8,
      border: `1px solid ${token.colorBorderSecondary}`,
      fontSize: 12,
    },
  };

  return (
    <StatisticsSectionCard title={t('statistics.trend.title')} query={query} isEmpty={!hasActivity}>
      <Flex vertical gap={8}>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <ComposedChart data={points} syncId={SYNC_ID} margin={CHART_MARGIN}>
              <CartesianGrid vertical={false} stroke={token.colorBorderSecondary} />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip {...tooltipProps} cursor={{ fill: token.colorFillTertiary }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="approved"
                name={t('statistics.trend.approved')}
                stackId="decisions"
                fill={EVALUATION_COLORS.approved}
                stroke={token.colorBgContainer}
                strokeWidth={1}
                maxBarSize={28}
              />
              <Bar
                dataKey="rejected"
                name={t('statistics.trend.rejected')}
                stackId="decisions"
                fill={EVALUATION_COLORS.rejected}
                stroke={token.colorBgContainer}
                strokeWidth={1}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Line
                type="linear"
                dataKey="added"
                name={t('statistics.trend.added')}
                stroke={ADDED_MEDIA_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {t('statistics.trend.backlog')}
        </Typography.Text>
        <div style={{ width: '100%', height: 110 }}>
          <ResponsiveContainer>
            <ComposedChart data={points} syncId={SYNC_ID} margin={CHART_MARGIN}>
              <CartesianGrid vertical={false} stroke={token.colorBorderSecondary} />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip {...tooltipProps} />
              <Area
                type="linear"
                dataKey="backlog"
                name={t('statistics.trend.backlog')}
                stroke={EVALUATION_COLORS.pending}
                strokeWidth={2}
                fill={EVALUATION_COLORS.pending}
                fillOpacity={0.15}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Flex>
    </StatisticsSectionCard>
  );
}
