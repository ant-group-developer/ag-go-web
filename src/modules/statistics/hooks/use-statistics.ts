import { useQuery } from '@tanstack/react-query';
import {
  getRenderingStatistics,
  getStatisticsOverview,
  type StatisticsQuery,
} from '../api/statistics';
import { statisticsQueryKeys } from '../queries/statistics-query-keys';

export function useStatisticsOverview(query: StatisticsQuery) {
  return useQuery({
    queryKey: [...statisticsQueryKeys.overview(), query],
    queryFn: () => getStatisticsOverview(query),
    refetchInterval: 30_000,
  });
}

export function useRenderingStatistics(query: StatisticsQuery) {
  return useQuery({
    queryKey: [...statisticsQueryKeys.rendering(), query],
    queryFn: () => getRenderingStatistics(query),
    refetchInterval: 15_000,
  });
}
