import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTag, getTags } from '../api/tags';
import { tagQueryKeys } from '../queries/tag-query-keys';

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
