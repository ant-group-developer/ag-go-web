import { describe, expect, it } from 'vitest';
import {
  ABR_SAFETY_FACTOR,
  canUpswitch,
  chooseAutoVariant,
  estimatedVariantBitrateBps,
  initialBandwidthEstimate,
  LOW_DATA_BANDWIDTH_BPS,
  maxAllowedResolution,
  pruneStallHistory,
  sampleBandwidthFromTransfer,
  shouldDownswitch,
  stepLevel,
  updateBandwidthEstimate,
  type AbrVariant,
} from './abr';

const variant = (
  resolution: number,
  bitrateBps: number | null = null,
  hasWatermark = false,
): AbrVariant => ({
  variantCode: hasWatermark ? `preview_${resolution}p_wm` : `preview_${resolution}p`,
  resolution,
  bitrateBps,
  hasWatermark,
});

describe('initialBandwidthEstimate', () => {
  it('uses downlink in Mbps converted to bps', () => {
    expect(initialBandwidthEstimate({ downlink: 4 })).toBe(4_000_000);
  });

  it('starts low when saveData is on, even with a downlink', () => {
    expect(initialBandwidthEstimate({ downlink: 10, saveData: true })).toBe(LOW_DATA_BANDWIDTH_BPS);
  });

  it('is null without connection info', () => {
    expect(initialBandwidthEstimate(null)).toBeNull();
    expect(initialBandwidthEstimate({})).toBeNull();
  });
});

describe('updateBandwidthEstimate', () => {
  it('adopts the first sample outright', () => {
    expect(updateBandwidthEstimate(null, 2_000_000)).toBe(2_000_000);
  });

  it('smooths towards new samples using the EWMA weight', () => {
    const next = updateBandwidthEstimate(1_000_000, 3_000_000, 0.5);
    expect(next).toBe(2_000_000);
  });

  it('ignores invalid samples', () => {
    expect(updateBandwidthEstimate(1_000_000, 0)).toBe(1_000_000);
    expect(updateBandwidthEstimate(1_000_000, Number.NaN)).toBe(1_000_000);
  });
});

describe('sampleBandwidthFromTransfer', () => {
  it('computes bits per second from bytes and elapsed ms', () => {
    // 1,000,000 bytes over 1000ms = 8,000,000 bits/sec
    expect(sampleBandwidthFromTransfer(1_000_000, 1000)).toBe(8_000_000);
  });

  it('is null for non-positive input', () => {
    expect(sampleBandwidthFromTransfer(0, 1000)).toBeNull();
    expect(sampleBandwidthFromTransfer(100, 0)).toBeNull();
  });
});

describe('estimatedVariantBitrateBps', () => {
  it('uses the known bitrate when present', () => {
    expect(estimatedVariantBitrateBps(variant(1080, 4_500_000))).toBe(4_500_000);
  });

  it('falls back to the resolution heuristic', () => {
    expect(estimatedVariantBitrateBps(variant(720))).toBe(2.5 * 1_000_000);
    expect(estimatedVariantBitrateBps(variant(360))).toBe(0.8 * 1_000_000);
  });

  it('rounds up to the next preset for non-standard resolutions', () => {
    // 500 is between 480 and 720; heuristic should use 720's bandwidth.
    expect(estimatedVariantBitrateBps(variant(500))).toBe(2.5 * 1_000_000);
  });
});

describe('maxAllowedResolution', () => {
  it('caps to one preset above the frame size', () => {
    // 400px short edge * dpr 1 -> covering preset is 480, one above is 720.
    expect(maxAllowedResolution(400, 700, 1)).toBe(720);
  });

  it('accounts for device pixel ratio', () => {
    // 400 * 2 = 800px short edge -> covering preset is 1080, one above is 1440.
    expect(maxAllowedResolution(700, 400, 2)).toBe(1440);
  });

  it('never exceeds the highest preset', () => {
    expect(maxAllowedResolution(5000, 5000, 2)).toBe(2160);
  });

  it('defaults to the highest preset without a known size', () => {
    expect(maxAllowedResolution(0, 0, 1)).toBe(2160);
  });
});

describe('chooseAutoVariant', () => {
  const variants = [variant(360), variant(480), variant(720), variant(1080), variant(2160)];

  it('picks <=720p when the estimate is unknown', () => {
    expect(chooseAutoVariant(variants, null, 2160)?.resolution).toBe(720);
  });

  it('picks the highest affordable resolution within the safety margin', () => {
    // 720p needs 2.5Mbps; estimate of 4Mbps * 0.8 = 3.2Mbps covers it but not 1080p (5Mbps).
    expect(chooseAutoVariant(variants, 4_000_000, 2160)?.resolution).toBe(720);
  });

  it('picks the highest resolution once bandwidth comfortably covers it', () => {
    expect(chooseAutoVariant(variants, 20_000_000, 2160)?.resolution).toBe(2160);
  });

  it('respects the resolution cap even with plenty of bandwidth', () => {
    expect(chooseAutoVariant(variants, 100_000_000, 720)?.resolution).toBe(720);
  });

  it('falls back to the lowest variant when nothing is affordable', () => {
    expect(chooseAutoVariant(variants, 100_000, 2160)?.resolution).toBe(360);
  });

  it('prefers the non-watermarked variant at the same resolution', () => {
    const withBoth = [variant(720, null, true), variant(720, null, false)];
    expect(chooseAutoVariant(withBoth, 10_000_000, 2160)?.hasWatermark).toBe(false);
  });

  it('uses the only available watermark state when there is no choice', () => {
    const wmOnly = [variant(720, null, true)];
    expect(chooseAutoVariant(wmOnly, 10_000_000, 2160)?.hasWatermark).toBe(true);
  });
});

describe('stall detection & hysteresis', () => {
  it('prunes stall timestamps outside the window', () => {
    const now = 100_000;
    expect(pruneStallHistory([now - 20_000, now - 5_000, now - 1_000], now)).toEqual([
      now - 5_000,
      now - 1_000,
    ]);
  });

  it('downswitches after 2 stalls within the window', () => {
    expect(shouldDownswitch([1, 2], 0)).toBe(true);
    expect(shouldDownswitch([1], 0)).toBe(false);
  });

  it('downswitches immediately on one long stall', () => {
    expect(shouldDownswitch([1], 3_500)).toBe(true);
  });

  it('upswitches only with enough buffer and after the minimum interval', () => {
    expect(canUpswitch(null, 0, 15)).toBe(true);
    expect(canUpswitch(0, 10_000, 15)).toBe(false);
    expect(canUpswitch(0, 20_000, 15)).toBe(true);
    expect(canUpswitch(0, 20_000, 5)).toBe(false);
  });

  it('steps to the next lower or higher resolution, keeping the watermark state', () => {
    const sorted = [
      variant(360),
      variant(720),
      variant(720, null, true),
      variant(1080),
      variant(1080, null, true),
    ];
    expect(stepLevel(sorted, sorted[3], -1)?.variantCode).toBe('preview_720p');
    expect(stepLevel(sorted, sorted[4], -1)?.variantCode).toBe('preview_720p_wm');
    expect(stepLevel(sorted, sorted[2], -1)?.variantCode).toBe('preview_360p');
    expect(stepLevel(sorted, sorted[1], 1)?.variantCode).toBe('preview_1080p');
    expect(stepLevel(sorted, sorted[0], -1)).toBeUndefined();
    expect(stepLevel(sorted, sorted[4], 1)).toBeUndefined();
  });
});

// Sanity check the safety factor constant is the documented 0.8.
describe('ABR_SAFETY_FACTOR', () => {
  it('is 0.8', () => {
    expect(ABR_SAFETY_FACTOR).toBe(0.8);
  });
});
