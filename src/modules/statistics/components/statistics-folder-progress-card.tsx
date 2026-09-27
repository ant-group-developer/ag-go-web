import { Flex, Table, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { usePermissions } from '../../account/hooks/use-current-account';
import type { StatisticsFolderProgress, StatisticsProgress } from '../types/statistics.type';
import { formatNumber, percentOf } from '../utils/statistics-format';
import { folderProjectsLink } from '../utils/statistics-links';
import { StatisticsEvaluationBar } from './statistics-evaluation-bar';
import { StatisticsSectionCard, type StatisticsQueryState } from './statistics-section-card';

/** Evaluation progress per folder holding projects, the most pending work first. */
export function StatisticsFolderProgressCard({
  query,
}: {
  query: StatisticsQueryState & { data: StatisticsProgress | undefined };
}) {
  const { t } = useTranslation();
  const access = usePermissions();
  const folders = query.data?.folders;

  const columns: ColumnsType<StatisticsFolderProgress> = [
    {
      title: t('statistics.folders.folder'),
      key: 'folder',
      render: (_, row) => {
        const href = folderProjectsLink(row.folderId, row.pending > 0, access);
        const name = <Typography.Text strong>{row.folderName}</Typography.Text>;
        return (
          <Flex vertical style={{ minWidth: 0 }}>
            {href ? (
              <Tooltip title={t('statistics.folders.openHint')}>
                <Link to={href}>{name}</Link>
              </Tooltip>
            ) : (
              name
            )}
            <Typography.Text
              type="secondary"
              ellipsis={{ tooltip: row.folderPath }}
              style={{ fontSize: 12 }}
            >
              {row.folderPath}
            </Typography.Text>
          </Flex>
        );
      },
    },
    {
      title: t('statistics.folders.projects'),
      dataIndex: 'projects',
      align: 'right',
      width: 80,
      render: (value: number) => formatNumber(value),
    },
    {
      title: t('statistics.folders.progress'),
      key: 'progress',
      width: 200,
      render: (_, row) => (
        <Flex vertical gap={4}>
          <Flex justify="space-between" style={{ fontSize: 12 }}>
            <span>
              {t('statistics.folders.evaluatedOf', {
                evaluated: formatNumber(row.approved + row.rejected),
                total: formatNumber(row.media),
              })}
            </span>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {percentOf(row.approved + row.rejected, row.media)}%
            </Typography.Text>
          </Flex>
          <StatisticsEvaluationBar counts={row} />
        </Flex>
      ),
    },
    {
      title: t('statistics.folders.pending'),
      dataIndex: 'pending',
      align: 'right',
      width: 90,
      render: (value: number) =>
        value > 0 ? <Typography.Text strong>{formatNumber(value)}</Typography.Text> : '0',
    },
  ];

  return (
    <StatisticsSectionCard
      title={t('statistics.folders.title')}
      extra={
        folders && folders.total > folders.items.length ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('statistics.showing', { shown: folders.items.length, total: folders.total })}
          </Typography.Text>
        ) : null
      }
      query={query}
      isEmpty={!folders?.items.length}
    >
      <Table
        rowKey="folderId"
        size="small"
        columns={columns}
        dataSource={folders?.items ?? []}
        pagination={false}
        scroll={{ x: 560 }}
      />
    </StatisticsSectionCard>
  );
}
