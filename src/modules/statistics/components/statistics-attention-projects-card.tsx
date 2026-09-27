import { Flex, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { usePermissions } from '../../account/hooks/use-current-account';
import type { StatisticsAttentionProject, StatisticsProgress } from '../types/statistics.type';
import { ageInDays, formatNumber } from '../utils/statistics-format';
import { projectDetailLink } from '../utils/statistics-links';
import { StatisticsEvaluationBar } from './statistics-evaluation-bar';
import { StatisticsSectionCard, type StatisticsQueryState } from './statistics-section-card';

/** Media waiting longer than this many days is highlighted. */
const OVERDUE_DAYS = 7;

/** Projects with media still waiting for evaluation, the longest-waiting first. */
export function StatisticsAttentionProjectsCard({
  query,
}: {
  query: StatisticsQueryState & { data: StatisticsProgress | undefined };
}) {
  const { t } = useTranslation();
  const access = usePermissions();
  const projects = query.data?.attentionProjects;

  const columns: ColumnsType<StatisticsAttentionProject> = [
    {
      title: t('statistics.attention.project'),
      key: 'project',
      render: (_, row) => {
        const href = projectDetailLink(row.projectId, access);
        const name = (
          <Typography.Text strong ellipsis={{ tooltip: row.projectName }}>
            {row.projectName}
          </Typography.Text>
        );
        return (
          <Flex vertical style={{ minWidth: 0 }}>
            {href ? <Link to={href}>{name}</Link> : name}
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
      title: t('statistics.attention.progress'),
      key: 'progress',
      width: 180,
      render: (_, row) => (
        <Flex vertical gap={4}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('statistics.attention.pendingOf', {
              pending: formatNumber(row.pending),
              total: formatNumber(row.media),
            })}
          </Typography.Text>
          <StatisticsEvaluationBar counts={row} />
        </Flex>
      ),
    },
    {
      title: t('statistics.attention.waiting'),
      dataIndex: 'oldestPendingAt',
      align: 'right',
      width: 120,
      render: (value: string | null) => {
        const days = ageInDays(value);
        const label =
          days === 0
            ? t('statistics.attention.today')
            : t('statistics.attention.days', { count: days });
        return (
          <Typography.Text strong type={days > OVERDUE_DAYS ? 'danger' : undefined}>
            {label}
          </Typography.Text>
        );
      },
    },
  ];

  return (
    <StatisticsSectionCard
      title={t('statistics.attention.title')}
      extra={
        projects && projects.total > projects.items.length ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('statistics.showing', { shown: projects.items.length, total: projects.total })}
          </Typography.Text>
        ) : null
      }
      query={query}
      isEmpty={!projects?.items.length}
      emptyText={t('statistics.attention.empty')}
    >
      <Table
        rowKey="projectId"
        size="small"
        columns={columns}
        dataSource={projects?.items ?? []}
        pagination={false}
        scroll={{ x: 520 }}
      />
    </StatisticsSectionCard>
  );
}
