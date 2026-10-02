import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getFootageFacets,
  getFootageFolders,
  getFootagePreviewUrl,
  getFootageVideoMedia,
  searchFootage,
  type FootageFilterParams,
  type FootageSearchParams,
} from '../api/footage';

const keys = {
  all: ['footage'] as const,
  search: (params: Omit<FootageSearchParams, 'cursor'>) => [...keys.all, 'search', params] as const,
  facets: (params: FootageFilterParams) => [...keys.all, 'facets', params] as const,
  folders: () => [...keys.all, 'folders'] as const,
  videoMedia: (assetId: string) => [...keys.all, 'video-media', assetId] as const,
  previewUrl: (assetId: string, variantCode: string) =>
    [...keys.all, 'preview-url', assetId, variantCode] as const,
};

/** One page of footage; the previous page stays on screen while the next one loads. */
export function useFootageSearch(params: Omit<FootageSearchParams, 'cursor'>, enabled = true) {
  return useQuery({
    queryKey: keys.search(params),
    queryFn: () => searchFootage(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Video player source URLs of footage previews (see `VideoPlayer`'s `sourceUrlQuery`). */
export function footageSourceUrlQuery(assetId: string, code: string) {
  return {
    queryKey: keys.previewUrl(assetId, code),
    queryFn: () => getFootagePreviewUrl(assetId, code),
  };
}

export function useFootageFacets(params: FootageFilterParams, enabled = true) {
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

export function useFootageVideoMedia(assetId: string | null) {
  return useQuery({
    queryKey: keys.videoMedia(assetId ?? ''),
    queryFn: () => getFootageVideoMedia(assetId!),
    enabled: Boolean(assetId),
    staleTime: 60_000,
  });
}
