import { getAssetOriginalUrl, getAssetPreviewUrl } from '../../api/media';
import type { VideoQualityVariant } from '../../hooks/use-video-quality';
import { mediaQueryKeys } from '../../queries/media-query-keys';

/** Code of the original file among the video player's sources. */
export const ORIGINAL_SOURCE_CODE = 'original';

export type VideoPlayerSource = VideoQualityVariant & {
  width: number | null;
  height: number | null;
};

/** Query for the presigned URL of one player source: a rendered preview or the original. */
export function sourceUrlQuery(
  assetId: string,
  code: string,
): { queryKey: readonly unknown[]; queryFn: () => Promise<string> } {
  return code === ORIGINAL_SOURCE_CODE
    ? {
        queryKey: mediaQueryKeys.assetOriginalUrl(assetId),
        queryFn: () => getAssetOriginalUrl(assetId),
      }
    : {
        queryKey: mediaQueryKeys.assetPreviewUrl(assetId, code),
        queryFn: () => getAssetPreviewUrl(assetId, code),
      };
}
