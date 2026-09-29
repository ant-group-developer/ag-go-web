import React, { useEffect, useRef } from 'react';
import { getInitialPlaybackTime, getLoopSeekTime } from './range-player-helpers';

interface RangePlayerProps {
  /** The URL of the preview video. */
  src: string;
  /** Segment start in milliseconds. */
  startMs: number;
  /** Segment end in milliseconds. */
  endMs: number;
  /** Whether to show browser controls. Defaults to false (for hover previews). */
  controls?: boolean;
  /** Optional max-height for the video element. */
  maxHeight?: number | string;
  /** Called when the video becomes ready. */
  onReady?: () => void;
  style?: React.CSSProperties;
}

/**
 * A `<video>` element that plays only the [startMs, endMs] range of a clip,
 * looping when the range end is reached.
 *
 * For hover previews (`controls=false`) the video autoplays muted.
 * For the detail drawer (`controls=true`) it shows browser controls and is not muted.
 */
export function RangePlayer({
  src,
  startMs,
  endMs,
  controls = false,
  maxHeight,
  onReady,
  style,
}: RangePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const startSec = startMs / 1000;
  const endSec = endMs / 1000;

  // Seek to startMs whenever the src or range changes.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = getInitialPlaybackTime(startMs);
    if (!controls) {
      void video.play().catch(() => undefined);
    }
  }, [src, startMs, controls]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = startSec;
    if (!controls) {
      void video.play().catch(() => undefined);
    }
    onReady?.();
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const seekTo = getLoopSeekTime(video.currentTime, startSec, endSec);
    if (seekTo !== null) {
      video.currentTime = seekTo;
    }
  };

  return (
    <video
      ref={videoRef}
      src={src}
      controls={controls}
      autoPlay={!controls}
      muted={!controls}
      loop={false} // we handle looping ourselves for range restriction
      playsInline
      preload="metadata"
      onLoadedMetadata={handleLoadedMetadata}
      onTimeUpdate={handleTimeUpdate}
      style={{
        background: '#000',
        display: 'block',
        width: '100%',
        objectFit: 'contain',
        maxHeight: maxHeight ?? 480,
        ...style,
      }}
    />
  );
}
