import { PageContainer } from '@ant-design/pro-components';
import { Col, Row, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { GO_PERMISSIONS } from '../../../shared/auth/permissions';
import { usePermissions } from '../../account/hooks/use-current-account';
import { StatisticsActivityCard } from '../components/statistics-activity-card';
import { StatisticsAttentionProjectsCard } from '../components/statistics-attention-projects-card';
import { StatisticsFolderProgressCard } from '../components/statistics-folder-progress-card';
import { StatisticsKpiRow } from '../components/statistics-kpi-row';
import { StatisticsOperationsCard } from '../components/statistics-operations-card';
import { StatisticsPeriodFilter } from '../components/statistics-period-filter';
import { StatisticsStatusDistributionCard } from '../components/statistics-status-distribution-card';
import { StatisticsTeamCard } from '../components/statistics-team-card';
import { StatisticsTrendChartCard } from '../components/statistics-trend-chart-card';
import {
  useStatisticsActivity,
  useStatisticsOperations,
  useStatisticsProgress,
  useStatisticsSummary,
  useStatisticsTeam,
  useStatisticsTrend,
} from '../hooks/use-statistics';
import { useStatisticsPeriod } from '../hooks/use-statistics-period';

/**
 * Manager dashboard: headline numbers, evaluation progress over the period, where work is
 * waiting (folders, projects), who does it, and how rendering/imports run. Snapshot widgets show
 * the current state; period widgets follow the selected period.
 */
export function StatisticsPage() {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const period = useStatisticsPeriod();
  const { can } = usePermissions();
  const canReadAudit = can(GO_PERMISSIONS.AUDIT_READ);

  const summary = useStatisticsSummary(period.params);
  const trend = useStatisticsTrend(period.params);
  const progress = useStatisticsProgress();
  const team = useStatisticsTeam(period.params);
  const operations = useStatisticsOperations(period.params);
  const activity = useStatisticsActivity(canReadAudit);
  // Without the activity card, team and operations share the last row.
  const lastRowColumn = canReadAudit ? { xs: 24, lg: 12, xxl: 8 } : { xs: 24, lg: 12 };

  return (
    <PageContainer
      title={t('statistics.title')}
      subTitle={t('statistics.subtitle')}
      extra={
        <StatisticsPeriodFilter
          preset={period.preset}
          range={period.range}
          comparedWith={summary.data?.period}
          onPresetChange={period.setPreset}
          onCustomRangeChange={period.setCustomRange}
        />
      }
      style={{ background: token.colorBgLayout, paddingBlock: 16, paddingInline: 16 }}
    >
      <StatisticsKpiRow query={summary} />

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={16}>
          <StatisticsTrendChartCard query={trend} />
        </Col>
        <Col xs={24} xl={8}>
          <StatisticsStatusDistributionCard query={summary} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={12}>
          <StatisticsFolderProgressCard query={progress} />
        </Col>
        <Col xs={24} xl={12}>
          <StatisticsAttentionProjectsCard query={progress} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col {...lastRowColumn}>
          <StatisticsTeamCard query={team} />
        </Col>
        <Col {...lastRowColumn}>
          <StatisticsOperationsCard query={operations} />
        </Col>
        {canReadAudit ? (
          <Col xs={24} xxl={8}>
            <StatisticsActivityCard query={activity} />
          </Col>
        ) : null}
      </Row>
    </PageContainer>
  );
}
