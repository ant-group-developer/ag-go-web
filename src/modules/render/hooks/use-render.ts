import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelRenderBatch,
  createRenderBatch,
  getAllRenderBatches,
  getProjectRenderBatches,
  getRenderBatch,
  getRenderBatchJobs,
  getRenderProfiles,
  retryRenderJob,
  updateRenderProfile,
} from '../api/render';

const keys = {
  all: ['render'] as const,
  profiles: () => [...keys.all, 'profiles'] as const,
  batch: (id: string) => [...keys.all, 'batch', id] as const,
  projectBatches: (id: string) => [...keys.all, 'project-batches', id] as const,
  allBatches: () => [...keys.all, 'all-batches'] as const,
  jobs: (id: string) => [...keys.all, 'jobs', id] as const,
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

export function useRenderBatch(id: string) {
  return useQuery({
    queryKey: keys.batch(id),
    queryFn: () => getRenderBatch(id),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data && ['completed', 'failed', 'cancelled'].includes(query.state.data.status)
        ? false
        : 5_000,
  });
}

const TERMINAL_STATUSES = ['completed', 'partial', 'failed', 'cancelled'];
const POLL_INTERVAL_MS = 5_000;

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

export function useRetryRenderJob() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: retryRenderJob,
    onSuccess: (job) => {
      if (job.renderBatchId) {
        void client.invalidateQueries({ queryKey: keys.jobs(job.renderBatchId) });
        void client.invalidateQueries({ queryKey: keys.batch(job.renderBatchId) });
        void client.invalidateQueries({ queryKey: keys.allBatches() });
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

export function useCancelRenderBatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: cancelRenderBatch,
    onSuccess: (batch) => {
      void client.invalidateQueries({ queryKey: keys.batch(batch.id) });
    },
  });
}
