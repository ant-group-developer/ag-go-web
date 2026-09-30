import type {
  StatisticsBreakdownDimension,
  StatisticsBreakdownRange,
  StatisticsPeriodParams,
} from '../types/statistics.type';

export const statisticsQueryKeys = {
  all: ['statistics'] as const,
  summary: (period: StatisticsPeriodParams) =>
    [...statisticsQueryKeys.all, 'summary', period] as const,
  trend: (period: StatisticsPeriodParams) => [...statisticsQueryKeys.all, 'trend', period] as const,
  projectTrend: (period: StatisticsPeriodParams) =>
    [...statisticsQueryKeys.all, 'project-trend', period] as const,
  breakdown: (
    period: StatisticsPeriodParams,
    dimension: StatisticsBreakdownDimension,
    range: StatisticsBreakdownRange,
  ) => [...statisticsQueryKeys.all, 'breakdown', period, dimension, range] as const,
  progress: () => [...statisticsQueryKeys.all, 'progress'] as const,
  team: (period: StatisticsPeriodParams) => [...statisticsQueryKeys.all, 'team', period] as const,
  operations: (period: StatisticsPeriodParams) =>
    [...statisticsQueryKeys.all, 'operations', period] as const,
  activity: () => [...statisticsQueryKeys.all, 'activity'] as const,
};
