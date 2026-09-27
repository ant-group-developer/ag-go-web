import { Flex, Typography, theme } from 'antd';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { usePermissions } from '../../account/hooks/use-current-account';
import {
  PROJECT_EVALUATION_STATUSES,
  type ProjectEvaluationStatus,
} from '../../projects/types/project-list-params.type';
import { getProjectStatus } from '../../projects/utils/project-status.util';
import type { StatisticsSummary } from '../types/statistics.type';
import { projectStatusColor } from '../utils/statistics-colors';
import { formatNumber, percentOf } from '../utils/statistics-format';
import { projectStatusLink } from '../utils/statistics-links';
import { StatisticsEvaluationBar, StatisticsEvaluationLegend } from './statistics-evaluation-bar';
import { StatisticsSectionCard, type StatisticsQueryState } from './statistics-section-card';

/**
 * Current state of projects (one bar per status, share of all projects) and of media
 * evaluation (one stacked bar). A status row opens the project list filtered on it.
 */
export function StatisticsStatusDistributionCard({
  query,
}: {
  query: StatisticsQueryState & { data: StatisticsSummary | undefined };
}) {
  const { t } = useTranslation();
  const snapshot = query.data?.snapshot;

  return (
    <StatisticsSectionCard
      title={t('statistics.distribution.title')}
      query={query}
      isEmpty={!snapshot?.projects}
    >
      {snapshot ? (
        <Flex vertical gap={20}>
          <Flex vertical gap={10}>
            <Typography.Text strong>{t('statistics.distribution.projects')}</Typography.Text>
            {PROJECT_EVALUATION_STATUSES.map((status) => (
              <ProjectStatusRow
                key={status}
                status={status}
                count={snapshot.projectsByStatus[status] ?? 0}
                total={snapshot.projects}
              />
            ))}
          </Flex>
          <Flex vertical gap={10}>
            <Typography.Text strong>{t('statistics.distribution.media')}</Typography.Text>
            <StatisticsEvaluationBar counts={snapshot.evaluation} height={12} />
            <StatisticsEvaluationLegend counts={snapshot.evaluation} />
          </Flex>
        </Flex>
      ) : null}
    </StatisticsSectionCard>
  );
}

function ProjectStatusRow({
  status,
  count,
  total,
}: {
  status: ProjectEvaluationStatus;
  count: number;
  total: number;
}) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const access = usePermissions();
  const href = count > 0 ? projectStatusLink(status, access) : null;
  const percent = percentOf(count, total);

  const row = (
    <Flex vertical gap={4} style={{ padding: '2px 0' }}>
      <Flex justify="space-between" align="center" gap={8}>
        <span style={{ color: token.colorText }}>{t(getProjectStatus(status).label)}</span>
        <Flex align="center" gap={6}>
          <strong style={{ color: token.colorText }}>{formatNumber(count)}</strong>
          <span style={{ color: token.colorTextTertiary, minWidth: 36, textAlign: 'right' }}>
            {percent}%
          </span>
          <ChevronRight
            size={14}
            style={{ color: href ? token.colorTextTertiary : 'transparent' }}
            aria-hidden
          />
        </Flex>
      </Flex>
      <div style={{ height: 6, borderRadius: 3, background: token.colorFillTertiary }}>
        <div
          style={{
            width: `${percent}%`,
            minWidth: count > 0 ? 4 : 0,
            height: '100%',
            borderRadius: 3,
            background: projectStatusColor(status, token),
          }}
        />
      </div>
    </Flex>
  );

  return href ? (
    <Link to={href} style={{ color: 'inherit' }}>
      {row}
    </Link>
  ) : (
    row
  );
}
