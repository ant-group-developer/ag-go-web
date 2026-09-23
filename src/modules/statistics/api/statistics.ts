import { apiClient } from '../../../shared/lib/api-client';

export type StatisticsOverview = {
  projects: number;
  assets: number;
  media: number;
  originalBytes: string;
  evaluation: {
    pending: number;
    approved: number;
    rejected: number;
  };
};

export type RenderingStatistics = {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  averageRenderSeconds: number;
};

export type StatisticsQuery = { from?: string; to?: string };

function queryString(query: StatisticsQuery) {
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function getStatisticsOverview(query: StatisticsQuery = {}) {
  return apiClient<StatisticsOverview>(`/statistics/overview${queryString(query)}`);
}

export function getRenderingStatistics(query: StatisticsQuery = {}) {
  return apiClient<RenderingStatistics>(`/statistics/rendering${queryString(query)}`);
}
