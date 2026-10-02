import {
  CheckOutlined,
  DownloadOutlined,
  FileImageOutlined,
  FileOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Drawer,
  Empty,
  Flex,
  Image,
  Input,
  List,
  Popconfirm,
  Radio,
  Row,
  Space,
  Spin,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import { Pause, Play, RotateCcw, X } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GO_PERMISSIONS } from '../../../shared/auth/permissions';
import { formatDate } from '../../../shared/lib/format-date';
import { CONTAINER_TABLE_STICKY } from '../../../shared/lib/sticky-table-header';
import { usePermissions } from '../../account/hooks/use-current-account';
import {
  analysisStatusColor,
  isTerminalStatus,
  type AnalysisStatus,
  type AssetAnalysis,
} from '../../analysis/api/analysis';
import {
  useAssetAnalysis,
  useCancelAssetAnalysis,
  usePauseAssetAnalysis,
  useResumeAssetAnalysis,
  useStartAssetAnalysis,
} from '../../analysis/hooks/use-analysis';
import { createDownload, getDownload, type DownloadResult } from '../../downloads/api/downloads';
import { type FootageFileInfo } from '../../footage/api/footage';
import {
  FileInfoDescriptions,
  FootageDescription,
} from '../../footage/components/footage-description';
import { useRefreshProjectMediaOnImportProgress } from '../../google-drive/hooks/use-refresh-project-media-on-import-progress';
import {
  getAssetOriginalUrl,
  getProjectMedia,
  retryAssetProcessing,
  updateProjectMedia,
  type PreviewVariant,
  type ProjectMedia,
} from '../../media/api/media';
import { ProjectMediaSortDropdown } from '../../media/components/project-media-sort-dropdown';
import { RenditionPicker } from '../../media/components/rendition-picker';
import {
  VideoPlayer,
  type VideoPlayerHandle,
} from '../../media/components/video-player/video-player';
import {
  ORIGINAL_SOURCE_CODE,
  type VideoPlayerSource,
} from '../../media/components/video-player/video-source';
import { useAssetPreviewUrl } from '../../media/hooks/use-asset-preview-url';
import { useRenditionSelection } from '../../media/hooks/use-rendition-selection';
import { AUTO_QUALITY } from '../../media/hooks/use-video-quality';
import { mediaQueryKeys } from '../../media/queries/media-query-keys';
import {
  DEFAULT_PROJECT_MEDIA_SORT,
  projectMediaModifiedAt,
  sortProjectMedia,
  type ProjectMediaSort,
} from '../../media/utils/sort-project-media';
import { ProjectImportHistoryCard } from '../../render/components/project-processing-history-cards';
import { getProject } from '../api/projects';
import { projectQueryKeys } from '../queries/project-query-keys';
import { BulkApproveModal, type BulkApproveTarget } from './bulk-approve-modal';
import { MediaEvaluationHistory } from './media-evaluation-history';
import { ProjectAuditLogCard } from './project-audit-log-card';
import { ProjectOverviewCard } from './project-overview-card';

/** 'evaluate' shows the original files; 'view' shows the watermarked previews. */
export type ProjectDrawerMode = 'view' | 'evaluate';

type MediaSource = 'preview' | 'original';

type EvaluationDecision = 'approved' | 'rejected';

const MIN_COMMENT_LENGTH = 2;
const IMPORT_TABLE_SCROLL_Y = 320;

const ORIGINAL_URL_STALE_MS = 5 * 60 * 1000;
const ORIGINAL_PERMISSIONS = ['go.project.evaluate', 'go.project.download_original'];

type ProjectReviewDrawerProps = {
  open: boolean;
  projectId?: string;
  mode?: ProjectDrawerMode;
  onClose: () => void;
};

function formatFileSize(value: string | undefined): string {
  const bytes = Number(value ?? 0);
  if (!bytes) {
    return '-';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** unitIndex).toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDuration(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '-';
  }
  const totalSeconds = Math.max(0, Math.round(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatResolution(media: ProjectMedia): string {
  return media.width && media.height ? `${media.width} × ${media.height}` : '-';
}

function getEvaluationStatus(status: ProjectMedia['evaluationStatus'], t: (key: string) => string) {
  const statuses = {
    pending: { color: 'processing', label: t('projects.evaluationPending') },
    approved: { color: 'success', label: t('projects.evaluationApproved') },
    rejected: { color: 'error', label: t('projects.evaluationRejected') },
  } as const;
  return statuses[status];
}

const previewPlaceholderStyle = {
  alignItems: 'center',
  background: '#f5f5f5',
  color: '#8c8c8c',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  minHeight: 420,
  justifyContent: 'center',
  padding: 24,
  textAlign: 'center',
} as const;

/** Tells the reviewer what the system is doing while no preview can be shown yet. */
function PreviewPlaceholder({ status, loading }: { status: string; loading?: boolean }) {
  const { t } = useTranslation();
  const states: Record<string, { message: string; busy: boolean }> = {
    uploading: { message: t('projects.previewUploading'), busy: true },
    importing: { message: t('projects.previewUploading'), busy: true },
    uploaded: { message: t('projects.previewProcessing'), busy: true },
    processing: { message: t('projects.previewProcessing'), busy: true },
    failed: { message: t('projects.previewFailed'), busy: false },
    cancelled: { message: t('projects.previewCancelled'), busy: false },
  };
  const state = loading
    ? { message: t('projects.previewLoading'), busy: true }
    : (states[status] ?? { message: t('projects.previewUnavailable'), busy: false });

  return (
    <div style={previewPlaceholderStyle}>
      {state.busy ? <Spin /> : <FileImageOutlined style={{ fontSize: 32 }} />}
      <Typography.Text type={status === 'failed' && !loading ? 'danger' : 'secondary'}>
        {state.message}
      </Typography.Text>
    </div>
  );
}

/**
 * Evaluation shows the original file at full quality. Formats the browser cannot display
 * (e.g. HEIC, TIFF, some video codecs) fall back to the watermarked preview.
 */
const MediaPreview = forwardRef<
  RenderedMediaPreviewHandle,
  { media: ProjectMedia; source: MediaSource }
>(function MediaPreview({ media, source }, ref) {
  const { t } = useTranslation();
  const [originalFailed, setOriginalFailed] = useState(false);

  useEffect(() => {
    setOriginalFailed(false);
  }, [media.id]);

  if (media.asset.assetType === 'video') {
    return <VideoMediaPreview key={media.id} ref={ref} media={media} source={source} />;
  }
  if (source === 'original' && !originalFailed) {
    return <OriginalMediaPreview media={media} onUnavailable={() => setOriginalFailed(true)} />;
  }
  return (
    <>
      {source === 'original' ? (
        <Alert
          type="warning"
          showIcon
          message={t('projects.originalUnavailable')}
          style={{ marginBottom: 8 }}
        />
      ) : null}
      <RenderedMediaPreview ref={ref} media={media} />
    </>
  );
});

/**
 * Previews a viewer is shown: without watermark when evaluating, watermarked otherwise. With
 * watermarking off (no watermarked preview exists) every preview is shown.
 */
function previewsFor(media: ProjectMedia, source: MediaSource): PreviewVariant[] {
  const variants = media.previewVariants ?? [];
  if (source === 'original') {
    return variants.filter((variant) => !variant.hasWatermark);
  }
  const watermarked = variants.filter((variant) => variant.hasWatermark);
  return watermarked.length > 0 ? watermarked : variants;
}

/** The original file as a player source, when it has been uploaded. */
function originalSource(media: ProjectMedia): VideoPlayerSource | null {
  if (['uploading', 'cancelled'].includes(media.asset.processingStatus)) {
    return null;
  }
  const bytes = Number(media.asset.fileSizeBytes ?? 0);
  return {
    variantCode: ORIGINAL_SOURCE_CODE,
    width: media.width,
    height: media.height,
    resolution: media.width && media.height ? Math.min(media.width, media.height) : null,
    hasWatermark: false,
    bitrateBps:
      bytes > 0 && media.durationSeconds ? Math.round((bytes * 8) / media.durationSeconds) : null,
  };
}

/**
 * Videos play in the custom player. Evaluating offers the original file (chosen first) and the
 * un-watermarked previews; viewing offers the watermarked previews. Each context remembers its
 * own quality choice.
 */
const VideoMediaPreview = forwardRef<
  RenderedMediaPreviewHandle,
  { media: ProjectMedia; source: MediaSource }
>(function VideoMediaPreview({ media, source }, ref) {
  const evaluating = source === 'original';
  const [failed, setFailed] = useState(false);
  // The media list is refetched while files process; only a change in what is offered may
  // reset the player's quality choice, not a new copy of the same media.
  const variantsKey = JSON.stringify(previewsFor(media, source));
  const originalKey = JSON.stringify(evaluating ? originalSource(media) : null);
  const variants = useMemo(() => JSON.parse(variantsKey) as PreviewVariant[], [variantsKey]);
  const original = useMemo(
    () => JSON.parse(originalKey) as VideoPlayerSource | null,
    [originalKey],
  );

  if (failed || (variants.length === 0 && !original)) {
    return <RenderedMediaPreview ref={ref} media={media} />;
  }
  return (
    <VideoPlayer
      ref={ref}
      assetId={media.assetId}
      variants={variants}
      original={original}
      qualityStorageKey={
        evaluating ? 'ag-go.media.videoQuality.evaluate' : 'ag-go.media.videoQuality.view'
      }
      defaultQuality={evaluating ? ORIGINAL_SOURCE_CODE : AUTO_QUALITY}
      onError={() => setFailed(true)}
    />
  );
});

function OriginalMediaPreview({
  media,
  onUnavailable,
}: {
  media: ProjectMedia;
  onUnavailable: () => void;
}) {
  const { t } = useTranslation();
  // The original exists as soon as the upload completed, before any render.
  const uploaded = !['uploading', 'cancelled'].includes(media.asset.processingStatus);
  const original = useQuery({
    queryKey: mediaQueryKeys.assetOriginalUrl(media.assetId),
    queryFn: () => getAssetOriginalUrl(media.assetId),
    enabled: uploaded,
    staleTime: ORIGINAL_URL_STALE_MS,
    gcTime: ORIGINAL_URL_STALE_MS * 2,
    retry: false,
  });

  useEffect(() => {
    if (original.isError) {
      onUnavailable();
    }
  }, [original.isError, onUnavailable]);

  if (!uploaded || !original.data) {
    return <PreviewPlaceholder status={media.asset.processingStatus} loading={uploaded} />;
  }

  return (
    <Flex vertical gap={8}>
      <Space size={4} wrap>
        <Tag color="gold">{t('projects.originalFile')}</Tag>
        <Typography.Text type="secondary">{formatResolution(media)}</Typography.Text>
        <Typography.Text type="secondary">
          {formatFileSize(media.asset.fileSizeBytes)}
        </Typography.Text>
      </Space>
      {media.asset.assetType === 'video' ? (
        <video
          controls
          preload="metadata"
          src={original.data}
          onError={onUnavailable}
          style={{
            background: '#000',
            display: 'block',
            maxHeight: 560,
            objectFit: 'contain',
            width: '100%',
          }}
        />
      ) : (
        <Image
          alt={media.asset.originalFilename}
          preview
          src={original.data}
          onError={onUnavailable}
          style={{ maxHeight: 560, objectFit: 'contain', width: '100%' }}
          wrapperStyle={{ display: 'block', textAlign: 'center' }}
        />
      )}
    </Flex>
  );
}

export type RenderedMediaPreviewHandle = VideoPlayerHandle;

/**
 * Watermarked previews of images (size picked for the frame), and the plain single preview of
 * videos the player cannot handle (older responses, or no playable source).
 */
const RenderedMediaPreview = forwardRef<RenderedMediaPreviewHandle, { media: ProjectMedia }>(
  function RenderedMediaPreview({ media }, ref) {
    const frameRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const isReady = media.asset.processingStatus === 'ready';
    const isVideo = media.asset.assetType === 'video';
    const variants = useMemo(
      () => (isVideo ? [] : previewsFor(media, 'preview')),
      [isVideo, media],
    );
    const { quality, autoVariant, selected, setQuality } = useRenditionSelection(
      variants,
      frameRef,
    );
    const selectedUrl = useAssetPreviewUrl(
      isReady && selected ? media.assetId : null,
      selected?.variantCode ?? 'preview',
    );
    // Older API responses without preview sizes still carry a single preview URL.
    const previewUrl = variants.length > 0 ? selectedUrl : (media.previewUrl ?? undefined);

    // Clicking an analysed keyframe seeks the plain video too.
    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = seconds;
        }
      },
    }));

    const content = !previewUrl ? (
      <PreviewPlaceholder status={media.asset.processingStatus} loading={isReady} />
    ) : isVideo ? (
      <video
        ref={videoRef}
        controls
        preload="metadata"
        src={previewUrl}
        style={{
          background: '#000',
          display: 'block',
          maxHeight: 560,
          objectFit: 'contain',
          width: '100%',
        }}
      />
    ) : (
      <Image
        alt={media.asset.originalFilename}
        preview
        src={previewUrl}
        style={{ maxHeight: 560, objectFit: 'contain', width: '100%' }}
        wrapperStyle={{ display: 'block', textAlign: 'center' }}
      />
    );

    return (
      <div ref={frameRef}>
        {content}
        {variants.length > 1 ? (
          <Flex justify="flex-end" style={{ marginTop: 8 }}>
            <RenditionPicker
              variants={variants}
              value={quality}
              autoVariant={autoVariant}
              isVideo={isVideo}
              onChange={setQuality}
            />
          </Flex>
        ) : null}
      </div>
    );
  },
);

function MediaThumbnail({ media }: { media: ProjectMedia }) {
  // The list response carries the un-watermarked thumbnail; fetch it only for older responses.
  const fetchedUrl = useAssetPreviewUrl(
    media.thumbnailUrl || media.asset.processingStatus !== 'ready' ? null : media.assetId,
  );
  const previewUrl = media.thumbnailUrl ?? fetchedUrl;
  const hasDuration = media.durationSeconds !== null && media.durationSeconds !== undefined;

  return (
    <div
      style={{
        borderRadius: 6,
        flexShrink: 0,
        height: 64,
        overflow: 'hidden',
        position: 'relative',
        width: 88,
      }}
    >
      {previewUrl ? (
        <Image
          alt=""
          height={64}
          preview={false}
          src={previewUrl}
          style={{ display: 'block', objectFit: 'cover' }}
          width={88}
        />
      ) : (
        <div
          style={{
            alignItems: 'center',
            background: '#f5f5f5',
            color: '#8c8c8c',
            display: 'flex',
            height: '100%',
            justifyContent: 'center',
          }}
        >
          {media.asset.assetType === 'image' ? <FileImageOutlined /> : <FileOutlined />}
        </div>
      )}
      {hasDuration ? (
        <span
          style={{
            background: 'rgba(0, 0, 0, 0.72)',
            borderRadius: 4,
            bottom: 4,
            color: '#fff',
            fontSize: 11,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: '16px',
            padding: '0 4px',
            position: 'absolute',
            right: 4,
          }}
        >
          {formatDuration(media.durationSeconds)}
        </span>
      ) : null}
    </div>
  );
}

const DETAILS_LABEL_WIDTH = 120;
/** Tab content scrolls at about the height of the file list, so long AI descriptions stay compact. */
const DETAILS_TAB_STYLE = {
  maxHeight: 'max(320px, calc(100vh - 470px))',
  overflowY: 'auto',
} as const;

function metadataNumber(metadata: Record<string, unknown>, key: string): number | null {
  const value = metadata[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function metadataString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === 'string' && value ? value : null;
}

/** The file metadata the footage drawer shows, from what the project media list carries. */
function fileInfoOf(
  media: ProjectMedia,
  analysis: AssetAnalysis | null | undefined,
): FootageFileInfo {
  const metadata = media.asset.sourceMetadata ?? {};
  const durationMs =
    media.durationSeconds !== null ? Math.round(media.durationSeconds * 1000) : null;
  const bytes = Number(media.asset.fileSizeBytes ?? 0);
  return {
    filename: media.asset.originalFilename,
    extension: media.asset.extension ?? null,
    mimeType: media.asset.mimeType,
    fileSizeBytes: media.asset.fileSizeBytes,
    width: media.width,
    height: media.height,
    durationMs,
    frameRate: metadataNumber(metadata, 'frameRate') ?? analysis?.media?.fps ?? null,
    codec: metadataString(metadata, 'codec'),
    format: metadataString(metadata, 'format'),
    bitrateBps:
      bytes > 0 && durationMs && durationMs > 0
        ? Math.round((bytes * 8) / (durationMs / 1000))
        : null,
    hasAudio: analysis?.media?.hasAudio ?? null,
    sourceType: media.asset.sourceType ?? 'local',
    uploadedAt: media.asset.createdAt ?? media.createdAt,
    uploadedBy: media.asset.createdBy ?? '',
    uploadedByUser: media.createdByUser ?? null,
    analyzedAt: analysis?.completedAt ?? null,
    analysisModel: null,
  };
}

function MediaDetails({
  media,
  canEvaluate,
  canManageAnalysis,
  retryLoading,
  onRetry,
}: {
  media: ProjectMedia;
  canEvaluate: boolean;
  canManageAnalysis: boolean;
  retryLoading: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [decision, setDecision] = useState<EvaluationDecision>();
  const [commentTouched, setCommentTouched] = useState(false);
  const commentValid = comment.trim().length >= MIN_COMMENT_LENGTH;
  const showCommentError = commentTouched && !commentValid;
  const evaluate = useMutation({
    mutationFn: (evaluationStatus: EvaluationDecision) =>
      updateProjectMedia(media.id, { evaluationStatus, comment: comment.trim() }),
    onSuccess: (_, evaluationStatus) => {
      setComment('');
      setDecision(undefined);
      setCommentTouched(false);
      void queryClient.invalidateQueries({ queryKey: mediaQueryKeys.evaluationHistory(media.id) });
      void queryClient.invalidateQueries({
        queryKey: mediaQueryKeys.projectReview(media.projectId),
      });
      void queryClient.invalidateQueries({ queryKey: mediaQueryKeys.project(media.projectId) });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(media.projectId) });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.list() });
      void message.success(
        t(
          evaluationStatus === 'approved'
            ? 'projects.evaluationApprovedSuccess'
            : 'projects.evaluationRejectedSuccess',
        ),
      );
    },
    onError: (error) => {
      void message.error(error instanceof Error ? error.message : t('projects.evaluationFailed'));
    },
  });

  useEffect(() => {
    setComment('');
    setDecision(undefined);
    setCommentTouched(false);
  }, [media.id]);

  const isVideo = media.asset.assetType === 'video';
  // Same query as the AI tab: audio and the analysis date come from the analysis.
  const analysis = useAssetAnalysis(media.assetId, isVideo);
  const fileInformation = (
    <FileInfoDescriptions
      file={fileInfoOf(media, analysis.data)}
      isVideo={isVideo}
      labelWidth={DETAILS_LABEL_WIDTH}
      extraRows={[
        {
          label: t('media.type'),
          value: (
            <Tag icon={isVideo ? <FileOutlined /> : <FileImageOutlined />}>
              {isVideo ? t('media.video') : t('media.image')}
            </Tag>
          ),
        },
        {
          label: t('media.status'),
          value: (
            <Flex vertical gap={4} align="flex-start">
              <span>{media.asset.processingStatus}</span>
              {media.asset.processingError ? (
                <Typography.Text type="danger">{media.asset.processingError}</Typography.Text>
              ) : null}
              {media.asset.processingStatus === 'failed' ? (
                <Button
                  icon={<ReloadOutlined />}
                  loading={retryLoading}
                  size="small"
                  onClick={onRetry}
                >
                  {t('media.retryProcessing')}
                </Button>
              ) : null}
            </Flex>
          ),
        },
        { label: t('media.caption'), value: media.caption || '-' },
      ]}
    />
  );

  return (
    <Card styles={{ body: { paddingTop: 0 } }}>
      {/* Uncontrolled, so the chosen tab stays while the reviewer moves between files. */}
      <Tabs
        items={[
          {
            key: 'file',
            label: t('projects.fileInformation'),
            children: <div style={DETAILS_TAB_STYLE}>{fileInformation}</div>,
          },
          {
            key: 'ai',
            label: t('footage.tabDescription'),
            children: (
              <div style={DETAILS_TAB_STYLE}>
                <MediaAiDescription media={media} canManage={canManageAnalysis} />
              </div>
            ),
          },
        ]}
      />
      {canEvaluate ? (
        <>
          <Divider />
          <Typography.Text strong>{t('projects.fileEvaluation')}</Typography.Text>
          <Flex vertical gap={8} style={{ marginTop: 12 }}>
            <Radio.Group
              disabled={evaluate.isPending}
              value={decision}
              onChange={(event) => setDecision(event.target.value as EvaluationDecision)}
            >
              <Radio value="approved">{t('projects.evaluationApproved')}</Radio>
              <Radio value="rejected">{t('projects.evaluationRejected')}</Radio>
            </Radio.Group>
            <div>
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 6 }}
                disabled={evaluate.isPending}
                placeholder={t('projects.evaluationCommentPlaceholder')}
                status={showCommentError ? 'error' : undefined}
                value={comment}
                onBlur={() => setCommentTouched(true)}
                onChange={(event) => {
                  setComment(event.target.value);
                  setCommentTouched(true);
                }}
              />
              {showCommentError ? (
                <Typography.Text type="danger" style={{ fontSize: 12 }}>
                  {t('projects.evaluationCommentMinLength', { min: MIN_COMMENT_LENGTH })}
                </Typography.Text>
              ) : null}
            </div>
            <Flex justify="flex-end">
              <Button
                disabled={!decision || !commentValid}
                loading={evaluate.isPending}
                type="primary"
                onClick={() => decision && evaluate.mutate(decision)}
              >
                {t('projects.review')}
              </Button>
            </Flex>
          </Flex>
        </>
      ) : null}
      <Divider />
      <MediaEvaluationHistory mediaId={media.id} />
    </Card>
  );
}

// ─── AI description tab ───────────────────────────────────────────────────────

/** Pause / resume / cancel / re-run of one video's analysis, for analysis managers. */
function AnalysisActions({ assetId, status }: { assetId: string; status: AnalysisStatus | null }) {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const pauseAsset = usePauseAssetAnalysis();
  const resumeAsset = useResumeAssetAnalysis();
  const cancelAsset = useCancelAssetAnalysis();
  const startAsset = useStartAssetAnalysis();
  const inFlight = !isTerminalStatus(status);

  const handleAction = async (fn: () => Promise<unknown>, successMsg: string) => {
    try {
      await fn();
      void message.success(successMsg);
    } catch (err) {
      void message.error(err instanceof Error ? err.message : t('analysis.reanalyseFailed'));
    }
  };

  if (!status) {
    return (
      <Button
        size="small"
        icon={<RotateCcw size={14} />}
        loading={startAsset.isPending}
        onClick={() =>
          void handleAction(
            () => startAsset.mutateAsync({ assetId }),
            t('analysis.reanalyseSuccess'),
          )
        }
      >
        {t('analysis.startScan')}
      </Button>
    );
  }

  return (
    <Space size={4}>
      {['queued', 'extracting', 'extracted', 'describing'].includes(status) ? (
        <Tooltip title={t('analysis.batchPause')}>
          <Button
            size="small"
            type="text"
            aria-label={t('analysis.batchPause')}
            icon={<Pause size={16} />}
            loading={pauseAsset.isPending}
            onClick={() =>
              void handleAction(
                () => pauseAsset.mutateAsync(assetId),
                t('analysis.batchPauseSuccess'),
              )
            }
          />
        </Tooltip>
      ) : null}
      {status === 'paused' ? (
        <Tooltip title={t('analysis.batchResume')}>
          <Button
            size="small"
            type="text"
            aria-label={t('analysis.batchResume')}
            icon={<Play size={16} />}
            loading={resumeAsset.isPending}
            onClick={() =>
              void handleAction(
                () => resumeAsset.mutateAsync(assetId),
                t('analysis.batchResumeSuccess'),
              )
            }
          />
        </Tooltip>
      ) : null}
      {inFlight ? (
        <Popconfirm
          title={t('analysis.batchCancel')}
          okText={t('analysis.batchCancel')}
          cancelText={t('common.cancel')}
          onConfirm={() =>
            void handleAction(
              () => cancelAsset.mutateAsync(assetId),
              t('analysis.batchCancelSuccess'),
            )
          }
        >
          <Tooltip title={t('analysis.batchCancel')}>
            <Button
              size="small"
              type="text"
              danger
              aria-label={t('analysis.batchCancel')}
              icon={<X size={16} />}
              loading={cancelAsset.isPending}
            />
          </Tooltip>
        </Popconfirm>
      ) : (
        // A new run is refused (409) while one is in flight
        <Tooltip title={t('analysis.reanalyse')}>
          <Button
            size="small"
            type="text"
            aria-label={t('analysis.reanalyse')}
            icon={<RotateCcw size={16} />}
            loading={startAsset.isPending}
            onClick={() =>
              void handleAction(
                () => startAsset.mutateAsync({ assetId }),
                t('analysis.reanalyseSuccess'),
              )
            }
          />
        </Tooltip>
      )}
    </Space>
  );
}

/** The AI description of a video, like the footage drawer, or what keeps it from showing. */
function MediaAiDescription({ media, canManage }: { media: ProjectMedia; canManage: boolean }) {
  const { t } = useTranslation();
  const isVideo = media.asset.assetType === 'video';
  const analysisQuery = useAssetAnalysis(media.assetId, isVideo);

  if (!isVideo) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('analysis.aiVideoOnly')} />;
  }
  if (analysisQuery.isPending) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <Spin size="small" />
      </div>
    );
  }
  if (analysisQuery.isError) {
    return <Alert type="error" showIcon message={analysisQuery.error.message} />;
  }

  const data: AssetAnalysis | null = analysisQuery.data;
  const status = data?.status ?? null;
  const inFlight = !isTerminalStatus(status);
  const actions = canManage ? <AnalysisActions assetId={media.assetId} status={status} /> : null;

  if (!data) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('analysis.aiNotScanned')}>
        {actions}
      </Empty>
    );
  }

  return (
    <Flex vertical gap={8}>
      <Flex align="center" justify="space-between" gap={8} wrap>
        <Space size={6}>
          <Tag color={analysisStatusColor(status)} style={{ marginInlineEnd: 0 }}>
            {t(`analysis.status.${data.status}`)}
          </Tag>
          {inFlight ? <Spin size="small" /> : null}
        </Space>
        {actions}
      </Flex>
      {data.error ? (
        <Typography.Text type="danger" style={{ fontSize: 12 }}>
          {data.error}
        </Typography.Text>
      ) : null}
      {data.description ? (
        <FootageDescription
          labelWidth={DETAILS_LABEL_WIDTH}
          description={{
            ...data.description,
            orientation: data.media?.orientation,
            hasAudio: data.media?.hasAudio,
            hasSpeech: data.technical?.hasSpeechHint,
          }}
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t(inFlight ? 'analysis.aiScanning' : 'analysis.aiNoDescription')}
        />
      )}
    </Flex>
  );
}

export function ProjectDetailDrawer({
  open,
  projectId,
  mode = 'view',
  onClose,
}: ProjectReviewDrawerProps) {
  const { t } = useTranslation();
  const { can, canAny } = usePermissions();
  const mediaSource: MediaSource =
    mode === 'evaluate' && canAny(ORIGINAL_PERMISSIONS) ? 'original' : 'preview';
  const canEvaluate = mode === 'evaluate' && can(GO_PERMISSIONS.PROJECT_EVALUATE);
  const { token } = theme.useToken();
  const { message } = AntApp.useApp();
  const [selectedMediaId, setSelectedMediaId] = useState<string>();
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [approveTarget, setApproveTarget] = useState<BulkApproveTarget>();
  const [downloadJobId, setDownloadJobId] = useState<string>();
  const [mediaSort, setMediaSort] = useState<ProjectMediaSort>(DEFAULT_PROJECT_MEDIA_SORT);
  const project = useQuery({
    queryKey: projectQueryKeys.detail(projectId ?? ''),
    queryFn: () => getProject(projectId ?? ''),
    enabled: open && Boolean(projectId),
  });
  const media = useInfiniteQuery({
    queryKey: mediaQueryKeys.projectReview(projectId ?? ''),
    queryFn: ({ pageParam }) =>
      getProjectMedia(projectId ?? '', {
        cursor: pageParam,
        limit: 100,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: open && Boolean(projectId),
  });
  const mediaItems = useMemo(
    () => media.data?.pages.flatMap((page) => page.items) ?? [],
    [media.data],
  );
  const sortedMediaItems = useMemo(
    () => sortProjectMedia(mediaItems, mediaSort),
    [mediaItems, mediaSort],
  );
  // Sorting needs every file, not only the pages loaded so far.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = media;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  // Files imported from Google Drive show up in the list while the import is running.
  useRefreshProjectMediaOnImportProgress(open ? (projectId ?? '') : '');
  const selectedMedia = mediaItems.find((item) => item.id === selectedMediaId) ?? mediaItems[0];
  const allMediaSelected =
    mediaItems.length > 0 && mediaItems.every((item) => selectedMediaIds.includes(item.id));
  const downloadJob = useQuery({
    queryKey: ['download', downloadJobId],
    queryFn: () => getDownload(downloadJobId ?? ''),
    enabled: Boolean(downloadJobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ['completed', 'failed', 'expired', 'cancelled'].includes(status)
        ? false
        : 3_000;
    },
  });
  const download = useMutation({
    mutationFn: createDownload,
    onSuccess: (result: DownloadResult) => {
      if (result.mode === 'single') {
        window.open(result.url, '_blank', 'noopener,noreferrer');
        return;
      }
      setDownloadJobId(result.downloadJobId);
      void message.success(t('projects.downloadJobCreated'));
    },
    onError: (error) => {
      void message.error(error instanceof Error ? error.message : t('projects.downloadFailed'));
    },
  });
  const retry = useMutation({
    mutationFn: () => retryAssetProcessing(selectedMedia?.asset.id ?? ''),
    onSuccess: () => {
      void media.refetch();
      void message.success(t('media.retryProcessingSuccess'));
    },
    onError: (error) => {
      void message.error(error instanceof Error ? error.message : t('media.retryProcessingFailed'));
    },
  });

  useEffect(() => {
    setSelectedMediaId((current) => {
      if (current && mediaItems.some((item) => item.id === current)) {
        return current;
      }
      return mediaItems[0]?.id;
    });
  }, [projectId, mediaItems]);

  const close = () => {
    setSelectedMediaId(undefined);
    setSelectedMediaIds([]);
    setDownloadJobId(undefined);
    onClose();
  };

  const requestDownload = (scope: 'multiple' | 'project') => {
    if (!projectId) {
      return;
    }
    if (scope === 'multiple' && selectedMediaIds.length === 0) {
      void message.warning(t('projects.selectAtLeastOneFile'));
      return;
    }
    download.mutate({
      scope,
      projectId,
      projectMediaIds: scope === 'multiple' ? selectedMediaIds : undefined,
      downloadType: 'original',
    });
  };

  return (
    <Drawer
      destroyOnClose
      height="100vh"
      open={open}
      placement="top"
      title={
        mode === 'evaluate'
          ? `${t('projects.review')} · ${project.data?.name ?? ''}`
          : (project.data?.name ?? t('projects.reviewTitle'))
      }
      width="100vw"
      onClose={close}
      extra={
        <Button
          icon={<ReloadOutlined />}
          loading={project.isFetching || media.isFetching}
          onClick={() => {
            void project.refetch();
            void media.refetch();
          }}
        >
          {t('common.refresh')}
        </Button>
      }
      styles={{ body: { overflow: 'auto', padding: 20, backgroundColor: token.colorBgLayout } }}
    >
      {project.isError ? <Alert type="error" showIcon message={project.error.message} /> : null}
      {project.isPending ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : null}
      {project.data ? (
        <>
          <ProjectOverviewCard project={project.data} />
          <Row gutter={[16, 16]} align="top" style={{ marginTop: 16 }}>
            <Col xs={24} lg={8} xl={6}>
              <Card
                title={
                  <Flex align="center" gap={8} style={{ minWidth: 0 }}>
                    <Typography.Text strong ellipsis style={{ minWidth: 0 }}>
                      {t('projects.reviewFiles')}
                    </Typography.Text>
                    <Tag bordered={false} style={{ flexShrink: 0, marginInlineEnd: 0 }}>
                      {t('media.fileCount', { count: mediaItems.length })}
                    </Tag>
                  </Flex>
                }
                styles={{ body: { padding: 0 } }}
              >
                <Flex
                  wrap
                  gap={8}
                  style={{
                    padding: '8px 12px',
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  }}
                >
                  <Checkbox
                    checked={allMediaSelected}
                    disabled={mediaItems.length === 0}
                    indeterminate={selectedMediaIds.length > 0 && !allMediaSelected}
                    style={{ alignSelf: 'center' }}
                    onChange={(event) =>
                      setSelectedMediaIds(
                        event.target.checked ? mediaItems.map((item) => item.id) : [],
                      )
                    }
                  >
                    {t('projects.bulkApproveSelectAll')}
                  </Checkbox>
                  {canEvaluate ? (
                    <Button
                      disabled={selectedMediaIds.length === 0}
                      icon={<CheckOutlined />}
                      size="small"
                      style={
                        selectedMediaIds.length > 0
                          ? { color: token.colorSuccess, borderColor: token.colorSuccess }
                          : undefined
                      }
                      onClick={() =>
                        setApproveTarget({ kind: 'media', mediaIds: selectedMediaIds })
                      }
                    >
                      {t('projects.bulkApprove')}
                      {selectedMediaIds.length > 0 ? ` (${selectedMediaIds.length})` : ''}
                    </Button>
                  ) : null}
                  <Button
                    icon={<DownloadOutlined />}
                    loading={download.isPending}
                    size="small"
                    onClick={() => requestDownload('multiple')}
                  >
                    {t('projects.downloadSelected')}
                    {selectedMediaIds.length > 0 ? ` (${selectedMediaIds.length})` : ''}
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    loading={download.isPending}
                    size="small"
                    type="primary"
                    onClick={() => requestDownload('project')}
                  >
                    {t('projects.downloadAll')}
                  </Button>
                  <ProjectMediaSortDropdown
                    size="small"
                    value={mediaSort}
                    onChange={setMediaSort}
                  />
                </Flex>
                <div
                  style={{
                    maxHeight: 'calc(100vh - 470px)',
                    overflowY: 'auto',
                    padding: 8,
                  }}
                >
                  {media.isError ? (
                    <Alert type="error" showIcon message={media.error.message} />
                  ) : null}
                  {mediaItems.length === 0 && !media.isPending ? (
                    <Empty description={t('media.empty')} />
                  ) : (
                    <List
                      dataSource={sortedMediaItems}
                      renderItem={(item) => {
                        const isSelected = item.id === selectedMedia?.id;
                        const status = getEvaluationStatus(item.evaluationStatus, t);
                        return (
                          <List.Item
                            style={{
                              background: isSelected ? token.colorPrimaryBg : undefined,
                              border: `1px solid ${isSelected ? token.colorPrimaryBorder : 'transparent'}`,
                              borderRadius: token.borderRadiusLG,
                              cursor: 'pointer',
                              marginBottom: 4,
                              padding: 8,
                              width: '100%',
                              boxSizing: 'border-box',
                            }}
                            onClick={() => setSelectedMediaId(item.id)}
                          >
                            <Flex align="center" gap={10} style={{ width: '100%', minWidth: 0 }}>
                              <Checkbox
                                checked={selectedMediaIds.includes(item.id)}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) => {
                                  setSelectedMediaIds((current) =>
                                    event.target.checked
                                      ? [...new Set([...current, item.id])]
                                      : current.filter((id) => id !== item.id),
                                  );
                                }}
                              />

                              <MediaThumbnail media={item} />

                              <Flex vertical gap={2} style={{ flex: 1, minWidth: 0 }}>
                                <Typography.Text
                                  strong
                                  ellipsis={{ tooltip: item.asset.originalFilename }}
                                >
                                  {item.asset.originalFilename}
                                </Typography.Text>

                                <Typography.Text
                                  type="secondary"
                                  ellipsis
                                  style={{ fontSize: token.fontSizeSM }}
                                >
                                  {formatResolution(item)} ·{' '}
                                  {formatDate(
                                    // Show the date the list is sorted by.
                                    mediaSort.sortBy === 'modifiedAt'
                                      ? projectMediaModifiedAt(item)
                                      : item.createdAt,
                                  )}
                                </Typography.Text>

                                <div>
                                  <Tag
                                    color={status.color}
                                    style={{ fontSize: token.fontSizeSM, marginInlineEnd: 0 }}
                                  >
                                    {status.label}
                                  </Tag>
                                </div>
                              </Flex>
                            </Flex>
                          </List.Item>
                        );
                      }}
                    />
                  )}
                  {media.hasNextPage ? (
                    <Button
                      block
                      type="dashed"
                      loading={media.isFetchingNextPage}
                      size="small"
                      style={{ marginTop: 4 }}
                      onClick={() => void media.fetchNextPage()}
                    >
                      {t('projects.loadMoreFiles')}
                    </Button>
                  ) : null}
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={10} xl={12}>
              <Card
                title={selectedMedia?.asset.originalFilename ?? t('projects.previewTitle')}
                styles={{ body: { background: '#fafafa', padding: 12 } }}
              >
                {selectedMedia ? (
                  <MediaPreview media={selectedMedia} source={mediaSource} />
                ) : (
                  <Empty description={t('projects.selectFileToPreview')} />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={6} xl={6}>
              {selectedMedia ? (
                <MediaDetails
                  media={selectedMedia}
                  canEvaluate={canEvaluate}
                  canManageAnalysis={can(GO_PERMISSIONS.ANALYSIS_MANAGE)}
                  retryLoading={retry.isPending}
                  onRetry={() => retry.mutate()}
                />
              ) : (
                <Empty description={t('projects.selectFileToPreview')} />
              )}
            </Col>
          </Row>
          <div style={{ marginTop: 16 }}>
            <ProjectImportHistoryCard
              projectId={project.data.id}
              scrollY={IMPORT_TABLE_SCROLL_Y}
              sticky={CONTAINER_TABLE_STICKY}
            />
          </div>
          <ProjectAuditLogCard projectId={project.data.id} enabled={open} />
          {downloadJobId ? (
            <Alert
              style={{ marginTop: 16 }}
              type={downloadJob.data?.status === 'failed' ? 'error' : 'info'}
              message={t('projects.downloadStatus', {
                status: downloadJob.data?.status ?? 'queued',
              })}
              description={
                downloadJob.data?.url ? (
                  <Button type="link" href={downloadJob.data.url} target="_blank">
                    {t('projects.openZipFile')}
                  </Button>
                ) : undefined
              }
            />
          ) : null}
        </>
      ) : null}
      <BulkApproveModal
        target={approveTarget}
        onClose={() => setApproveTarget(undefined)}
        onApproved={() => setSelectedMediaIds([])}
      />
    </Drawer>
  );
}

/** @deprecated Use ProjectDetailDrawer. Evaluation actions live in ProjectEvaluationDrawer. */
export const ProjectReviewDrawer = ProjectDetailDrawer;
