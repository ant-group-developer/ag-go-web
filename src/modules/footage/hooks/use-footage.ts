import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  getFootageFacets,
  getFootageFolders,
  getFootageSegmentMedia,
  searchFootage,
  type FootageSearchParams,
} from '../api/footage';

const keys = {
  all: ['footage'] as const,
  search: (params: Omit<FootageSearchParams, 'cursor'>) => [...keys.all, 'search', params] as const,
  facets: (params: Omit<FootageSearchParams, 'limit' | 'cursor'>) =>
    [...keys.all, 'facets', params] as const,
  folders: () => [...keys.all, 'folders'] as const,
  segmentMedia: (segmentId: string) => [...keys.all, 'segment-media', segmentId] as const,
};

export function useFootageSearch(params: Omit<FootageSearchParams, 'cursor'>, enabled = true) {
  return useInfiniteQuery({
    queryKey: keys.search(params),
    queryFn: ({ pageParam }) =>
      searchFootage({ ...params, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
}

export function useFootageFacets(
  params: Omit<FootageSearchParams, 'limit' | 'cursor'>,
  enabled = true,
) {
  return useQuery({
    queryKey: keys.facets(params),
    queryFn: () => getFootageFacets(params),
    enabled,
    staleTime: 30_000,
  });
}

export function useFootageFolders() {
  return useQuery({
    queryKey: keys.folders(),
    queryFn: () => getFootageFolders(),
    staleTime: 60_000,
  });
}

export function useFootageSegmentMedia(segmentId: string | null) {
  return useQuery({
    queryKey: keys.segmentMedia(segmentId ?? ''),
    queryFn: () => getFootageSegmentMedia(segmentId!),
    enabled: Boolean(segmentId),
    staleTime: 60_000,
  });
}
