import type { StatisticsPeriodParams } from '../types/statistics.type';

export const statisticsQueryKeys = {
  all: ['statistics'] as const,
  summary: (period: StatisticsPeriodParams) =>
    [...statisticsQueryKeys.all, 'summary', period] as const,
  trend: (period: StatisticsPeriodParams) => [...statisticsQueryKeys.all, 'trend', period] as const,
  progress: () => [...statisticsQueryKeys.all, 'progress'] as const,
  team: (period: StatisticsPeriodParams) => [...statisticsQueryKeys.all, 'team', period] as const,
  operations: (period: StatisticsPeriodParams) =>
    [...statisticsQueryKeys.all, 'operations', period] as const,
  activity: () => [...statisticsQueryKeys.all, 'activity'] as const,
};
