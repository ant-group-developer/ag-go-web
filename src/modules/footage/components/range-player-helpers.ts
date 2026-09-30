/**
 * Pure helpers for the footage range player.
 * Kept separate so they can be tested without a DOM environment.
 */

/**
 * Given the current video time and a [startSec, endSec] range, returns the
 * time to seek to when the video should loop, or `null` when no seek is needed.
 */
export function getLoopSeekTime(
  currentTimeSec: number,
  startSec: number,
  endSec: number,
): number | null {
  if (endSec <= startSec) return null;
  if (currentTimeSec >= endSec) return startSec;
  return null;
}

/**
 * Returns the effective start time for a video element when the range has a
 * positive start offset. Used to initialise playback.
 */
export function getInitialPlaybackTime(startMs: number): number {
  return startMs / 1000;
}
