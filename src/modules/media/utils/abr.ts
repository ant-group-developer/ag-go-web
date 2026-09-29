/**
 * Adaptive bitrate selection over progressive MP4 (no HLS). Every function here is pure so the
 * decision logic can be unit tested without a real `<video>` element or network.
 */

export type AbrVariant = {
  variantCode: string;
  /** Short edge in px; null for legacy variants (treated as 720p for the bandwidth heuristic). */
  resolution: number | null;
  bitrateBps: number | null;
  hasWatermark: boolean;
};

export type ConnectionInfo = {
  /** Mbps, per the Network Information API. */
  downlink?: number;
  saveData?: boolean;
};

/** Bandwidth to assume when `saveData` is on and nothing has been measured yet. */
export const LOW_DATA_BANDWIDTH_BPS = 0.5 * 1_000_000;

export const EWMA_ALPHA = 0.5;

export const ABR_SAFETY_FACTOR = 0.8;

/** Presets offered by the render profile editor; also the auto-quality ladder. */
export const RESOLUTION_PRESETS = [360, 480, 720, 1080, 1440, 2160] as const;

/** Rough bandwidth (Mbps) needed to comfortably play each resolution, used when `bitrateBps` is unknown. */
export const RESOLUTION_BANDWIDTH_MBPS: Record<number, number> = {
  360: 0.8,
  480: 1.2,
  720: 2.5,
  1080: 5,
  1440: 9,
  2160: 16,
};

const DEFAULT_RESOLUTION = 720;

/** Initial bandwidth guess from the Network Information API, or null when nothing is known. */
export function initialBandwidthEstimate(connection?: ConnectionInfo | null): number | null {
  if (!connection) {
    return null;
  }
  if (connection.saveData) {
    return LOW_DATA_BANDWIDTH_BPS;
  }
  if (typeof connection.downlink === 'number' && connection.downlink > 0) {
    return connection.downlink * 1_000_000;
  }
  return null;
}

/** Exponentially weighted moving average of measured throughput samples, in bits per second. */
export function updateBandwidthEstimate(
  previousBps: number | null,
  sampleBps: number,
  alpha: number = EWMA_ALPHA,
): number {
  if (!Number.isFinite(sampleBps) || sampleBps <= 0) {
    return previousBps ?? 0;
  }
  if (previousBps === null || !Number.isFinite(previousBps) || previousBps <= 0) {
    return sampleBps;
  }
  return alpha * sampleBps + (1 - alpha) * previousBps;
}

/** Throughput (bits/sec) of a transfer of `bytes` over `ms` wall-clock milliseconds. */
export function sampleBandwidthFromTransfer(bytes: number, ms: number): number | null {
  if (!(bytes > 0) || !(ms > 0)) {
    return null;
  }
  return (bytes * 8) / (ms / 1000);
}

function nearestPresetAtLeast(resolution: number): number {
  return (
    RESOLUTION_PRESETS.find((preset) => preset >= resolution) ??
    RESOLUTION_PRESETS[RESOLUTION_PRESETS.length - 1]
  );
}

/** Known bitrate if the variant has one, otherwise a resolution-based heuristic. */
export function estimatedVariantBitrateBps(
  variant: Pick<AbrVariant, 'bitrateBps' | 'resolution'>,
): number {
  if (variant.bitrateBps && variant.bitrateBps > 0) {
    return variant.bitrateBps;
  }
  const preset = nearestPresetAtLeast(variant.resolution ?? DEFAULT_RESOLUTION);
  return (
    (RESOLUTION_BANDWIDTH_MBPS[preset] ?? RESOLUTION_BANDWIDTH_MBPS[DEFAULT_RESOLUTION]) * 1_000_000
  );
}

/**
 * The highest resolution preset the player's rendered frame can benefit from, one step above the
 * minimal covering preset (no point loading 2160p into a 400px frame, but do not clamp too hard).
 */
export function maxAllowedResolution(
  renderedWidthPx: number,
  renderedHeightPx: number,
  devicePixelRatio = 1,
): number {
  const shortEdgeCssPx = Math.min(renderedWidthPx || 0, renderedHeightPx || 0);
  if (!(shortEdgeCssPx > 0)) {
    return RESOLUTION_PRESETS[RESOLUTION_PRESETS.length - 1];
  }
  const shortEdgeDevicePx = shortEdgeCssPx * (devicePixelRatio || 1);
  const index = RESOLUTION_PRESETS.findIndex((preset) => preset >= shortEdgeDevicePx);
  if (index === -1) {
    return RESOLUTION_PRESETS[RESOLUTION_PRESETS.length - 1];
  }
  return RESOLUTION_PRESETS[Math.min(index + 1, RESOLUTION_PRESETS.length - 1)];
}

/** Prefers the non-watermarked variant when both watermark states exist at the winning resolution. */
function preferNonWatermarked<T extends { hasWatermark: boolean }>(group: T[]): T | undefined {
  if (group.length === 0) {
    return undefined;
  }
  return group.find((variant) => !variant.hasWatermark) ?? group[0];
}

/**
 * Picks the auto-quality variant: the highest resolution whose estimated bitrate fits the
 * bandwidth estimate (with a safety margin), capped to what the frame can actually show. Falls
 * back to <= 720p when the estimate is unknown, and to the lowest available variant when even
 * that does not fit.
 */
export function chooseAutoVariant<T extends AbrVariant>(
  variants: T[],
  estimateBps: number | null,
  capResolution: number,
): T | undefined {
  const withResolution = variants.filter((variant) => variant.resolution !== null);
  const pool = withResolution.length > 0 ? withResolution : variants;
  if (pool.length === 0) {
    return undefined;
  }
  const capped = pool.filter((variant) => (variant.resolution ?? 0) <= capResolution);
  const candidates = capped.length > 0 ? capped : pool;
  const sorted = [...candidates].sort((a, b) => (a.resolution ?? 0) - (b.resolution ?? 0));

  if (estimateBps === null || !(estimateBps > 0)) {
    const upToDefault = sorted.filter((variant) => (variant.resolution ?? 0) <= DEFAULT_RESOLUTION);
    const pickFrom = upToDefault.length > 0 ? upToDefault : [sorted[0]];
    const maxRes = Math.max(...pickFrom.map((variant) => variant.resolution ?? 0));
    return preferNonWatermarked(pickFrom.filter((variant) => variant.resolution === maxRes));
  }

  const affordable = sorted.filter(
    (variant) => estimatedVariantBitrateBps(variant) <= estimateBps * ABR_SAFETY_FACTOR,
  );
  const pickFrom = affordable.length > 0 ? affordable : [sorted[0]];
  const maxRes = Math.max(...pickFrom.map((variant) => variant.resolution ?? 0));
  return preferNonWatermarked(pickFrom.filter((variant) => variant.resolution === maxRes));
}

// --- Stall detection & switch hysteresis ---------------------------------------------------

/** Window in which 2+ stalls trigger a downswitch. */
export const STALL_WINDOW_MS = 10_000;
/** A single stall this long also triggers an immediate downswitch. */
export const STALL_LONG_MS = 3_000;
/** Minimum time between auto upswitches. */
export const UPSWITCH_MIN_INTERVAL_MS = 15_000;
/** Minimum buffer-ahead required before upswitching. */
export const UPSWITCH_MIN_BUFFER_SECONDS = 10;

/** Keeps only stall timestamps within the hysteresis window (newest last). */
export function pruneStallHistory(
  stallTimestamps: number[],
  now: number,
  windowMs: number = STALL_WINDOW_MS,
): number[] {
  return stallTimestamps.filter((timestamp) => now - timestamp <= windowMs);
}

/** True when recent stalls (2+ within the window, or one long stall) call for a downswitch. */
export function shouldDownswitch(recentStallTimestamps: number[], stallDurationMs = 0): boolean {
  return stallDurationMs >= STALL_LONG_MS || recentStallTimestamps.length >= 2;
}

/** True when it is time (and safe) to try a higher level again. */
export function canUpswitch(
  lastSwitchAt: number | null,
  now: number,
  bufferAheadSeconds: number,
  minIntervalMs: number = UPSWITCH_MIN_INTERVAL_MS,
  minBufferSeconds: number = UPSWITCH_MIN_BUFFER_SECONDS,
): boolean {
  if (bufferAheadSeconds < minBufferSeconds) {
    return false;
  }
  return lastSwitchAt === null || now - lastSwitchAt >= minIntervalMs;
}

/**
 * The next quality level down (`-1`) or up (`1`) from `current`: the nearest variant with a
 * strictly lower/higher resolution, keeping the watermark state of `current` when that level
 * offers it. Undefined at the end of the ladder.
 */
export function stepLevel<T extends AbrVariant>(
  sortedAsc: T[],
  current: T | undefined,
  direction: 1 | -1,
): T | undefined {
  if (!current) {
    return undefined;
  }
  const currentResolution = current.resolution ?? 0;
  const beyond = sortedAsc.filter((variant) =>
    direction < 0
      ? (variant.resolution ?? 0) < currentResolution
      : (variant.resolution ?? 0) > currentResolution,
  );
  if (beyond.length === 0) {
    return undefined;
  }
  const resolutions = beyond.map((variant) => variant.resolution ?? 0);
  const nextResolution = direction < 0 ? Math.max(...resolutions) : Math.min(...resolutions);
  const level = beyond.filter((variant) => (variant.resolution ?? 0) === nextResolution);
  return level.find((variant) => variant.hasWatermark === current.hasWatermark) ?? level[0];
}
