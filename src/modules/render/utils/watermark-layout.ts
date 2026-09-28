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

/** Scaled margin, capped so a corner anchor stays inside very wide or very tall frames. */
export function getWatermarkMargin(margin: number, baseWidth: number, baseHeight: number): number {
  return Math.max(
    0,
    Math.min(
      Math.round(margin * getWatermarkUnitScale(baseWidth)),
      Math.floor((Math.min(baseWidth, baseHeight) - 1) / 2),
    ),
  );
}

/**
 * Layout of the unrotated tile (logo on the left, text after it), in pixels for `fontSize`.
 * `logoScale` resizes the logo relative to its default size of 1.6x the font size.
 * Snapped to whole pixels so small watermarks stay sharp.
 */
export function getWatermarkTileGeometry(fontSize: number, hasLogo: boolean, logoScale = 1) {
  const logoSize = hasLogo ? Math.max(1, Math.round(fontSize * 1.6 * logoScale)) : 0;
  const textX = hasLogo ? Math.round(logoSize + fontSize * 0.48) : 0;
  const height = Math.ceil(Math.max(fontSize * 1.5, logoSize));
  return {
    logoSize,
    logoY: Math.floor((height - logoSize) / 2),
    textX,
    textBaselineY: Math.round(height / 2 + fontSize * 0.35),
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

/**
 * Anchors the overlay at `position`. An overlay larger than the frame keeps its anchor and hangs
 * off the opposite edges (negative offsets); the frame clips it.
 */
export function getOverlayPosition(
  baseWidth: number,
  baseHeight: number,
  overlayWidth: number,
  overlayHeight: number,
  position: WatermarkPosition,
  margin: number,
): { top: number; left: number } {
  const right = baseWidth - overlayWidth - margin;
  const bottom = baseHeight - overlayHeight - margin;
  switch (position) {
    case 'top-left':
      return { top: margin, left: margin };
    case 'top-right':
      return { top: margin, left: right };
    case 'bottom-left':
      return { top: bottom, left: margin };
    case 'center':
      return {
        top: Math.round((baseHeight - overlayHeight) / 2),
        left: Math.round((baseWidth - overlayWidth) / 2),
      };
    case 'bottom-right':
    default:
      return { top: bottom, left: right };
  }
}
