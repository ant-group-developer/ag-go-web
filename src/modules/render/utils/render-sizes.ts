import type { RenderSizes, RenderVariantSpec } from '../api/render';

// Mirrors ag-go-api/src/modules/render/render-sizes.ts.
export const RESOLUTION_MIN = 144;
export const RESOLUTION_MAX = 4320;
export const VARIANTS_MAX_COUNT = 8;
export const THUMBNAIL_WIDTH_MIN = 64;
export const THUMBNAIL_WIDTH_MAX = 1024;

/** Common short-edge presets offered in the editor; a custom value is also allowed. */
export const RESOLUTION_PRESETS = [360, 480, 720, 1080, 1440, 2160] as const;

export const DEFAULT_RENDER_SIZES: RenderSizes = {
  variants: [
    { resolution: 480, watermark: true },
    { resolution: 1080, watermark: true },
  ],
  thumbnailWidth: 320,
};

export function resolutionLabel(resolution: number): string {
  return `${resolution}p`;
}

export function isValidResolution(value: unknown): boolean {
  const resolution = Number(value);
  return (
    Number.isInteger(resolution) && resolution >= RESOLUTION_MIN && resolution <= RESOLUTION_MAX
  );
}

/** Legacy `previewWidths` (long edge) → short edge, mirrors the API's migration of old profiles. */
const LEGACY_WIDTH_TO_RESOLUTION: Record<number, number> = {
  3840: 2160,
  2560: 1440,
  1920: 1080,
  1280: 720,
  854: 480,
  640: 360,
};

export function legacyWidthToResolution(width: number): number {
  return LEGACY_WIDTH_TO_RESOLUTION[width] ?? Math.round((width * 9) / 16);
}

/** Sorts by resolution asc, then watermark off before on; drops invalid or duplicate entries. */
export function normalizeRenderVariants(values: unknown): RenderVariantSpec[] {
  const list = Array.isArray(values) ? values : [];
  const seen = new Set<string>();
  const variants: RenderVariantSpec[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const candidate = item as Partial<RenderVariantSpec>;
    if (!isValidResolution(candidate.resolution)) {
      continue;
    }
    const resolution = Math.round(Number(candidate.resolution));
    const watermark = Boolean(candidate.watermark);
    const key = `${resolution}:${watermark}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    variants.push({ resolution, watermark });
  }
  return variants
    .sort((a, b) => a.resolution - b.resolution || Number(a.watermark) - Number(b.watermark))
    .slice(0, VARIANTS_MAX_COUNT);
}

/** Maps legacy `previewWidths` + the old profile-level `watermarkEnabled` to variants. */
export function migrateLegacyPreviewWidths(
  previewWidths: unknown,
  watermarkEnabled: boolean,
): RenderVariantSpec[] {
  const widths = Array.isArray(previewWidths) ? previewWidths : [];
  return normalizeRenderVariants(
    widths
      .map((width) => Number(width))
      .filter((width) => Number.isFinite(width) && width > 0)
      .map((width) => ({
        resolution: legacyWidthToResolution(width),
        watermark: watermarkEnabled,
      })),
  );
}

/** What the API may still hand back for profiles cached before this change. */
type LegacyRenderSizesShape = Partial<RenderSizes> & { previewWidths?: unknown };

/**
 * Normalizes a profile's render sizes for the editor: uses `variants` when present, otherwise
 * migrates the legacy `previewWidths` + `watermarkEnabled` shape defensively on the client (the
 * API normalizes this server-side too, but cached/older data may still carry the old shape).
 */
export function normalizeRenderSizes(
  sizes: LegacyRenderSizesShape | null | undefined,
  legacyWatermarkEnabled = false,
): RenderSizes {
  const hasVariants = Array.isArray(sizes?.variants) && sizes.variants.length > 0;
  const variants = hasVariants
    ? normalizeRenderVariants(sizes?.variants)
    : migrateLegacyPreviewWidths(sizes?.previewWidths, legacyWatermarkEnabled);
  const thumbnailWidth = Number(sizes?.thumbnailWidth);
  return {
    variants: variants.length > 0 ? variants : DEFAULT_RENDER_SIZES.variants,
    thumbnailWidth:
      Number.isInteger(thumbnailWidth) &&
      thumbnailWidth >= THUMBNAIL_WIDTH_MIN &&
      thumbnailWidth <= THUMBNAIL_WIDTH_MAX
        ? thumbnailWidth
        : DEFAULT_RENDER_SIZES.thumbnailWidth,
  };
}

/** Highest resolution first, for summaries and the quality picker. */
export function sortVariantsDesc(variants: RenderVariantSpec[]): RenderVariantSpec[] {
  return [...variants].sort(
    (a, b) => b.resolution - a.resolution || Number(b.watermark) - Number(a.watermark),
  );
}
