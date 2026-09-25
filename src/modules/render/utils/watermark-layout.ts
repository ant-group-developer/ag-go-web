import type { WatermarkPosition } from '../api/render';

/**
 * Watermark sizes are authored against a 960px wide frame, the width of the settings preview.
 * Rendered outputs scale them by `frameWidth / 960`.
 *
 * Keep in sync with ag-go-api/src/modules/render/watermark-layout.ts.
 */
export const WATERMARK_REFERENCE_WIDTH = 960;

export function getWatermarkUnitScale(baseWidth: number): number {
  return Math.max(0.05, baseWidth / WATERMARK_REFERENCE_WIDTH);
}

/** Layout of the unrotated tile (logo on the left, text after it), in pixels for `fontSize`. */
export function getWatermarkTileGeometry(fontSize: number, hasLogo: boolean) {
  const logoSize = hasLogo ? fontSize * 1.6 : 0;
  const textX = hasLogo ? logoSize * 1.3 : 0;
  const height = Math.max(fontSize * 1.5, logoSize);
  return {
    logoSize,
    logoY: (height - logoSize) / 2,
    textX,
    textBaselineY: height / 2 + fontSize * 0.35,
    height,
  };
}

/** Single watermark: `scale` is the width of the unrotated tile as a fraction of the frame. */
export function getSingleWatermarkTileScale(
  referenceTileWidth: number,
  baseWidth: number,
  scale: number,
): number {
  return (baseWidth * scale) / Math.max(1, referenceTileWidth);
}

/** Shrinks (never enlarges) a box to fit inside the given bounds, keeping its aspect ratio. */
export function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number) {
  const ratio = Math.min(1, Math.max(1, maxWidth) / width, Math.max(1, maxHeight) / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export function getOverlayPosition(
  baseWidth: number,
  baseHeight: number,
  overlayWidth: number,
  overlayHeight: number,
  position: WatermarkPosition,
  margin: number,
): { top: number; left: number } {
  const right = Math.max(0, baseWidth - overlayWidth - margin);
  const bottom = Math.max(0, baseHeight - overlayHeight - margin);
  switch (position) {
    case 'top-left':
      return { top: margin, left: margin };
    case 'top-right':
      return { top: margin, left: right };
    case 'bottom-left':
      return { top: bottom, left: margin };
    case 'center':
      return {
        top: Math.max(0, Math.round((baseHeight - overlayHeight) / 2)),
        left: Math.max(0, Math.round((baseWidth - overlayWidth) / 2)),
      };
    case 'bottom-right':
    default:
      return { top: bottom, left: right };
  }
}
