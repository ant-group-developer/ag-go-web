import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelRenderBatch,
  createRenderBatch,
  getAllRenderBatches,
  getAutoRenderJobs,
  getProjectRenderBatches,
  getRenderBatch,
  getRenderBatchJobs,
  getRenderProfiles,
  pauseRenderBatch,
  resumeRenderBatch,
  retryRenderJob,
  updateRenderProfile,
  type AutoRenderJobsParams,
  type RenderBatch,
} from '../api/render';

const keys = {
  all: ['render'] as const,
  profiles: () => [...keys.all, 'profiles'] as const,
  batch: (id: string) => [...keys.all, 'batch', id] as const,
  projectBatches: (id: string) => [...keys.all, 'project-batches', id] as const,
  allBatches: () => [...keys.all, 'all-batches'] as const,
  jobs: (id: string) => [...keys.all, 'jobs', id] as const,
  autoJobs: (params: AutoRenderJobsParams) => [...keys.all, 'auto-jobs', params] as const,
};

export function useRenderProfiles() {
  return useQuery({ queryKey: keys.profiles(), queryFn: getRenderProfiles });
}

export function useUpdateRenderProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateRenderProfile>[1] }) =>
      updateRenderProfile(id, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.profiles() });
    },
  });
}

const TERMINAL_STATUSES = ['completed', 'partial', 'failed', 'cancelled'];
const POLL_INTERVAL_MS = 5_000;

export function useRenderBatch(id: string) {
  return useQuery({
    queryKey: keys.batch(id),
    queryFn: () => getRenderBatch(id),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data && TERMINAL_STATUSES.includes(query.state.data.status)
        ? false
        : POLL_INTERVAL_MS,
  });
}

/** Poll while anything in the list is still queued or processing. */
function pollWhileActive<T extends { status: string }>(items: T[] | undefined) {
  return items?.some((item) => !TERMINAL_STATUSES.includes(item.status)) ? POLL_INTERVAL_MS : false;
}

export function useProjectRenderBatches(projectId: string) {
  return useQuery({
    queryKey: keys.projectBatches(projectId),
    queryFn: () => getProjectRenderBatches(projectId),
    enabled: Boolean(projectId),
    refetchInterval: (query) => pollWhileActive(query.state.data),
  });
}

export function useAllRenderBatches() {
  return useQuery({
    queryKey: keys.allBatches(),
    queryFn: getAllRenderBatches,
    refetchInterval: (query) => pollWhileActive(query.state.data),
  });
}

export function useRenderBatchJobs(batchId: string) {
  return useQuery({
    queryKey: keys.jobs(batchId),
    queryFn: () => getRenderBatchJobs(batchId),
    enabled: Boolean(batchId),
    refetchInterval: (query) => pollWhileActive(query.state.data),
  });
}

/** One page of the render jobs queued by uploads and Drive imports (outside any batch). */
export function useAutoRenderJobs(params: AutoRenderJobsParams, enabled = true) {
  return useQuery({
    queryKey: keys.autoJobs(params),
    queryFn: () => getAutoRenderJobs(params),
    enabled,
    // Keep the current rows on screen while the next page or filter loads.
    placeholderData: keepPreviousData,
    // Poll while any job in scope (not only on this page) is still queued or processing.
    refetchInterval: (query) =>
      (query.state.data?.counts.active ?? 0) > 0 ? POLL_INTERVAL_MS : false,
  });
}

export function useRetryRenderJob() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: retryRenderJob,
    onSuccess: (job) => {
      if (job.renderBatchId) {
        void client.invalidateQueries({ queryKey: keys.jobs(job.renderBatchId) });
        void client.invalidateQueries({ queryKey: keys.batch(job.renderBatchId) });
        void client.invalidateQueries({ queryKey: keys.allBatches() });
      } else {
        void client.invalidateQueries({ queryKey: [...keys.all, 'auto-jobs'] });
      }
    },
  });
}

export function useCreateRenderBatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createRenderBatch,
    onSuccess: (batch) => {
      void client.invalidateQueries({ queryKey: keys.batch(batch.id) });
      void client.invalidateQueries({ queryKey: keys.projectBatches(batch.projectId ?? '') });
      void client.invalidateQueries({ queryKey: keys.allBatches() });
    },
  });
}

/** A pause/resume/cancel of a batch: refreshes it, its jobs and the lists showing it. */
function useBatchMutation(mutationFn: (id: string) => Promise<RenderBatch>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (batch) => {
      void client.invalidateQueries({ queryKey: keys.batch(batch.id) });
      void client.invalidateQueries({ queryKey: keys.jobs(batch.id) });
      void client.invalidateQueries({ queryKey: [...keys.all, 'project-batches'] });
      void client.invalidateQueries({ queryKey: keys.allBatches() });
    },
  });
}

export function useCancelRenderBatch() {
  return useBatchMutation(cancelRenderBatch);
}

export function usePauseRenderBatch() {
  return useBatchMutation(pauseRenderBatch);
}

export function useResumeRenderBatch() {
  return useBatchMutation(resumeRenderBatch);
}
