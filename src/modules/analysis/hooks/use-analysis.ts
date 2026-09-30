import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelAssetAnalysis,
  cancelBatch,
  getAnalysisLogs,
  getAnalysisStats,
  getAssetAnalysis,
  getProjectAnalysisStatus,
  isTerminalStatus,
  listAnalysisBatches,
  pauseAssetAnalysis,
  pauseBatch,
  resumeAssetAnalysis,
  resumeBatch,
  runBackfill,
  startAssetAnalysis,
  type AnalysisLogsQuery,
  type BackfillInput,
  type BatchListParams,
  type BatchStatus,
  type StartAnalysisInput,
} from '../api/analysis';

const POLL_INTERVAL_MS = 5_000;

const keys = {
  all: ['analysis'] as const,
  stats: (folderIds?: string[]) => [...keys.all, 'stats', folderIds ?? []] as const,
  logs: (query: AnalysisLogsQuery) => [...keys.all, 'logs', query] as const,
  assetAnalysis: (assetId: string) => [...keys.all, 'asset', assetId] as const,
  batches: (params: BatchListParams) => [...keys.all, 'batches', params] as const,
  projectStatus: (projectId: string) => [...keys.all, 'project-status', projectId] as const,
};

const IN_FLIGHT_STATUSES = ['queued', 'extracting', 'extracted', 'describing'] as const;
const ACTIVE_BATCH_STATUSES: BatchStatus[] = ['running', 'paused'];

/** Polls while any asset in scope is still being analysed, so a running backfill shows progress. */
export function useAnalysisStats(folderIds?: string[]) {
  return useQuery({
    queryKey: keys.stats(folderIds),
    queryFn: () => getAnalysisStats(folderIds),
    refetchInterval: (query) => {
      const counts = query.state.data?.counts;
      const inFlight = counts ? IN_FLIGHT_STATUSES.some((status) => counts[status] > 0) : false;
      return inFlight ? POLL_INTERVAL_MS : false;
    },
  });
}

export function useAnalysisLogs(query: AnalysisLogsQuery, autoRefresh: boolean) {
  return useQuery({
    queryKey: keys.logs(query),
    queryFn: () => getAnalysisLogs(query),
    placeholderData: keepPreviousData,
    refetchInterval: autoRefresh ? POLL_INTERVAL_MS : false,
  });
}

export function useBackfillAnalysis() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: BackfillInput) => runBackfill(input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useStartAssetAnalysis() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, input }: { assetId: string; input?: StartAnalysisInput }) =>
      startAssetAnalysis(assetId, input),
    onSuccess: (_, { assetId }) => {
      void client.invalidateQueries({ queryKey: keys.assetAnalysis(assetId) });
    },
  });
}

/** Poll while the analysis is not in a terminal state (completed/failed/cancelled/null). */
export function useAssetAnalysis(assetId: string, enabled = true) {
  return useQuery({
    queryKey: keys.assetAnalysis(assetId),
    queryFn: () => getAssetAnalysis(assetId),
    enabled: enabled && Boolean(assetId),
    refetchInterval: (query) => {
      const status = query.state.data?.status ?? null;
      return isTerminalStatus(status) ? false : POLL_INTERVAL_MS;
    },
  });
}

/** Polls every 5s while any batch is running or paused. */
export function useAnalysisBatches(params: BatchListParams = {}) {
  return useQuery({
    queryKey: keys.batches(params),
    queryFn: () => listAnalysisBatches(params),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      const hasActive = items.some((b) => ACTIVE_BATCH_STATUSES.includes(b.status));
      return hasActive ? POLL_INTERVAL_MS : false;
    },
  });
}

export function usePauseBatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pauseBatch(id),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useResumeBatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resumeBatch(id),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useCancelBatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelBatch(id),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.all }),
  });
}

export function usePauseAssetAnalysis() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => pauseAssetAnalysis(assetId),
    onSuccess: (_, assetId) =>
      void client.invalidateQueries({ queryKey: keys.assetAnalysis(assetId) }),
  });
}

export function useResumeAssetAnalysis() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => resumeAssetAnalysis(assetId),
    onSuccess: (_, assetId) =>
      void client.invalidateQueries({ queryKey: keys.assetAnalysis(assetId) }),
  });
}

export function useCancelAssetAnalysis() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => cancelAssetAnalysis(assetId),
    onSuccess: (_, assetId) =>
      void client.invalidateQueries({ queryKey: keys.assetAnalysis(assetId) }),
  });
}

export function useProjectAnalysisStatus(projectId: string, enabled = true) {
  return useQuery({
    queryKey: keys.projectStatus(projectId),
    queryFn: () => getProjectAnalysisStatus(projectId),
    enabled: enabled && Boolean(projectId),
  });
}
