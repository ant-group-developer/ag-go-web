import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTag, deleteTag, getTags, updateTag } from '../api/tags';
import { tagQueryKeys } from '../queries/tag-query-keys';
import type { UpdateTagInput } from '../types/update-tag-input.type';

export function useTags(enabled = true) {
  return useQuery({
    queryKey: tagQueryKeys.list(),
    queryFn: getTags,
    enabled,
    refetchOnWindowFocus: true,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTag,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tagQueryKeys.all() }),
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTagInput }) => updateTag(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tagQueryKeys.all() }),
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTag,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tagQueryKeys.all() }),
  });
}
