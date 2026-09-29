/** Label and sort helpers shared by the rendition picker and the video player's quality menu. */

export type LabelableVariant = {
  variantCode: string;
  resolution: number | null;
  width: number | null;
  height: number | null;
  hasWatermark: boolean;
};

/** "720p", falling back to width×height for legacy variants without a resolution. */
export function variantResolutionLabel(
  variant: Pick<LabelableVariant, 'resolution' | 'width' | 'height'>,
): string {
  if (variant.resolution) {
    return `${variant.resolution}p`;
  }
  if (variant.width && variant.height) {
    return `${variant.width}×${variant.height}`;
  }
  return '-';
}

/** Highest resolution first; ties keep watermarked variants after their plain counterpart. */
export function sortVariantsDescByResolution<
  T extends Pick<LabelableVariant, 'resolution' | 'hasWatermark'>,
>(variants: T[]): T[] {
  return [...variants].sort(
    (a, b) =>
      (b.resolution ?? 0) - (a.resolution ?? 0) || Number(a.hasWatermark) - Number(b.hasWatermark),
  );
}

/** Lowest resolution first; used to walk the quality ladder up/down. */
export function sortVariantsAscByResolution<
  T extends Pick<LabelableVariant, 'resolution' | 'hasWatermark'>,
>(variants: T[]): T[] {
  return [...variants].sort(
    (a, b) =>
      (a.resolution ?? 0) - (b.resolution ?? 0) || Number(a.hasWatermark) - Number(b.hasWatermark),
  );
}

/**
 * Quality menu label for one variant: "1080p", with a "WM" badge flag on watermarked variants
 * when the list also has plain ones. A viewer who only gets watermarked previews sees no badge,
 * since it would tell them nothing.
 */
export function variantMenuLabel(
  variant: LabelableVariant,
  allVariants: LabelableVariant[],
): { text: string; showWatermarkBadge: boolean } {
  return {
    text: variantResolutionLabel(variant),
    showWatermarkBadge:
      variant.hasWatermark && allVariants.some((candidate) => !candidate.hasWatermark),
  };
}
