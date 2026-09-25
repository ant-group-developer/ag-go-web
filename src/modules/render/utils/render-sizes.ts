import type { RenderSizes } from '../api/render';

// Mirrors ag-go-api/src/modules/render/render-sizes.ts.
export const PREVIEW_WIDTH_MIN = 64;
export const PREVIEW_WIDTH_MAX = 7680;
export const PREVIEW_WIDTHS_MAX_COUNT = 6;
export const THUMBNAIL_WIDTH_MIN = 64;
export const THUMBNAIL_WIDTH_MAX = 1024;

export const DEFAULT_RENDER_SIZES: RenderSizes = {
  previewWidths: [480, 960, 1920],
  thumbnailWidth: 320,
};

export function isValidPreviewWidth(value: unknown): boolean {
  const width = Number(value);
  return Number.isInteger(width) && width >= PREVIEW_WIDTH_MIN && width <= PREVIEW_WIDTH_MAX;
}

/** Accepts the strings typed into a tags select; returns sorted unique integer widths. */
export function normalizePreviewWidths(values: unknown): number[] {
  const widths = (Array.isArray(values) ? values : [])
    .filter(isValidPreviewWidth)
    .map((value) => Number(value));
  return [...new Set(widths)].sort((a, b) => a - b).slice(0, PREVIEW_WIDTHS_MAX_COUNT);
}

export function normalizeRenderSizes(sizes: Partial<RenderSizes> | null | undefined): RenderSizes {
  const previewWidths = normalizePreviewWidths(sizes?.previewWidths);
  const thumbnailWidth = Number(sizes?.thumbnailWidth);
  return {
    previewWidths: previewWidths.length > 0 ? previewWidths : DEFAULT_RENDER_SIZES.previewWidths,
    thumbnailWidth:
      Number.isInteger(thumbnailWidth) &&
      thumbnailWidth >= THUMBNAIL_WIDTH_MIN &&
      thumbnailWidth <= THUMBNAIL_WIDTH_MAX
        ? thumbnailWidth
        : DEFAULT_RENDER_SIZES.thumbnailWidth,
  };
}
