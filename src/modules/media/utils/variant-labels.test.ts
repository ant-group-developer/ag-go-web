import { describe, expect, it } from 'vitest';
import {
  sortVariantsAscByResolution,
  sortVariantsDescByResolution,
  variantMenuLabel,
  variantResolutionLabel,
  type LabelableVariant,
} from './variant-labels';

const build = (
  resolution: number | null,
  hasWatermark = false,
  width: number | null = null,
  height: number | null = null,
): LabelableVariant => ({
  variantCode: `preview_${resolution}p${hasWatermark ? '_wm' : ''}`,
  resolution,
  width,
  height,
  hasWatermark,
});

describe('variantResolutionLabel', () => {
  it('formats the short edge as Xp', () => {
    expect(variantResolutionLabel(build(720))).toBe('720p');
  });

  it('falls back to width×height without a resolution', () => {
    expect(variantResolutionLabel(build(null, false, 1280, 720))).toBe('1280×720');
  });

  it('falls back to a dash without any dimensions', () => {
    expect(variantResolutionLabel(build(null))).toBe('-');
  });
});

describe('sortVariantsDescByResolution / sortVariantsAscByResolution', () => {
  const variants = [build(480), build(2160), build(720, true), build(720, false)];

  it('sorts highest resolution first, plain before watermarked on ties', () => {
    const sorted = sortVariantsDescByResolution(variants);
    expect(sorted.map((v) => [v.resolution, v.hasWatermark])).toEqual([
      [2160, false],
      [720, false],
      [720, true],
      [480, false],
    ]);
  });

  it('sorts lowest resolution first', () => {
    const sorted = sortVariantsAscByResolution(variants);
    expect(sorted.map((v) => v.resolution)).toEqual([480, 720, 720, 2160]);
  });

  it('does not mutate the input array', () => {
    const original = [...variants];
    sortVariantsDescByResolution(variants);
    expect(variants).toEqual(original);
  });
});

describe('variantMenuLabel', () => {
  it('flags watermarked variants when the list also has plain ones', () => {
    const mixed = [build(720, true), build(720, false), build(1080, true)];
    expect(variantMenuLabel(mixed[0], mixed)).toEqual({ text: '720p', showWatermarkBadge: true });
    expect(variantMenuLabel(mixed[1], mixed)).toEqual({ text: '720p', showWatermarkBadge: false });
    expect(variantMenuLabel(mixed[2], mixed)).toEqual({ text: '1080p', showWatermarkBadge: true });
  });

  it('shows no badge when every variant is watermarked', () => {
    const watermarked = [build(720, true), build(1080, true)];
    expect(variantMenuLabel(watermarked[0], watermarked).showWatermarkBadge).toBe(false);
  });
});
