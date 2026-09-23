import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelRenderBatch,
  createRenderBatch,
  getRenderBatch,
  getRenderProfiles,
} from '../api/render';

const keys = {
  all: ['render'] as const,
  profiles: () => [...keys.all, 'profiles'] as const,
  batch: (id: string) => [...keys.all, 'batch', id] as const,
};

export function useRenderProfiles() {
  return useQuery({ queryKey: keys.profiles(), queryFn: getRenderProfiles });
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

export function useCreateRenderBatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createRenderBatch,
    onSuccess: (batch) => {
      void client.invalidateQueries({ queryKey: keys.batch(batch.id) });
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
