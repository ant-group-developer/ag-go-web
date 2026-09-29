import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RENDER_SIZES,
  isValidResolution,
  legacyWidthToResolution,
  migrateLegacyPreviewWidths,
  normalizeRenderSizes,
  normalizeRenderVariants,
  sortVariantsDesc,
  VARIANTS_MAX_COUNT,
} from './render-sizes';

describe('isValidResolution', () => {
  it('accepts integers within range', () => {
    expect(isValidResolution(720)).toBe(true);
    expect(isValidResolution(144)).toBe(true);
    expect(isValidResolution(4320)).toBe(true);
  });

  it('rejects out-of-range or non-integer values', () => {
    expect(isValidResolution(143)).toBe(false);
    expect(isValidResolution(4321)).toBe(false);
    expect(isValidResolution(720.5)).toBe(false);
    expect(isValidResolution('nope')).toBe(false);
    expect(isValidResolution(undefined)).toBe(false);
  });
});

describe('legacyWidthToResolution', () => {
  it('maps known legacy widths to their short edge', () => {
    expect(legacyWidthToResolution(3840)).toBe(2160);
    expect(legacyWidthToResolution(1920)).toBe(1080);
    expect(legacyWidthToResolution(1280)).toBe(720);
    expect(legacyWidthToResolution(640)).toBe(360);
  });

  it('falls back to a 16:9 short edge for non-standard widths', () => {
    expect(legacyWidthToResolution(960)).toBe(Math.round((960 * 9) / 16));
  });
});

describe('normalizeRenderVariants', () => {
  it('drops invalid entries and sorts by resolution, then watermark off first', () => {
    const result = normalizeRenderVariants([
      { resolution: 1080, watermark: true },
      { resolution: 480, watermark: false },
      { resolution: 480, watermark: true },
      { resolution: 100_000, watermark: false }, // out of range
      null,
      { resolution: 720 }, // watermark defaults to false
    ]);
    expect(result).toEqual([
      { resolution: 480, watermark: false },
      { resolution: 480, watermark: true },
      { resolution: 720, watermark: false },
      { resolution: 1080, watermark: true },
    ]);
  });

  it('drops duplicate (resolution, watermark) pairs', () => {
    const result = normalizeRenderVariants([
      { resolution: 720, watermark: true },
      { resolution: 720, watermark: true },
    ]);
    expect(result).toEqual([{ resolution: 720, watermark: true }]);
  });

  it('caps at the maximum variant count', () => {
    const many = Array.from({ length: VARIANTS_MAX_COUNT + 5 }, (_, index) => ({
      resolution: 144 + index,
      watermark: false,
    }));
    expect(normalizeRenderVariants(many)).toHaveLength(VARIANTS_MAX_COUNT);
  });

  it('is empty for non-array input', () => {
    expect(normalizeRenderVariants(undefined)).toEqual([]);
    expect(normalizeRenderVariants('nope')).toEqual([]);
  });
});

describe('migrateLegacyPreviewWidths', () => {
  it('maps legacy widths + the profile-level watermarkEnabled to variants', () => {
    expect(migrateLegacyPreviewWidths([1920, 1280], true)).toEqual([
      { resolution: 720, watermark: true },
      { resolution: 1080, watermark: true },
    ]);
  });

  it('produces no watermark variants when watermarkEnabled was off', () => {
    expect(migrateLegacyPreviewWidths([1280], false)).toEqual([
      { resolution: 720, watermark: false },
    ]);
  });
});

describe('normalizeRenderSizes', () => {
  it('uses variants as-is when present', () => {
    const result = normalizeRenderSizes({
      variants: [{ resolution: 1080, watermark: true }],
      thumbnailWidth: 256,
    });
    expect(result).toEqual({
      variants: [{ resolution: 1080, watermark: true }],
      thumbnailWidth: 256,
    });
  });

  it('migrates legacy previewWidths + watermarkEnabled when variants are missing', () => {
    const result = normalizeRenderSizes({ previewWidths: [1280, 1920], thumbnailWidth: 320 }, true);
    expect(result.variants).toEqual([
      { resolution: 720, watermark: true },
      { resolution: 1080, watermark: true },
    ]);
  });

  it('falls back to defaults for missing or invalid data', () => {
    expect(normalizeRenderSizes(null)).toEqual(DEFAULT_RENDER_SIZES);
    expect(normalizeRenderSizes({ thumbnailWidth: 99_999 })).toEqual(DEFAULT_RENDER_SIZES);
  });
});

describe('sortVariantsDesc', () => {
  it('orders highest resolution first, watermarked before plain on ties', () => {
    const sorted = sortVariantsDesc([
      { resolution: 480, watermark: false },
      { resolution: 1080, watermark: false },
      { resolution: 1080, watermark: true },
    ]);
    expect(sorted).toEqual([
      { resolution: 1080, watermark: true },
      { resolution: 1080, watermark: false },
      { resolution: 480, watermark: false },
    ]);
  });
});
