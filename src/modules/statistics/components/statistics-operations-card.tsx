import { Divider, Flex, Statistic, Tag, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { formatDate } from '../../../shared/lib/format-date';
import { usePermissions } from '../../account/hooks/use-current-account';
import type { StatisticsOperations } from '../types/statistics.type';
import { formatDuration, formatNumber } from '../utils/statistics-format';
import { logsTabLink, projectDetailLink } from '../utils/statistics-links';
import { StatisticsSectionCard, type StatisticsQueryState } from './statistics-section-card';

type StatItem = { key: string; value: string; danger?: boolean };

/** Render queue and Google Drive imports: live queue plus what finished or failed in the period. */
export function StatisticsOperationsCard({
  query,
}: {
  query: StatisticsQueryState & { data: StatisticsOperations | undefined };
}) {
  const { t } = useTranslation();
  const access = usePermissions();
  const operations = query.data;
  const renderLogs = logsTabLink('render', access);
  const importLogs = logsTabLink('import', access);

  return (
    <StatisticsSectionCard title={t('statistics.operations.title')} query={query}>
      {operations ? (
        <Flex vertical gap={4}>
          <SectionHeader title={t('statistics.operations.render')} href={renderLogs} />
          <StatRow
            items={[
              { key: 'queued', value: formatNumber(operations.render.queued) },
              { key: 'processing', value: formatNumber(operations.render.processing) },
              { key: 'completed', value: formatNumber(operations.render.completed) },
              {
                key: 'failed',
                value: formatNumber(operations.render.failed),
                danger: operations.render.failed > 0,
              },
              { key: 'avgRender', value: formatDuration(operations.render.averageRenderSeconds) },
            ]}
          />

          <Divider style={{ margin: '12px 0' }} />
          <SectionHeader title={t('statistics.operations.imports')} href={importLogs} />
          <StatRow
            items={[
              { key: 'active', value: formatNumber(operations.imports.active) },
              { key: 'paused', value: formatNumber(operations.imports.paused) },
              { key: 'completed', value: formatNumber(operations.imports.completed) },
              {
                key: 'partial',
                value: formatNumber(operations.imports.partial),
                danger: operations.imports.partial > 0,
              },
              {
                key: 'failed',
                value: formatNumber(operations.imports.failed),
                danger: operations.imports.failed > 0,
              },
            ]}
          />

          <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
            {t('statistics.operations.recentProblems')}
          </Typography.Text>
          {operations.imports.recentProblems.length === 0 ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('statistics.operations.noProblems')}
            </Typography.Text>
          ) : (
            operations.imports.recentProblems.map((problem) => {
              const href = projectDetailLink(problem.projectId, access);
              return (
                <Flex key={problem.id} justify="space-between" align="center" gap={8}>
                  <Flex vertical style={{ minWidth: 0 }}>
                    {href ? (
                      <Link to={href}>
                        <Typography.Text ellipsis>{problem.projectName}</Typography.Text>
                      </Link>
                    ) : (
                      <Typography.Text ellipsis>{problem.projectName}</Typography.Text>
                    )}
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {t('statistics.operations.failedItems', {
                        failed: formatNumber(problem.failedItems),
                        total: formatNumber(problem.totalItems),
                      })}{' '}
                      · {formatDate(problem.updatedAt)}
                    </Typography.Text>
                  </Flex>
                  <Tag color={problem.status === 'failed' ? 'error' : 'warning'} bordered={false}>
                    {t(`statistics.operations.${problem.status}`)}
                  </Tag>
                </Flex>
              );
            })
          )}
        </Flex>
      ) : null}
    </StatisticsSectionCard>
  );
}

function SectionHeader({ title, href }: { title: string; href: string | null }) {
  const { t } = useTranslation();
  return (
    <Flex justify="space-between" align="center">
      <Typography.Text strong>{title}</Typography.Text>
      {href ? (
        <Link to={href} style={{ fontSize: 12 }}>
          {t('statistics.operations.viewLogs')}
        </Link>
      ) : null}
    </Flex>
  );
}

function StatRow({ items }: { items: StatItem[] }) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  return (
    <Flex gap={8}>
      {items.map((item) => (
        <div key={item.key} style={{ flex: 1, minWidth: 0 }}>
          <Statistic
            title={
              <Typography.Text type="secondary" ellipsis style={{ fontSize: 12 }}>
                {t(`statistics.operations.${item.key}`)}
              </Typography.Text>
            }
            value={item.value}
            valueStyle={{
              fontSize: 18,
              fontWeight: 600,
              color: item.danger ? token.colorError : undefined,
            }}
          />
        </div>
      ))}
    </Flex>
  );
}
