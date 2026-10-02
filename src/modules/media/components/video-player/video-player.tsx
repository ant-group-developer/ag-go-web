import {
  ExpandOutlined,
  FullscreenExitOutlined,
  LoadingOutlined,
  PauseCircleFilled,
  PlayCircleFilled,
  SettingOutlined,
  SoundFilled,
  SoundOutlined,
} from '@ant-design/icons';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import type { MenuProps } from 'antd';
import { App, Dropdown, Flex, Slider, Tag, Typography } from 'antd';
import type { CSSProperties, KeyboardEvent, Ref } from 'react';
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { AUTO_QUALITY, useVideoQuality } from '../../hooks/use-video-quality';
import {
  sortVariantsDescByResolution,
  variantMenuLabel,
  variantResolutionLabel,
} from '../../utils/variant-labels';
import styles from './video-player.module.css';
import {
  ORIGINAL_SOURCE_CODE,
  sourceUrlQuery as assetSourceUrlQuery,
  type SourceUrlQuery,
  type VideoPlayerSource,
} from './video-source';

/** Lets a parent move playback, e.g. to the timestamp of an analysed keyframe. */
export type VideoPlayerHandle = {
  seekTo: (seconds: number) => void;
};

type VideoPlayerProps = {
  ref?: Ref<VideoPlayerHandle>;
  assetId: string;
  /** Rendered previews on offer; auto quality picks among them. */
  variants: VideoPlayerSource[];
  /** The original file, offered as a manual choice (never picked by auto). */
  original?: VideoPlayerSource | null;
  /** Where the viewer's quality choice is remembered; one key per viewing context. */
  qualityStorageKey: string;
  /** Query for a source's presigned URL; defaults to the asset preview/original endpoints. */
  sourceUrlQuery?: SourceUrlQuery;
  defaultQuality?: string;
  className?: string;
  style?: CSSProperties;
  /** No source can be played. */
  onError?: () => void;
};

const SEEK_STEP_SECONDS = 5;
const PLAYBACK_RATES = [0.5, 1, 1.25, 1.5, 2];
/** Controls stay visible this long after the last interaction while playing. */
const CONTROLS_IDLE_MS = 2_500;
/** Presigned URLs live for 15 minutes by default; fetch new ones well before. */
const SOURCE_URL_STALE_MS = 5 * 60 * 1000;
/** The frozen frame never outlives a switch that fails to report back. */
const FREEZE_TIMEOUT_MS = 8_000;

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};
type FullscreenCapableElement = HTMLElement & { webkitRequestFullscreen?: () => void };
type IosVideoElement = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

function currentFullscreenElement(): Element | null {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

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
 * fullscreen) and a quality menu: auto quality over progressive MP4 previews (see
 * `use-video-quality`), each preview, and optionally the original file. Keyboard: space/k
 * play-pause, arrows seek ±5s, f fullscreen, m mute; double-click toggles fullscreen.
 *
 * Switching quality keeps the position and play state, and shows the last frame until the new
 * source has reached that position, so the picture never blanks. URLs of every source are
 * fetched up front and kept for the player's lifetime; a source that errors (e.g. an expired
 * URL) is retried once with a fresh URL.
 */
export function VideoPlayer({
  ref,
  assetId,
  variants,
  original,
  qualityStorageKey,
  sourceUrlQuery = assetSourceUrlQuery,
  defaultQuality,
  className,
  style,
  onError,
}: VideoPlayerProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Playback position/state survives switching the source (manual or automatic quality change).
  const playbackRef = useRef({ time: 0, playing: false });
  const [originalFailed, setOriginalFailed] = useState(false);
  const manualOnly = useMemo(
    () => (original && !originalFailed ? [original] : []),
    [original, originalFailed],
  );
  const { quality, setQuality, activeVariant, autoVariant, videoEventHandlers } = useVideoQuality(
    variants,
    videoRef,
    rootRef,
    { storageKey: qualityStorageKey, defaultQuality, manualOnly },
  );

  // --- Source URLs: fetched for every source up front, pinned once the player uses them.
  const sources = useMemo(() => [...manualOnly, ...variants], [manualOnly, variants]);
  const urlResults = useQueries({
    queries: sources.map((source) => ({
      ...sourceUrlQuery(assetId, source.variantCode),
      staleTime: SOURCE_URL_STALE_MS,
      gcTime: SOURCE_URL_STALE_MS * 2,
      retry: false,
    })),
  });
  // A refetched (newer) URL of the source already playing would restart it; keep the one in use.
  const pinnedUrlsRef = useRef(new Map<string, string>());
  const retriedCodesRef = useRef(new Set<string>());
  const activeIndex = activeVariant
    ? sources.findIndex((source) => source.variantCode === activeVariant.variantCode)
    : -1;
  const activeResult = activeIndex >= 0 ? urlResults[activeIndex] : undefined;
  const activeCode = activeVariant?.variantCode;
  const desiredUrl =
    (activeCode ? pinnedUrlsRef.current.get(activeCode) : undefined) ?? activeResult?.data;
  if (activeCode && desiredUrl) {
    pinnedUrlsRef.current.set(activeCode, desiredUrl);
  }

  // --- Seamless switching: freeze the last frame over the video while the next source loads.
  const [displayedUrl, setDisplayedUrl] = useState<string>();
  const [frozen, setFrozen] = useState(false);
  const freezeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const unfreeze = useCallback(() => {
    clearTimeout(freezeTimerRef.current);
    setFrozen(false);
  }, []);

  useLayoutEffect(() => {
    if (!desiredUrl || desiredUrl === displayedUrl) {
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (displayedUrl && video && canvas && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
        setFrozen(true);
        clearTimeout(freezeTimerRef.current);
        freezeTimerRef.current = setTimeout(() => setFrozen(false), FREEZE_TIMEOUT_MS);
      } catch {
        // Without a snapshot the switch just shows the new source as it loads.
      }
    }
    setDisplayedUrl(desiredUrl);
  }, [desiredUrl, displayedUrl]);

  useEffect(() => () => clearTimeout(freezeTimerRef.current), []);

  const handleSourceError = useCallback(() => {
    const code = activeCode;
    unfreeze();
    if (!code) {
      onError?.();
      return;
    }
    if (!retriedCodesRef.current.has(code)) {
      // Most often an expired presigned URL: try once more with a fresh one.
      retriedCodesRef.current.add(code);
      pinnedUrlsRef.current.delete(code);
      void queryClient
        .fetchQuery({ ...sourceUrlQuery(assetId, code), staleTime: 0 })
        .then((url) => {
          pinnedUrlsRef.current.set(code, url);
          setDisplayedUrl(url);
        })
        .catch(() => onError?.());
      return;
    }
    if (code === ORIGINAL_SOURCE_CODE && variants.length > 0) {
      // Formats the browser cannot play (HEVC, ProRes...) fall back to the rendered previews.
      setOriginalFailed(true);
      setQuality(AUTO_QUALITY, { remember: false });
      void message.warning(t('media.originalUnplayable'));
      return;
    }
    onError?.();
  }, [
    activeCode,
    assetId,
    message,
    onError,
    queryClient,
    setQuality,
    sourceUrlQuery,
    t,
    unfreeze,
    variants.length,
  ]);

  useEffect(() => {
    if (activeResult?.isError && !pinnedUrlsRef.current.has(activeCode ?? '')) {
      handleSourceError();
    }
    // Only a failed URL request of the active source matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeResult?.isError, activeCode]);

  // --- Player state.
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

  const showControls = useCallback(() => {
    setControlsHidden(false);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (playbackRef.current.playing && !menuOpenRef.current) {
        setControlsHidden(true);
      }
    }, CONTROLS_IDLE_MS);
  }, []);

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(currentFullscreenElement() === rootRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
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

  /**
   * Fullscreen of the whole player (so the custom controls and quality menu stay), with the
   * prefixed API for older Safari; iPhones only allow the video element's native fullscreen.
   */
  const toggleFullscreen = useCallback(() => {
    const root = rootRef.current as FullscreenCapableElement | null;
    const video = videoRef.current as IosVideoElement | null;
    if (!root) {
      return;
    }
    const doc = document as FullscreenDocument;
    if (currentFullscreenElement()) {
      if (doc.exitFullscreen) {
        void doc.exitFullscreen().catch(() => undefined);
      } else {
        doc.webkitExitFullscreen?.();
      }
      return;
    }
    if (root.requestFullscreen) {
      void root.requestFullscreen().catch(() => video?.webkitEnterFullscreen?.());
    } else if (root.webkitRequestFullscreen) {
      root.webkitRequestFullscreen();
    } else {
      video?.webkitEnterFullscreen?.();
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

  const originalOption = manualOnly[0];
  const qualityMenuItems: MenuProps['items'] = [
    ...(variants.length > 0
      ? [
          {
            key: AUTO_QUALITY,
            label: autoVariant
              ? `${t('media.qualityAuto')} (${variantResolutionLabel(autoVariant)})`
              : t('media.qualityAuto'),
          },
          { type: 'divider' as const },
        ]
      : []),
    ...(originalOption
      ? [
          {
            key: ORIGINAL_SOURCE_CODE,
            label: (
              <Flex align="center" justify="space-between" gap={10}>
                <span>{t('media.qualityOriginal')}</span>
                <Typography.Text type="secondary">
                  {variantResolutionLabel(originalOption)}
                </Typography.Text>
              </Flex>
            ),
          },
        ]
      : []),
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

  // The frame keeps the video's shape from the start, so nothing jumps while a source loads.
  // Previews first: their sizes follow the displayed (rotated) frame, the original's may not.
  const shape = [...variants, ...manualOnly].find((source) => source.width && source.height);
  const aspectRatio = shape ? `${shape.width} / ${shape.height}` : '16 / 9';
  const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;
  const rootClassName = [
    styles.root,
    isFullscreen ? styles.rootFullscreen : '',
    controlsHidden ? styles.idle : '',
    className ?? '',
  ].join(' ');

  return (
    <div
      ref={rootRef}
      className={rootClassName}
      style={style}
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
      <div className={styles.frame} style={isFullscreen ? undefined : { aspectRatio }}>
        <video
          ref={videoRef}
          className={styles.video}
          preload="metadata"
          playsInline
          src={displayedUrl}
          onClick={() => {
            // A tap on a touch screen first brings the hidden controls back.
            if (controlsHidden) {
              showControls();
            } else {
              togglePlay();
            }
          }}
          onDoubleClick={toggleFullscreen}
          onError={handleSourceError}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            setDuration(video.duration || 0);
            const { time, playing } = playbackRef.current;
            if (time > 0) {
              // The frozen frame stays up until the seek lands (onSeeked).
              video.currentTime = time;
            }
            video.playbackRate = playbackRate;
            video.volume = volume;
            video.muted = muted;
            if (playing) {
              void video.play().catch(() => undefined);
            }
          }}
          onLoadedData={(event) => {
            if (!event.currentTarget.seeking) {
              unfreeze();
            }
          }}
          onSeeked={(event) => {
            if (event.currentTarget.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
              unfreeze();
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
        <canvas
          ref={canvasRef}
          className={`${styles.freezeFrame} ${frozen ? styles.freezeFrameVisible : ''}`}
          aria-hidden
        />
        {frozen || !displayedUrl ? (
          <div className={styles.loading} aria-hidden>
            <LoadingOutlined />
          </div>
        ) : null}

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
                getPopupContainer={() => rootRef.current ?? document.body}
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
                  className={styles.qualityButton}
                  aria-label={t('media.quality')}
                  onClick={(event) => event.stopPropagation()}
                >
                  <SettingOutlined />
                  {activeVariant ? (
                    <span className={styles.qualityLabel}>
                      {activeVariant.variantCode === ORIGINAL_SOURCE_CODE
                        ? t('media.qualityOriginal')
                        : variantResolutionLabel(activeVariant)}
                    </span>
                  ) : null}
                </button>
              </Dropdown>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={isFullscreen ? t('media.exitFullscreen') : t('media.fullscreen')}
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
