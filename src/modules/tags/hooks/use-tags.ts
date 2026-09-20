import { useQuery } from '@tanstack/react-query';
import { getTags } from '../api/tags';
import { tagQueryKeys } from '../queries/tag-query-keys';

export function useTags(enabled = true) {
  return useQuery({
    queryKey: tagQueryKeys.list(),
    queryFn: getTags,
    enabled,
  });
}
