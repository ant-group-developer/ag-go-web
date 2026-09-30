import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAnalysisStats,
  getAssetAnalysis,
  getAssetSegments,
  getProjectAnalysisStatus,
  isTerminalStatus,
  runBackfill,
  startAssetAnalysis,
  type BackfillInput,
  type StartAnalysisInput,
} from '../api/analysis';

const POLL_INTERVAL_MS = 5_000;

const keys = {
  all: ['analysis'] as const,
  stats: (folderIds?: string[]) => [...keys.all, 'stats', folderIds ?? []] as const,
  assetAnalysis: (assetId: string) => [...keys.all, 'asset', assetId] as const,
  assetSegments: (assetId: string) => [...keys.all, 'segments', assetId] as const,
  projectStatus: (projectId: string) => [...keys.all, 'project-status', projectId] as const,
};

export function useAnalysisStats(folderIds?: string[]) {
  return useQuery({
    queryKey: keys.stats(folderIds),
    queryFn: () => getAnalysisStats(folderIds),
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

/** Poll while the analysis is not in a terminal state (completed/failed/cancelled). */
export function useAssetAnalysis(assetId: string, enabled = true) {
  return useQuery({
    queryKey: keys.assetAnalysis(assetId),
    queryFn: () => getAssetAnalysis(assetId),
    enabled: enabled && Boolean(assetId),
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll while current or latest analysis is in a non-terminal state.
      const activeStatus = data?.current?.status ?? data?.latest?.status;
      return isTerminalStatus(activeStatus) ? false : POLL_INTERVAL_MS;
    },
  });
}

export function useAssetSegments(assetId: string, enabled = true) {
  return useQuery({
    queryKey: keys.assetSegments(assetId),
    queryFn: () => getAssetSegments(assetId),
    enabled: enabled && Boolean(assetId),
  });
}

export function useProjectAnalysisStatus(projectId: string, enabled = true) {
  return useQuery({
    queryKey: keys.projectStatus(projectId),
    queryFn: () => getProjectAnalysisStatus(projectId),
    enabled: enabled && Boolean(projectId),
  });
}
