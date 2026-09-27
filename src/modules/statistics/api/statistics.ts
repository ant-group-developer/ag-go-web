import { apiClient } from '../../../shared/lib/api-client';
import type {
  StatisticsActivity,
  StatisticsOperations,
  StatisticsPeriodParams,
  StatisticsProgress,
  StatisticsSummary,
  StatisticsTeam,
  StatisticsTrend,
} from '../types/statistics.type';

function withQuery(path: string, params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function getStatisticsSummary(period: StatisticsPeriodParams) {
  return apiClient<StatisticsSummary>(withQuery('/statistics/summary', period));
}

export function getStatisticsTrend(period: StatisticsPeriodParams) {
  return apiClient<StatisticsTrend>(withQuery('/statistics/trend', period));
}

export function getStatisticsProgress(limit?: number) {
  return apiClient<StatisticsProgress>(withQuery('/statistics/progress', { limit }));
}

export function getStatisticsTeam(period: StatisticsPeriodParams) {
  return apiClient<StatisticsTeam>(withQuery('/statistics/team', period));
}

export function getStatisticsOperations(period: StatisticsPeriodParams) {
  return apiClient<StatisticsOperations>(withQuery('/statistics/operations', period));
}

export function getStatisticsActivity(limit?: number) {
  return apiClient<StatisticsActivity>(withQuery('/statistics/activity', { limit }));
}
