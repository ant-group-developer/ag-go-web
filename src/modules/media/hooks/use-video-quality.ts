import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  canUpswitch,
  chooseAutoVariant,
  estimatedVariantBitrateBps,
  initialBandwidthEstimate,
  maxAllowedResolution,
  pruneStallHistory,
  sampleBandwidthFromTransfer,
  shouldDownswitch,
  stepLevel,
  updateBandwidthEstimate,
  type AbrVariant,
  type ConnectionInfo,
} from '../utils/abr';
import { sortVariantsAscByResolution } from '../utils/variant-labels';

export const AUTO_QUALITY = 'auto';
// Separate from the image rendition picker's key: that one stores widths, this one variant codes.
const QUALITY_STORAGE_KEY = 'ag-go.media.videoQuality';

function readStoredQuality(): string {
  try {
    return window.localStorage.getItem(QUALITY_STORAGE_KEY) ?? AUTO_QUALITY;
  } catch {
    return AUTO_QUALITY;
  }
}

function storeQuality(value: string) {
  try {
    window.localStorage.setItem(QUALITY_STORAGE_KEY, value);
  } catch {
    // Storage can be unavailable (private mode); the choice then only lasts for this view.
  }
}

type NavigatorWithConnection = Navigator & {
  connection?: ConnectionInfo;
  mozConnection?: ConnectionInfo;
  webkitConnection?: ConnectionInfo;
};

function getConnectionInfo(): ConnectionInfo | undefined {
  if (typeof navigator === 'undefined') {
    return undefined;
  }
  const nav = navigator as NavigatorWithConnection;
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
}

export type VideoQualityVariant = AbrVariant & { variantCode: string };

/** Buffered range the playback position is in, or null when the position is not buffered. */
function currentBufferedRange(video: HTMLVideoElement): { start: number; end: number } | null {
  const { buffered, currentTime } = video;
  for (let i = 0; i < buffered.length; i += 1) {
    if (buffered.start(i) <= currentTime && currentTime <= buffered.end(i)) {
      return { start: buffered.start(i), end: buffered.end(i) };
    }
  }
  return null;
}

/** Shortest wall-clock window a throughput sample is taken over; shorter ones are too noisy. */
const MIN_SAMPLE_WINDOW_MS = 1_000;

/**
 * Adaptive quality for one video: picks and adjusts the auto level over progressive MP4 by
 * estimating bandwidth from real playback and backing off on stalls (see `abr.ts` for the pure
 * decision logic). A manual choice persists in local storage and always wins over auto.
 *
 * The auto level is committed once chosen and only moves through the switch rules (down after
 * stalls, up after a quiet interval with a full buffer), so estimate jitter never swaps the
 * source mid-play.
 */
export function useVideoQuality<T extends VideoQualityVariant>(
  variants: T[],
  videoRef: RefObject<HTMLVideoElement | null>,
  frameRef: RefObject<HTMLElement | null>,
) {
  const sortedAsc = useMemo(() => sortVariantsAscByResolution(variants), [variants]);
  const [storedQuality, setStoredQuality] = useState(readStoredQuality);
  const [bandwidthEstimate, setBandwidthEstimate] = useState<number | null>(() =>
    initialBandwidthEstimate(getConnectionInfo()),
  );
  const [committedCode, setCommittedCode] = useState<string>();

  const stallTimestampsRef = useRef<number[]>([]);
  const stallStartedAtRef = useRef<number | null>(null);
  const lastSwitchAtRef = useRef<number | null>(null);
  const sampleStartRef = useRef<{ atMs: number; bufferedEndSeconds: number } | null>(null);
  // `waiting` fires while a new source loads and after every seek; only stalls during playback
  // of a source that already played count against the connection.
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    // A new set of variants (new asset) resets everything switching-related.
    setCommittedCode(undefined);
    stallTimestampsRef.current = [];
    stallStartedAtRef.current = null;
    lastSwitchAtRef.current = null;
    sampleStartRef.current = null;
  }, [sortedAsc]);

  const capResolution = useCallback((): number => {
    const frame = frameRef.current;
    if (!frame) {
      return Number.POSITIVE_INFINITY;
    }
    return maxAllowedResolution(
      frame.clientWidth,
      frame.clientHeight,
      window.devicePixelRatio || 1,
    );
  }, [frameRef]);

  const committedVariant = committedCode
    ? sortedAsc.find((variant) => variant.variantCode === committedCode)
    : undefined;
  const autoVariant =
    committedVariant ?? chooseAutoVariant(sortedAsc, bandwidthEstimate, capResolution());

  useEffect(() => {
    if (!committedCode && autoVariant) {
      setCommittedCode(autoVariant.variantCode);
    }
  }, [autoVariant, committedCode]);

  // A stored choice this video does not offer (another asset's variant) means auto here.
  const manualVariant =
    storedQuality === AUTO_QUALITY
      ? undefined
      : sortedAsc.find((variant) => variant.variantCode === storedQuality);
  const quality = manualVariant ? storedQuality : AUTO_QUALITY;
  const activeVariant = manualVariant ?? autoVariant ?? sortedAsc.at(-1);

  const setQuality = useCallback(
    (value: string) => {
      setStoredQuality(value);
      storeQuality(value);
      if (value === AUTO_QUALITY) {
        // Back to auto: start from what the connection is measured to carry now.
        setCommittedCode(
          chooseAutoVariant(sortedAsc, bandwidthEstimate, capResolution())?.variantCode,
        );
        lastSwitchAtRef.current = Date.now();
      }
    },
    [bandwidthEstimate, capResolution, sortedAsc],
  );

  const switchTo = useCallback((next: T | undefined) => {
    if (next) {
      setCommittedCode(next.variantCode);
      lastSwitchAtRef.current = Date.now();
    }
  }, []);

  const handleLoadStart = useCallback(() => {
    hasPlayedRef.current = false;
    sampleStartRef.current = null;
    stallStartedAtRef.current = null;
  }, []);

  const handleSeeking = useCallback(() => {
    // The buffer jumps to the seek target; growth across it says nothing about throughput.
    sampleStartRef.current = null;
  }, []);

  const handleWaiting = useCallback(() => {
    const video = videoRef.current;
    if (quality !== AUTO_QUALITY || !hasPlayedRef.current || !video || video.seeking) {
      return;
    }
    const now = Date.now();
    stallStartedAtRef.current = now;
    const recent = pruneStallHistory([...stallTimestampsRef.current, now], now);
    stallTimestampsRef.current = recent;
    if (shouldDownswitch(recent)) {
      stallTimestampsRef.current = [];
      switchTo(stepLevel(sortedAsc, autoVariant, -1));
    }
  }, [autoVariant, quality, sortedAsc, switchTo, videoRef]);

  const handlePlaying = useCallback(() => {
    hasPlayedRef.current = true;
    if (stallStartedAtRef.current === null) {
      return;
    }
    const durationMs = Date.now() - stallStartedAtRef.current;
    stallStartedAtRef.current = null;
    if (quality === AUTO_QUALITY && shouldDownswitch([], durationMs)) {
      stallTimestampsRef.current = [];
      switchTo(stepLevel(sortedAsc, autoVariant, -1));
    }
  }, [autoVariant, quality, sortedAsc, switchTo]);

  /** Samples throughput from how fast the buffer grows, and considers an upswitch. */
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !activeVariant) {
      return;
    }
    const now = Date.now();
    const range = currentBufferedRange(video);
    const start = sampleStartRef.current;
    if (!range) {
      sampleStartRef.current = null;
    } else if (!start) {
      sampleStartRef.current = { atMs: now, bufferedEndSeconds: range.end };
    } else if (now - start.atMs >= MIN_SAMPLE_WINDOW_MS) {
      sampleStartRef.current = { atMs: now, bufferedEndSeconds: range.end };
      const bitrate = estimatedVariantBitrateBps(activeVariant);
      const sampleBps = sampleBandwidthFromTransfer(
        ((range.end - start.bufferedEndSeconds) * bitrate) / 8,
        now - start.atMs,
      );
      // No growth means the browser has buffered enough and stopped fetching, not that the
      // connection is slow, so only growing windows are samples.
      if (sampleBps !== null) {
        setBandwidthEstimate((current) => updateBandwidthEstimate(current, sampleBps));
      }
    }

    if (quality !== AUTO_QUALITY || !range) {
      return;
    }
    if (!canUpswitch(lastSwitchAtRef.current, now, range.end - video.currentTime)) {
      return;
    }
    const target = chooseAutoVariant(sortedAsc, bandwidthEstimate, capResolution());
    if (target && autoVariant && (target.resolution ?? 0) > (autoVariant.resolution ?? 0)) {
      // One level at a time, so a wrong estimate costs one stall, not a jump to the top.
      switchTo(stepLevel(sortedAsc, autoVariant, 1));
    }
  }, [
    activeVariant,
    autoVariant,
    bandwidthEstimate,
    capResolution,
    quality,
    sortedAsc,
    switchTo,
    videoRef,
  ]);

  return {
    quality,
    setQuality,
    activeVariant,
    autoVariant,
    sortedAsc,
    /** Attach to the `<video>` element for bandwidth sampling and stall-based switching. */
    videoEventHandlers: {
      onLoadStart: handleLoadStart,
      onSeeking: handleSeeking,
      onWaiting: handleWaiting,
      onPlaying: handlePlaying,
      onTimeUpdate: handleTimeUpdate,
    },
  };
}
