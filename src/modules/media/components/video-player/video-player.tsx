import {
  ExpandOutlined,
  FullscreenExitOutlined,
  PauseCircleFilled,
  PlayCircleFilled,
  SettingOutlined,
  SoundFilled,
  SoundOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Dropdown, Flex, Slider, Tag } from 'antd';
import type { CSSProperties, KeyboardEvent, Ref } from 'react';
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAssetPreviewUrl } from '../../hooks/use-asset-preview-url';
import {
  AUTO_QUALITY,
  useVideoQuality,
  type VideoQualityVariant,
} from '../../hooks/use-video-quality';
import {
  sortVariantsDescByResolution,
  variantMenuLabel,
  variantResolutionLabel,
} from '../../utils/variant-labels';
import styles from './video-player.module.css';

export type VideoPlayerVariant = VideoQualityVariant & {
  width: number | null;
  height: number | null;
};

/** Lets a parent move playback, e.g. to the start of an analysed segment. */
export type VideoPlayerHandle = {
  seekTo: (seconds: number) => void;
};

type VideoPlayerProps = {
  ref?: Ref<VideoPlayerHandle>;
  assetId: string;
  variants: VideoPlayerVariant[];
  poster?: string;
  className?: string;
  style?: CSSProperties;
  onError?: () => void;
};

const SEEK_STEP_SECONDS = 5;
const PLAYBACK_RATES = [0.5, 1, 1.25, 1.5, 2];
/** Controls stay visible this long after the last interaction while playing. */
const CONTROLS_IDLE_MS = 2_500;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Video playback with custom controls (play/pause, seek with buffered range, volume, speed,
 * fullscreen) and an auto-quality switcher over progressive MP4 variants (see `use-video-quality`
 * for the adaptive bitrate logic). Keyboard: space/k play-pause, arrows seek ±5s, f fullscreen,
 * m mute.
 */
export function VideoPlayer({
  ref,
  assetId,
  variants,
  poster,
  className,
  style,
  onError,
}: VideoPlayerProps) {
  const { t } = useTranslation();
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Playback position/state survives switching the source (manual or automatic quality change).
  const playbackRef = useRef({ time: 0, playing: false });
  const { quality, setQuality, activeVariant, autoVariant, videoEventHandlers } = useVideoQuality(
    variants,
    videoRef,
    frameRef,
  );
  const url = useAssetPreviewUrl(
    activeVariant ? assetId : null,
    activeVariant?.variantCode ?? 'preview',
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // The controls stay up while the quality menu is open.
  const menuOpenRef = useRef(false);

  useEffect(() => {
    playbackRef.current = { time: 0, playing: false };
    setCurrentTime(0);
    setDuration(0);
    setBufferedEnd(0);
  }, [assetId]);

  const showControls = useCallback(() => {
    setControlsHidden(false);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      if (playbackRef.current.playing && !menuOpenRef.current) {
        setControlsHidden(true);
      }
    }, CONTROLS_IDLE_MS);
  }, []);

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === frameRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (video.paused) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, []);

  const seekBy = useCallback((deltaSeconds: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.currentTime = Math.min(
      Math.max(0, video.currentTime + deltaSeconds),
      video.duration || Number.MAX_SAFE_INTEGER,
    );
  }, []);

  const seekTo = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.currentTime = value;
    setCurrentTime(value);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      seekTo: (seconds: number) => {
        // Kept for the next source too: the player restores this position when it (re)loads.
        playbackRef.current.time = seconds;
        seekTo(seconds);
      },
    }),
    [seekTo],
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const changeVolume = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.volume = value;
    video.muted = value === 0;
    setVolume(value);
    setMuted(value === 0);
  }, []);

  const cycleRate = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const nextRate =
      PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(playbackRate) + 1) % PLAYBACK_RATES.length];
    video.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  }, [playbackRate]);

  const toggleFullscreen = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void frame.requestFullscreen?.().catch(() => undefined);
    }
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case ' ':
      case 'k':
      case 'K':
        event.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        seekBy(-SEEK_STEP_SECONDS);
        break;
      case 'ArrowRight':
        event.preventDefault();
        seekBy(SEEK_STEP_SECONDS);
        break;
      case 'f':
      case 'F':
        event.preventDefault();
        toggleFullscreen();
        break;
      case 'm':
      case 'M':
        event.preventDefault();
        toggleMute();
        break;
      default:
        break;
    }
    showControls();
  };

  const qualityMenuItems: MenuProps['items'] = [
    {
      key: AUTO_QUALITY,
      label: autoVariant
        ? `${t('media.qualityAuto')} (${variantResolutionLabel(autoVariant)})`
        : t('media.qualityAuto'),
    },
    { type: 'divider' },
    ...sortVariantsDescByResolution(variants).map((variant) => {
      const { text, showWatermarkBadge } = variantMenuLabel(variant, variants);
      return {
        key: variant.variantCode,
        label: (
          <Flex align="center" justify="space-between" gap={10}>
            <span>{text}</span>
            {showWatermarkBadge ? (
              <Tag color="gold" className={styles.qualityBadge}>
                {t('media.watermarkBadge')}
              </Tag>
            ) : null}
          </Flex>
        ),
      };
    }),
  ];

  const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div
      ref={frameRef}
      className={className}
      style={{ ...style, position: 'relative', outline: 'none' }}
      tabIndex={0}
      role="group"
      aria-label={t('media.videoPlayer')}
      onKeyDown={handleKeyDown}
      onMouseMove={showControls}
      onMouseEnter={showControls}
      onMouseLeave={() => {
        if (playbackRef.current.playing && !menuOpenRef.current) {
          setControlsHidden(true);
        }
      }}
    >
      <div className={styles.frame}>
        <video
          ref={videoRef}
          className={styles.video}
          preload="metadata"
          poster={poster}
          src={url}
          onClick={() => {
            // A tap on a touch screen first brings the hidden controls back.
            if (controlsHidden) {
              showControls();
            } else {
              togglePlay();
            }
          }}
          onError={onError}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            setDuration(video.duration || 0);
            const { time, playing } = playbackRef.current;
            if (time > 0) {
              video.currentTime = time;
            }
            video.playbackRate = playbackRate;
            video.volume = volume;
            video.muted = muted;
            if (playing) {
              void video.play().catch(() => undefined);
            }
          }}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            // Loading a new source (a quality switch) resets the position to 0 before its
            // metadata is in; that must not overwrite the position to resume from.
            if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
              return;
            }
            playbackRef.current.time = video.currentTime;
            setCurrentTime(video.currentTime);
            videoEventHandlers.onTimeUpdate();
          }}
          onProgress={(event) => {
            const { buffered } = event.currentTarget;
            setBufferedEnd(buffered.length > 0 ? buffered.end(buffered.length - 1) : 0);
          }}
          onPlay={() => {
            playbackRef.current.playing = true;
            setIsPlaying(true);
          }}
          onPause={() => {
            playbackRef.current.playing = false;
            setIsPlaying(false);
            setControlsHidden(false);
          }}
          onLoadStart={videoEventHandlers.onLoadStart}
          onSeeking={videoEventHandlers.onSeeking}
          onWaiting={videoEventHandlers.onWaiting}
          onPlaying={videoEventHandlers.onPlaying}
        />

        <div className={`${styles.controls} ${controlsHidden ? styles.controlsHidden : ''}`}>
          <div className={styles.seekRow}>
            <div className={styles.seekTrack} />
            <div className={styles.seekBuffered} style={{ width: `${bufferedPercent}%` }} />
            <div className={styles.seekPlayed} style={{ width: `${playedPercent}%` }} />
            <input
              className={styles.seekInput}
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              aria-label={t('media.seek')}
              onChange={(event) => seekTo(Number(event.target.value))}
            />
          </div>

          <div className={styles.buttonsRow}>
            <div className={styles.leftGroup}>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={isPlaying ? t('media.pause') : t('media.play')}
                onClick={togglePlay}
              >
                {isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
              </button>
              <span className={styles.time}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={muted ? t('media.unmute') : t('media.mute')}
                onClick={toggleMute}
              >
                {muted || volume === 0 ? <SoundOutlined /> : <SoundFilled />}
              </button>
              <Slider
                className={styles.volumeSlider}
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                tooltip={{ open: false }}
                onChange={(value) => changeVolume(Array.isArray(value) ? value[0] : value)}
              />
            </div>
            <div className={styles.rightGroup}>
              <button type="button" className={styles.rateButton} onClick={cycleRate}>
                {playbackRate}x
              </button>
              <Dropdown
                trigger={['click']}
                placement="topRight"
                // Inside the player so the menu still shows in fullscreen.
                getPopupContainer={() => frameRef.current ?? document.body}
                onOpenChange={(open) => {
                  menuOpenRef.current = open;
                  showControls();
                }}
                menu={{
                  items: qualityMenuItems,
                  selectedKeys: [quality],
                  onClick: ({ key }) => setQuality(key),
                }}
              >
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={t('media.quality')}
                  onClick={(event) => event.stopPropagation()}
                >
                  <SettingOutlined />
                </button>
              </Dropdown>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={t('media.fullscreen')}
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <FullscreenExitOutlined /> : <ExpandOutlined />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
