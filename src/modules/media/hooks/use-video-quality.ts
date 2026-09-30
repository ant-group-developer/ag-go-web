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

function readStoredQuality(storageKey: string): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function storeQuality(storageKey: string, value: string) {
  try {
    window.localStorage.setItem(storageKey, value);
  } catch {
    // Storage can be unavailable (private mode); the choice then only lasts for this view.
  }
}

export type VideoQualityOptions<T> = {
  /** Where the viewer's choice is remembered; each viewing context keeps its own. */
  storageKey: string;
  /** Choice used until the viewer picks one (a source code or AUTO_QUALITY). */
  defaultQuality?: string;
  /** Sources offered for manual choice only, never picked by auto (e.g. the original file). */
  manualOnly?: T[];
};

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
  { storageKey, defaultQuality = AUTO_QUALITY, manualOnly = [] }: VideoQualityOptions<T>,
) {
  const sortedAsc = useMemo(() => sortVariantsAscByResolution(variants), [variants]);
  const [storedQuality, setStoredQuality] = useState(
    () => readStoredQuality(storageKey) ?? defaultQuality,
  );
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

  // A stored choice this video does not offer (another asset's variant) means auto here; with
  // nothing for auto to pick from, the first manual-only source plays.
  const manualVariant =
    storedQuality === AUTO_QUALITY
      ? undefined
      : [...sortedAsc, ...manualOnly].find((variant) => variant.variantCode === storedQuality);
  const fallbackVariant = sortedAsc.length === 0 ? manualOnly[0] : undefined;
  const chosenVariant = manualVariant ?? fallbackVariant;
  const quality = chosenVariant ? chosenVariant.variantCode : AUTO_QUALITY;
  const activeVariant = chosenVariant ?? autoVariant ?? sortedAsc.at(-1);

  /** `remember: false` switches without keeping the choice (e.g. falling back after an error). */
  const setQuality = useCallback(
    (value: string, { remember = true }: { remember?: boolean } = {}) => {
      setStoredQuality(value);
      if (remember) {
        storeQuality(storageKey, value);
      }
      if (value === AUTO_QUALITY) {
        // Back to auto: start from what the connection is measured to carry now.
        setCommittedCode(
          chooseAutoVariant(sortedAsc, bandwidthEstimate, capResolution())?.variantCode,
        );
        lastSwitchAtRef.current = Date.now();
      }
    },
    [bandwidthEstimate, capResolution, sortedAsc, storageKey],
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
