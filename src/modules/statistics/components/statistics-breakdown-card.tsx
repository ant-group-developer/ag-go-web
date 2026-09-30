import { ConfigProvider, Flex, Input, Segmented, Table, Typography, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { matchesSearch } from '../../../shared/lib/search-text';
import { usePermissions } from '../../account/hooks/use-current-account';
import { CountryFlag } from '../../countries/components/country-flag';
import { useStatisticsBreakdown } from '../hooks/use-statistics';
import {
  STATISTICS_BREAKDOWN_DIMENSIONS,
  type StatisticsBreakdownDimension,
  type StatisticsBreakdownRange,
  type StatisticsBreakdownRow,
  type StatisticsPeriodParams,
} from '../types/statistics.type';
import { formatNumber } from '../utils/statistics-format';
import { projectFilterLink } from '../utils/statistics-links';
import { StatisticsSectionCard } from './statistics-section-card';

const PAGE_SIZE = 10;
const COLUMN_WIDTHS = { name: 260, count: 110 } as const;
/** Every column has a width: the name and four counts. */
const TABLE_WIDTH = COLUMN_WIDTHS.name + 4 * COLUMN_WIDTHS.count;
/**
 * Groupings where a project can fall in several rows (several tags, media of several resolutions
 * or formats): a total of projects would not match the rows, so it is left out.
 */
const MULTI_VALUE_DIMENSIONS: StatisticsBreakdownDimension[] = ['tag', 'resolution', 'extension'];

/**
 * Projects and media per category, country, tag, source resolution or file extension, for
 * everything in scope or only what was created in the period. Category, country and tag rows
 * open the project list filtered on them.
 */
export function StatisticsBreakdownCard({ period }: { period: StatisticsPeriodParams }) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  // Headers and totals one weight lighter than antd's strong text (600 -> 500).
  const emphasisWeight = token.fontWeightStrong - 100;
  const [dimension, setDimension] = useState<StatisticsBreakdownDimension>('category');
  const [range, setRange] = useState<StatisticsBreakdownRange>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useStatisticsBreakdown(period, dimension, range);
  const breakdown = query.data;
  const totals = breakdown?.totals;
  // The query keeps the previous dimension's rows while the new one loads.
  const shownDimension = breakdown?.dimension ?? dimension;
  const rows = (breakdown?.rows ?? []).filter((row) =>
    matchesSearch(search, rowSearchText(shownDimension, row, t)),
  );
  const showProjectsTotal = !MULTI_VALUE_DIMENSIONS.includes(shownDimension);
  /*
   * Media of a project with several tags count under each tag, so no total row matches the tags.
   * The totals cover every group, so they are hidden too while the rows are filtered.
   */
  const showTotals = shownDimension !== 'tag' && !search.trim();
  const countColumn = (key: 'projects' | 'media' | 'images' | 'videos') => ({
    title: t(`statistics.breakdown.columns.${key}`),
    dataIndex: key,
    key,
    align: 'right' as const,
    width: COLUMN_WIDTHS.count,
    sorter: (a: StatisticsBreakdownRow, b: StatisticsBreakdownRow) => a[key] - b[key],
    render: (value: number) => (
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(value)}</span>
    ),
  });

  const columns: ColumnsType<StatisticsBreakdownRow> = [
    {
      title: t(`statistics.breakdown.dimensions.${shownDimension}`),
      key: 'name',
      width: COLUMN_WIDTHS.name,
      ellipsis: true,
      render: (_, row) => <BreakdownRowName dimension={shownDimension} row={row} />,
    },
    countColumn('projects'),
    countColumn('media'),
    countColumn('images'),
    countColumn('videos'),
  ];

  return (
    <StatisticsSectionCard
      title={t('statistics.breakdown.title')}
      extra={
        <Segmented<StatisticsBreakdownRange>
          size="small"
          value={range}
          onChange={(value) => {
            setRange(value);
            setPage(1);
          }}
          options={[
            { label: t('statistics.scope.snapshot'), value: 'all' },
            { label: t('statistics.scope.period'), value: 'period' },
          ]}
        />
      }
      query={query}
      onRefresh={() => void query.refetch()}
    >
      <Flex vertical gap={12}>
        <Flex wrap justify="space-between" align="center" gap={12}>
          <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
            <Segmented<StatisticsBreakdownDimension>
              value={dimension}
              onChange={(value) => {
                // Names of one grouping never match another, so the search starts over.
                setDimension(value);
                setSearch('');
                setPage(1);
              }}
              options={STATISTICS_BREAKDOWN_DIMENSIONS.map((value) => ({
                label: t(`statistics.breakdown.dimensions.${value}`),
                value,
              }))}
            />
          </div>
          <Input
            allowClear
            prefix={<Search size={14} aria-hidden />}
            placeholder={t('statistics.breakdown.search', {
              dimension: t(`statistics.breakdown.dimensions.${dimension}`).toLowerCase(),
            })}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            style={{ width: 240, maxWidth: '100%' }}
          />
        </Flex>
        <ConfigProvider theme={{ token: { fontWeightStrong: emphasisWeight } }}>
          <Table<StatisticsBreakdownRow>
            size="small"
            tableLayout="fixed"
            rowKey={(row) => row.key ?? '__none__'}
            columns={columns}
            dataSource={rows}
            scroll={{ x: TABLE_WIDTH }}
            locale={{
              emptyText: t(
                search.trim() ? 'statistics.breakdown.noMatch' : 'statistics.breakdown.empty',
              ),
            }}
            pagination={
              rows.length > PAGE_SIZE
                ? { current: page, onChange: setPage, pageSize: PAGE_SIZE, showSizeChanger: false }
                : false
            }
            summary={() =>
              showTotals && totals && rows.length > 0 ? (
                <Table.Summary.Row style={{ background: token.colorFillQuaternary }}>
                  <Table.Summary.Cell index={0}>
                    <span style={{ fontWeight: emphasisWeight }}>
                      {t('statistics.breakdown.total')}
                    </span>
                  </Table.Summary.Cell>
                  {(['projects', 'media', 'images', 'videos'] as const).map((key, index) => (
                    <Table.Summary.Cell key={key} index={index + 1} align="right">
                      {key !== 'projects' || showProjectsTotal ? (
                        <span
                          style={{ fontWeight: emphasisWeight, fontVariantNumeric: 'tabular-nums' }}
                        >
                          {formatNumber(totals[key])}
                        </span>
                      ) : null}
                    </Table.Summary.Cell>
                  ))}
                </Table.Summary.Row>
              ) : null
            }
          />
        </ConfigProvider>
        {rows.length > 0 && !showProjectsTotal ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t(
              shownDimension === 'tag'
                ? 'statistics.breakdown.overlapTags'
                : 'statistics.breakdown.overlapMedia',
            )}
          </Typography.Text>
        ) : null}
      </Flex>
    </StatisticsSectionCard>
  );
}

/** Text a row is found by: the name shown in the table (and the country code). */
function rowSearchText(
  dimension: StatisticsBreakdownDimension,
  row: StatisticsBreakdownRow,
  t: TFunction,
): string {
  if (row.key === null) return t(`statistics.breakdown.none.${dimension}`);
  if (dimension === 'resolution') {
    return t(`statistics.breakdown.resolutions.${row.key}`, { defaultValue: row.key });
  }
  if (dimension === 'extension') return `.${row.key}`;
  return [row.label ?? row.key, row.code].filter(Boolean).join(' ');
}

function BreakdownRowName({
  dimension,
  row,
}: {
  dimension: StatisticsBreakdownDimension;
  row: StatisticsBreakdownRow;
}) {
  const { t } = useTranslation();
  const access = usePermissions();

  if (row.key === null) {
    return (
      <Typography.Text type="secondary" italic>
        {t(`statistics.breakdown.none.${dimension}`)}
      </Typography.Text>
    );
  }
  if (dimension === 'resolution') {
    return (
      <span>{t(`statistics.breakdown.resolutions.${row.key}`, { defaultValue: row.key })}</span>
    );
  }
  if (dimension === 'extension') {
    return <span>.{row.key.toUpperCase()}</span>;
  }

  const name = row.label ?? row.key;
  const href = projectFilterLink(dimension, row.key, access);
  const content = (
    <Flex align="center" gap={8} style={{ minWidth: 0 }}>
      {dimension === 'country' ? (
        <CountryFlag flagUrl={row.flagUrl} code={row.code} name={name} />
      ) : null}
      <Typography.Text ellipsis={{ tooltip: name }} style={{ color: 'inherit' }}>
        {name}
      </Typography.Text>
    </Flex>
  );
  return href ? <Link to={href}>{content}</Link> : content;
}
