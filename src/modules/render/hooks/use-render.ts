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

export function useProjectRenderBatches(projectId: string) {
  return useQuery({
    queryKey: keys.projectBatches(projectId),
    queryFn: () => getProjectRenderBatches(projectId),
    enabled: Boolean(projectId),
  });
}

export function useAllRenderBatches() {
  return useQuery({
    queryKey: keys.allBatches(),
    queryFn: getAllRenderBatches,
  });
}

export function useRenderBatchJobs(batchId: string) {
  return useQuery({
    queryKey: keys.jobs(batchId),
    queryFn: () => getRenderBatchJobs(batchId),
    enabled: Boolean(batchId),
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
