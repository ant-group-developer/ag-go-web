import { useQuery } from '@tanstack/react-query';
import { getAssetPreviewUrl } from '../api/media';
import { mediaQueryKeys } from '../queries/media-query-keys';

// Presigned URLs live for R2_PRESIGNED_URL_TTL_SECONDS (15 minutes by default); refresh well before.
const PREVIEW_URL_STALE_MS = 5 * 60 * 1000;

/** Presigned URL of an asset variant, or undefined while loading / when it is not available. */
export function useAssetPreviewUrl(
  assetId: string | null | undefined,
  variantCode = 'thumbnail',
  width?: number,
) {
  const query = useQuery({
    queryKey: mediaQueryKeys.assetPreviewUrl(assetId ?? '', variantCode, width),
    queryFn: () => getAssetPreviewUrl(assetId!, variantCode, width),
    enabled: Boolean(assetId),
    staleTime: PREVIEW_URL_STALE_MS,
    gcTime: PREVIEW_URL_STALE_MS * 2,
    retry: false,
  });
  return assetId ? query.data : undefined;
}
