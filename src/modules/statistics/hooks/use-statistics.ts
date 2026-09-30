import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getStatisticsActivity,
  getStatisticsBreakdown,
  getStatisticsOperations,
  getStatisticsProgress,
  getStatisticsProjectTrend,
  getStatisticsSummary,
  getStatisticsTeam,
  getStatisticsTrend,
} from '../api/statistics';
import { statisticsQueryKeys } from '../queries/statistics-query-keys';
import type {
  StatisticsBreakdownDimension,
  StatisticsBreakdownRange,
  StatisticsPeriodParams,
} from '../types/statistics.type';

/*
 * One query per widget so each card loads, fails and refreshes on its own. Period queries keep
 * the previous data while a new period loads, so cards do not flash empty on a filter change.
 */

export function useStatisticsSummary(period: StatisticsPeriodParams) {
  return useQuery({
    queryKey: statisticsQueryKeys.summary(period),
    queryFn: () => getStatisticsSummary(period),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

export function useStatisticsTrend(period: StatisticsPeriodParams) {
  return useQuery({
    queryKey: statisticsQueryKeys.trend(period),
    queryFn: () => getStatisticsTrend(period),
    placeholderData: keepPreviousData,
  });
}

export function useStatisticsProjectTrend(period: StatisticsPeriodParams) {
  return useQuery({
    queryKey: statisticsQueryKeys.projectTrend(period),
    queryFn: () => getStatisticsProjectTrend(period),
    placeholderData: keepPreviousData,
  });
}

export function useStatisticsBreakdown(
  period: StatisticsPeriodParams,
  dimension: StatisticsBreakdownDimension,
  range: StatisticsBreakdownRange,
) {
  return useQuery({
    queryKey: statisticsQueryKeys.breakdown(period, dimension, range),
    queryFn: () => getStatisticsBreakdown(period, dimension, range),
    placeholderData: keepPreviousData,
  });
}

export function useStatisticsProgress() {
  return useQuery({
    queryKey: statisticsQueryKeys.progress(),
    queryFn: () => getStatisticsProgress(),
    refetchInterval: 60_000,
  });
}

export function useStatisticsTeam(period: StatisticsPeriodParams) {
  return useQuery({
    queryKey: statisticsQueryKeys.team(period),
    queryFn: () => getStatisticsTeam(period),
    placeholderData: keepPreviousData,
  });
}

export function useStatisticsOperations(period: StatisticsPeriodParams) {
  return useQuery({
    queryKey: statisticsQueryKeys.operations(period),
    queryFn: () => getStatisticsOperations(period),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });
}

/** Audit entries: only fetched for viewers with audit access (the API requires it too). */
export function useStatisticsActivity(enabled: boolean) {
  return useQuery({
    queryKey: statisticsQueryKeys.activity(),
    queryFn: () => getStatisticsActivity(),
    enabled,
    refetchInterval: 30_000,
  });
}
