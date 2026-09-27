import { Col, Progress, Row, Skeleton, theme } from 'antd';
import { CheckCheck, Clock3, Film, FolderKanban, Gauge, HardDrive } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { StatisticsSummary } from '../types/statistics.type';
import { EVALUATION_COLORS } from '../utils/statistics-colors';
import {
  ageInDays,
  computeDelta,
  formatNumber,
  formatStorage,
  percentOf,
} from '../utils/statistics-format';
import { StatisticsKpiCard } from './statistics-kpi-card';
import { StatisticsLoadError, type StatisticsQueryState } from './statistics-section-card';

const KPI_COLUMN = { xs: 24, sm: 12, lg: 8, xxl: 4 } as const;

/** The six headline numbers of the page, from `/statistics/summary`. */
export function StatisticsKpiRow({
  query,
}: {
  query: StatisticsQueryState & { data: StatisticsSummary | undefined };
}) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const summary = query.data;

  if (!summary) {
    return query.isError ? (
      <StatisticsLoadError onRetry={query.refetch} />
    ) : (
      <Row gutter={[16, 16]}>
        {Array.from({ length: 6 }, (_, index) => (
          <Col key={index} {...KPI_COLUMN}>
            <Skeleton.Node active style={{ width: '100%', height: 150 }} />
          </Col>
        ))}
      </Row>
    );
  }

  const { snapshot, inPeriod } = summary;
  const { evaluation, media, storage } = snapshot;
  const evaluated = evaluation.approved + evaluation.rejected;
  const completion = percentOf(evaluated, media.total);
  const decisions = inPeriod.decisions;
  const decidedNow = decisions.approved.current + decisions.rejected.current;
  const decidedBefore = decisions.approved.previous + decisions.rejected.previous;
  const totalBytes = Number(storage.originalBytes) + Number(storage.renderedBytes);

  const cards = [
    {
      key: 'projects',
      title: t('statistics.kpi.projects'),
      value: formatNumber(snapshot.projects),
      icon: <FolderKanban size={18} />,
      accent: token.colorPrimary,
      scope: 'snapshot' as const,
      sub: t('statistics.kpi.newProjects', { count: inPeriod.newProjects.current }),
      delta: computeDelta(inPeriod.newProjects.current, inPeriod.newProjects.previous),
    },
    {
      key: 'media',
      title: t('statistics.kpi.media'),
      value: formatNumber(media.total),
      icon: <Film size={18} />,
      accent: token.cyan6,
      scope: 'snapshot' as const,
      sub: t('statistics.kpi.mediaSplit', {
        images: formatNumber(media.images),
        videos: formatNumber(media.videos),
        added: formatNumber(inPeriod.newMedia.current),
      }),
      delta: computeDelta(inPeriod.newMedia.current, inPeriod.newMedia.previous),
    },
    {
      key: 'pending',
      title: t('statistics.kpi.pending'),
      value: formatNumber(evaluation.pending),
      icon: <Clock3 size={18} />,
      accent: EVALUATION_COLORS.pending,
      scope: 'snapshot' as const,
      sub: evaluation.oldestPendingAt
        ? t('statistics.kpi.oldestPending', { count: ageInDays(evaluation.oldestPendingAt) })
        : t('statistics.kpi.noPending'),
    },
    {
      key: 'evaluated',
      title: t('statistics.kpi.evaluated'),
      value: formatNumber(decidedNow),
      icon: <CheckCheck size={18} />,
      accent: EVALUATION_COLORS.approved,
      scope: 'period' as const,
      sub: t('statistics.kpi.evaluatedSplit', {
        approved: formatNumber(decisions.approved.current),
        rejected: formatNumber(decisions.rejected.current),
      }),
      delta: computeDelta(decidedNow, decidedBefore),
    },
    {
      key: 'completion',
      title: t('statistics.kpi.completion'),
      value: `${completion}%`,
      icon: <Gauge size={18} />,
      accent: token.purple6,
      scope: 'snapshot' as const,
      sub: t('statistics.kpi.completionSplit', {
        evaluated: formatNumber(evaluated),
        total: formatNumber(media.total),
      }),
      footer: (
        <Progress
          percent={completion}
          showInfo={false}
          size="small"
          strokeColor={token.purple6}
          style={{ margin: 0 }}
        />
      ),
    },
    {
      key: 'storage',
      title: t('statistics.kpi.storage'),
      value: formatStorage(totalBytes),
      icon: <HardDrive size={18} />,
      accent: token.gold6,
      scope: 'snapshot' as const,
      sub: t('statistics.kpi.storageSplit', {
        original: formatStorage(storage.originalBytes),
        rendered: formatStorage(storage.renderedBytes),
      }),
    },
  ];

  return (
    <Row
      gutter={[16, 16]}
      style={{ opacity: query.isPlaceholderData ? 0.55 : 1, transition: 'opacity 0.2s' }}
    >
      {cards.map(({ key, ...card }) => (
        <Col key={key} {...KPI_COLUMN}>
          <StatisticsKpiCard {...card} />
        </Col>
      ))}
    </Row>
  );
}
