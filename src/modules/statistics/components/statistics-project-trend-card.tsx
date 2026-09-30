import { Typography, theme } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { StatisticsProjectTrend } from '../types/statistics.type';
import { NEW_PROJECTS_COLOR } from '../utils/statistics-colors';
import { formatNumber } from '../utils/statistics-format';
import { StatisticsSectionCard, type StatisticsQueryState } from './statistics-section-card';

const MAX_TICKS = 10;
const CHART_MARGIN = { top: 8, right: 8, left: 0, bottom: 0 };

/** Projects created per day (or ISO week for long periods) over the selected period. */
export function StatisticsProjectTrendCard({
  query,
}: {
  query: StatisticsQueryState & { data: StatisticsProjectTrend | undefined };
}) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const trend = query.data;
  const weekly = trend?.period.granularity === 'week';
  const points = trend?.points ?? [];
  const axisStyle = {
    tick: { fontSize: 12, fill: token.colorTextSecondary },
    axisLine: false,
    tickLine: false,
  };

  return (
    <StatisticsSectionCard
      title={t('statistics.projectTrend.title')}
      extra={
        trend ? (
          <Typography.Text type="secondary">
            {t('statistics.projectTrend.total', {
              count: trend.total,
              value: formatNumber(trend.total),
            })}
          </Typography.Text>
        ) : null
      }
      query={query}
      isEmpty={!trend?.total}
      emptyText={t('statistics.projectTrend.empty')}
    >
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <AreaChart data={points} margin={CHART_MARGIN}>
            <CartesianGrid vertical={false} stroke={token.colorBorderSecondary} />
            <XAxis
              dataKey="bucketStart"
              interval={Math.max(0, Math.ceil(points.length / MAX_TICKS) - 1)}
              tickFormatter={(value: string) => dayjs(value).format('DD/MM')}
              {...axisStyle}
            />
            <YAxis width={44} allowDecimals={false} {...axisStyle} />
            <Tooltip
              labelFormatter={(value: unknown) =>
                weekly
                  ? t('statistics.trend.weekOf', {
                      date: dayjs(String(value)).format('DD/MM/YYYY'),
                    })
                  : dayjs(String(value)).format('DD/MM/YYYY')
              }
              formatter={(value: unknown) => formatNumber(Number(value ?? 0))}
              contentStyle={{
                borderRadius: 8,
                border: `1px solid ${token.colorBorderSecondary}`,
                fontSize: 12,
              }}
            />
            <Area
              type="linear"
              dataKey="projects"
              name={t('statistics.projectTrend.projects')}
              stroke={NEW_PROJECTS_COLOR}
              strokeWidth={2}
              fill={NEW_PROJECTS_COLOR}
              fillOpacity={0.15}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </StatisticsSectionCard>
  );
}
