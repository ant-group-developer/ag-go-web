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
import type { CSSProperties, KeyboardEvent, Ref, SyntheticEvent } from 'react';
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
/** The original takes over from its stand-in preview once this much is buffered ahead. */
const WARM_MIN_AHEAD_SECONDS = 2;
/** While playing, the original warms up this far ahead of the playhead (doubling on misses). */
const WARM_LEAD_SECONDS = 3;
const WARM_MAX_LEAD_SECONDS = 12;
/** A warmed original this close to the playhead takes over without seeking again. */
const WARM_SYNC_TOLERANCE_SECONDS = 0.25;
/** The warming original keeps within this of the playhead, since buffering follows it. */
const WARM_FOLLOW_SECONDS = 1;
/** An original that has not even loaded its metadata by then is switched to directly. */
const WARM_GIVE_UP_MS = 15_000;
const WARM_POLL_MS = 500;

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

/** Seconds buffered from `time` on, or -1 when `time` itself is not buffered. */
function bufferedAhead(video: HTMLVideoElement, time: number): number {
  const { buffered } = video;
  for (let i = 0; i < buffered.length; i += 1) {
    if (buffered.start(i) <= time + 0.05 && time <= buffered.end(i)) {
      return buffered.end(i) - time;
    }
  }
  return -1;
}

const VIDEO_EVENT_NAMES = [
  'onClick',
  'onDoubleClick',
  'onError',
  'onLoadedMetadata',
  'onLoadedData',
  'onSeeked',
  'onTimeUpdate',
  'onProgress',
  'onCanPlay',
  'onCanPlayThrough',
  'onPlay',
  'onPause',
  'onLoadStart',
  'onSeeking',
  'onWaiting',
  'onPlaying',
] as const;
type VideoEventHandlers = Partial<
  Record<(typeof VIDEO_EVENT_NAMES)[number], (event: SyntheticEvent<HTMLVideoElement>) => void>
>;

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
 *
 * The original is often a camera file of 100+ Mbps with its index at the end, slow to start.
 * Choosing it keeps a preview playing (the stand-in) while the original buffers at the playhead
 * in a second, hidden `<video>`; once enough is buffered the two elements swap in place.
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
  // Two elements: the active one plays, the standby one warms up the original (see above).
  // `videoRef` always points at the active one.
  const videoRef = useRef<HTMLVideoElement>(null);
  const slotElementsRef = useRef<(HTMLVideoElement | null)[]>([null, null]);
  const activeSlotRef = useRef(0);
  const [activeSlot, setActiveSlot] = useState(0);
  const slotRefCallbacks = useMemo(
    () =>
      [0, 1].map((slot) => (element: HTMLVideoElement | null) => {
        slotElementsRef.current[slot] = element;
        if (activeSlotRef.current === slot) {
          videoRef.current = element;
        }
      }),
    [],
  );
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
  const resultFor = (code: string | undefined) => {
    const index = code ? sources.findIndex((source) => source.variantCode === code) : -1;
    return index >= 0 ? urlResults[index] : undefined;
  };
  const urlFor = (code: string | undefined): string | undefined => {
    if (!code) {
      return undefined;
    }
    const url = pinnedUrlsRef.current.get(code) ?? resultFor(code)?.data;
    if (url) {
      pinnedUrlsRef.current.set(code, url);
    }
    return url;
  };
  const activeCode = activeVariant?.variantCode;

  // --- Original warm-up: a preview stands in until the original has buffered at the playhead.
  const [promoted, setPromoted] = useState(false);
  const [, setUrlRetries] = useState(0);
  const displayedCodeRef = useRef<string | undefined>(undefined);
  const warmLeadRef = useRef(WARM_LEAD_SECONDS);
  const standInCode =
    activeCode === ORIGINAL_SOURCE_CODE && !promoted
      ? displayedCodeRef.current && displayedCodeRef.current !== ORIGINAL_SOURCE_CODE
        ? displayedCodeRef.current
        : autoVariant?.variantCode
      : undefined;
  // The source the active element shows: the stand-in while the original warms up.
  const mainCode = standInCode ?? activeCode;
  const mainResult = resultFor(mainCode);
  const desiredUrl = urlFor(mainCode);
  const warmResult = standInCode ? resultFor(ORIGINAL_SOURCE_CODE) : undefined;
  const warmUrl = standInCode ? urlFor(ORIGINAL_SOURCE_CODE) : undefined;

  useEffect(() => {
    if (activeCode !== ORIGINAL_SOURCE_CODE) {
      // Choosing the original again warms it up again behind the preview playing then.
      setPromoted(false);
    }
  }, [activeCode]);

  useEffect(() => {
    warmLeadRef.current = WARM_LEAD_SECONDS;
    const standby = slotElementsRef.current[1 - activeSlot];
    if (!warmUrl && standby && !standby.hasAttribute('src')) {
      // Stops whatever the standby element was still fetching.
      standby.load();
    }
  }, [activeSlot, warmUrl]);

  // Latest `advanceWarmUp` (defined with the player state below) for the timer here.
  const advanceWarmUpRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    if (!warmUrl) {
      return undefined;
    }
    // A hidden element that already can play may stop firing `progress`; poll as well.
    const poll = setInterval(() => advanceWarmUpRef.current(), WARM_POLL_MS);
    // Browsers that only load on play (iOS ignores preload) never warm up: switch directly.
    const giveUp = setTimeout(() => {
      const standby = slotElementsRef.current[1 - activeSlotRef.current];
      if (!standby || standby.readyState < HTMLMediaElement.HAVE_METADATA) {
        setPromoted(true);
      }
    }, WARM_GIVE_UP_MS);
    return () => {
      clearInterval(poll);
      clearTimeout(giveUp);
    };
  }, [warmUrl]);

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
    displayedCodeRef.current = mainCode;
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
  }, [desiredUrl, displayedUrl, mainCode]);

  useEffect(() => () => clearTimeout(freezeTimerRef.current), []);

  const fallBackFromOriginal = useCallback(() => {
    // Formats the browser cannot play (HEVC, ProRes...) fall back to the rendered previews.
    setOriginalFailed(true);
    setQuality(AUTO_QUALITY, { remember: false });
    void message.warning(t('media.originalUnplayable'));
  }, [message, setQuality, t]);

  /** `onMain`: the failing source is the one shown, not the original warming up behind it. */
  const handleSourceError = useCallback(
    (code: string | undefined, onMain: boolean) => {
      if (onMain) {
        unfreeze();
      }
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
            if (onMain) {
              setDisplayedUrl(url);
            } else {
              setUrlRetries((count) => count + 1);
            }
          })
          .catch(() => (onMain ? onError?.() : fallBackFromOriginal()));
        return;
      }
      if (code === ORIGINAL_SOURCE_CODE && variants.length > 0) {
        fallBackFromOriginal();
        return;
      }
      onError?.();
    },
    [
      assetId,
      fallBackFromOriginal,
      onError,
      queryClient,
      sourceUrlQuery,
      unfreeze,
      variants.length,
    ],
  );

  useEffect(() => {
    if (mainResult?.isError && !pinnedUrlsRef.current.has(mainCode ?? '')) {
      handleSourceError(mainCode, true);
    }
    // Only a failed URL request of the shown source matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainResult?.isError, mainCode]);

  useEffect(() => {
    if (warmResult?.isError && !pinnedUrlsRef.current.has(ORIGINAL_SOURCE_CODE)) {
      handleSourceError(ORIGINAL_SOURCE_CODE, false);
    }
    // Only a failed URL request of the warming original matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warmResult?.isError]);

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

  // --- Handing over from the stand-in preview to the warmed-up original.
  const promoteOriginal = (main: HTMLVideoElement, standby: HTMLVideoElement) => {
    const nextSlot = 1 - activeSlotRef.current;
    const playing = !main.paused;
    standby.playbackRate = playbackRate;
    standby.volume = volume;
    standby.muted = muted;
    // From here on, events of the element that stops playing are ignored.
    activeSlotRef.current = nextSlot;
    videoRef.current = standby;
    main.pause();
    main.muted = true;
    if (playing) {
      void standby.play().catch(() => {
        playbackRef.current.playing = false;
        setIsPlaying(false);
      });
    }
    playbackRef.current.time = standby.currentTime;
    displayedCodeRef.current = ORIGINAL_SOURCE_CODE;
    setCurrentTime(standby.currentTime);
    const { buffered } = standby;
    setBufferedEnd(buffered.length > 0 ? buffered.end(buffered.length - 1) : 0);
    setActiveSlot(nextSlot);
    setDisplayedUrl(warmUrl);
    setPromoted(true);
  };

  /**
   * Keeps the warming original at the playhead (ahead of it while playing and not yet
   * buffered there, since the playhead moves on meanwhile) and hands over once it has data
   * there. Chrome buffers only ~25 MB ahead of an element's position, under 2 s of a
   * 100+ Mbps original, so "buffer full" (HAVE_ENOUGH_DATA) counts as ready too.
   */
  const advanceWarmUp = () => {
    const main = videoRef.current;
    const standby = slotElementsRef.current[1 - activeSlotRef.current];
    if (
      !warmUrl ||
      !main ||
      !standby ||
      standby.seeking ||
      standby.readyState < HTMLMediaElement.HAVE_METADATA
    ) {
      return;
    }
    const playing = !main.paused;
    const target = main.currentTime;
    const end = Number.isFinite(standby.duration) ? standby.duration : Number.POSITIVE_INFINITY;
    const ahead = bufferedAhead(standby, target);
    const enough =
      ahead >= 0 &&
      (ahead >= WARM_MIN_AHEAD_SECONDS ||
        target + ahead >= end - 0.1 ||
        standby.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA);
    if (ahead >= 0) {
      const drift = Math.abs(standby.currentTime - target);
      if (
        enough &&
        drift <= WARM_SYNC_TOLERANCE_SECONDS &&
        standby.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        promoteOriginal(main, standby);
      } else if (enough || drift > WARM_FOLLOW_SECONDS) {
        // Browsers buffer ahead of the element's own position, so it follows the playhead.
        // Within the buffered range, so it lands quickly; `seeked` comes back here.
        standby.currentTime = Math.min(target + (playing ? 0.15 : 0), end);
      }
      return;
    }
    const waitingAhead =
      standby.currentTime > target && standby.currentTime - target <= warmLeadRef.current + 1;
    if (playing && waitingAhead) {
      // The playhead is coming up to where the original is buffering.
      return;
    }
    standby.currentTime = Math.min(target + (playing ? warmLeadRef.current : 0), end);
    if (playing) {
      // Missed: the connection is slower than the playhead, so wait further ahead next time.
      warmLeadRef.current = Math.min(warmLeadRef.current * 2, WARM_MAX_LEAD_SECONDS);
    }
  };

  useEffect(() => {
    advanceWarmUpRef.current = advanceWarmUp;
  });

  const mainHandlers: VideoEventHandlers = {
    onClick: () => {
      // A tap on a touch screen first brings the hidden controls back.
      if (controlsHidden) {
        showControls();
      } else {
        togglePlay();
      }
    },
    onDoubleClick: toggleFullscreen,
    onError: () => handleSourceError(mainCode, true),
    onLoadedMetadata: (event) => {
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
    },
    onLoadedData: (event) => {
      if (!event.currentTarget.seeking) {
        unfreeze();
      }
    },
    onSeeked: (event) => {
      if (event.currentTarget.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        unfreeze();
      }
      advanceWarmUp();
    },
    onTimeUpdate: (event) => {
      const video = event.currentTarget;
      // Loading a new source (a quality switch) resets the position to 0 before its
      // metadata is in; that must not overwrite the position to resume from.
      if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
        return;
      }
      playbackRef.current.time = video.currentTime;
      setCurrentTime(video.currentTime);
      videoEventHandlers.onTimeUpdate();
      advanceWarmUp();
    },
    onProgress: (event) => {
      const { buffered } = event.currentTarget;
      setBufferedEnd(buffered.length > 0 ? buffered.end(buffered.length - 1) : 0);
    },
    onPlay: () => {
      playbackRef.current.playing = true;
      setIsPlaying(true);
    },
    onPause: () => {
      playbackRef.current.playing = false;
      setIsPlaying(false);
      setControlsHidden(false);
      advanceWarmUp();
    },
    onLoadStart: videoEventHandlers.onLoadStart,
    onSeeking: videoEventHandlers.onSeeking,
    onWaiting: videoEventHandlers.onWaiting,
    onPlaying: videoEventHandlers.onPlaying,
  };
  const standbyHandlers: VideoEventHandlers = {
    onError: () => handleSourceError(ORIGINAL_SOURCE_CODE, false),
    onLoadedMetadata: (event) => {
      event.currentTarget.muted = true;
      advanceWarmUp();
    },
    onLoadedData: advanceWarmUp,
    onProgress: advanceWarmUp,
    onCanPlay: advanceWarmUp,
    onCanPlayThrough: advanceWarmUp,
    onSeeked: advanceWarmUp,
  };
  // Roles swap between the two elements, so each event goes by the role at the time it fires.
  const slotHandlers = (slot: number): VideoEventHandlers =>
    Object.fromEntries(
      VIDEO_EVENT_NAMES.map((name) => [
        name,
        (event: SyntheticEvent<HTMLVideoElement>) =>
          (activeSlotRef.current === slot ? mainHandlers : standbyHandlers)[name]?.(event),
      ]),
    );

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
        {[0, 1].map((slot) => {
          const isMain = slot === activeSlot;
          return (
            <video
              key={slot}
              ref={slotRefCallbacks[slot]}
              className={`${styles.video} ${isMain ? '' : styles.videoStandby}`}
              // Buffering starts as soon as the player opens, not only on play.
              preload="auto"
              playsInline
              aria-hidden={isMain ? undefined : true}
              src={isMain ? displayedUrl : warmUrl}
              {...slotHandlers(slot)}
            />
          );
        })}
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
            <div className={styles.seekThumb} style={{ left: `${playedPercent}%` }} />
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
                  {standInCode ? (
                    <LoadingOutlined
                      className={styles.qualityWarming}
                      title={t('media.originalWarming')}
                    />
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
