import { useQuery } from '@tanstack/react-query';
import { getTags } from '../api/tags';
import { tagQueryKeys } from '../queries/tag-query-keys';

export function useTags() {
  return useQuery({
    queryKey: tagQueryKeys.list(),
    queryFn: getTags,
  });
}
