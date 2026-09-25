import {
  DownloadOutlined,
  FileImageOutlined,
  FileOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  App as AntApp,
  Avatar,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Flex,
  Image,
  List,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
  theme,
} from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../account/hooks/use-current-account';
import { getProjectAudit, type AuditLog } from '../../audit/api/audit';
import { createDownload, getDownload, type DownloadResult } from '../../downloads/api/downloads';
import {
  getAssetOriginalUrl,
  getProjectMedia,
  getProjectMediaEvaluationHistory,
  retryAssetProcessing,
  type ProjectMedia,
  type ProjectMediaEvaluation,
} from '../../media/api/media';
import { RenditionPicker } from '../../media/components/rendition-picker';
import { useAssetPreviewUrl } from '../../media/hooks/use-asset-preview-url';
import { useRenditionSelection } from '../../media/hooks/use-rendition-selection';
import { mediaQueryKeys } from '../../media/queries/media-query-keys';
import { getProject } from '../api/projects';
import { projectQueryKeys } from '../queries/project-query-keys';
import type { Project } from '../types/project.type';

/** 'evaluate' shows the original files; 'view' shows the watermarked previews. */
export type ProjectDrawerMode = 'view' | 'evaluate';

type MediaSource = 'preview' | 'original';

const ORIGINAL_URL_STALE_MS = 5 * 60 * 1000;
const ORIGINAL_PERMISSIONS = ['go.project.evaluate', 'go.project.download_original'];

type ProjectReviewDrawerProps = {
  open: boolean;
  projectId?: string;
  mode?: ProjectDrawerMode;
  onClose: () => void;
};

function formatDateTime(value: string | undefined): string {
  if (!value) {
    return '-';
  }
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

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

function getProjectStatus(status: string, t: (key: string) => string) {
  const statuses: Record<string, { color: string; label: string }> = {
    draft: { color: 'default', label: t('projects.statusDraft') },
    pending: { color: 'processing', label: t('projects.statusPending') },
    completed: { color: 'success', label: t('projects.statusCompleted') },
    partially_completed: {
      color: 'warning',
      label: t('projects.statusPartiallyCompleted'),
    },
    failed: { color: 'error', label: t('projects.statusFailed') },
  };
  return statuses[status] ?? { color: 'default', label: status };
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
  minHeight: 420,
  justifyContent: 'center',
} as const;

/**
 * Evaluation shows the original file at full quality. Formats the browser cannot display
 * (e.g. HEIC, TIFF, some video codecs) fall back to the watermarked preview.
 */
function MediaPreview({ media, source }: { media: ProjectMedia; source: MediaSource }) {
  const { t } = useTranslation();
  const [originalFailed, setOriginalFailed] = useState(false);

  useEffect(() => {
    setOriginalFailed(false);
  }, [media.id]);

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
      <RenderedMediaPreview media={media} />
    </>
  );
}

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
    return (
      <div style={previewPlaceholderStyle}>
        {uploaded ? <Spin size="small" /> : t('projects.previewUnavailable')}
      </div>
    );
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

function RenderedMediaPreview({ media }: { media: ProjectMedia }) {
  const { t } = useTranslation();
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Playback position survives switching to another size (manually or when the frame resizes).
  const playbackRef = useRef({ time: 0, playing: false });
  const isReady = media.asset.processingStatus === 'ready';
  const isVideo = media.asset.assetType === 'video';
  const variants = useMemo(() => media.previewVariants ?? [], [media.previewVariants]);
  const { quality, autoVariant, selected, setQuality } = useRenditionSelection(variants, frameRef);
  const selectedUrl = useAssetPreviewUrl(
    isReady && selected ? media.assetId : null,
    selected?.variantCode ?? 'preview',
  );
  // Older API responses without preview sizes still carry a single preview URL.
  const previewUrl = variants.length > 0 ? selectedUrl : (media.previewUrl ?? undefined);

  useEffect(() => {
    playbackRef.current = { time: 0, playing: false };
  }, [media.id]);

  const content = !previewUrl ? (
    <div style={previewPlaceholderStyle}>
      {isReady ? <Spin size="small" /> : t('projects.previewUnavailable')}
    </div>
  ) : isVideo ? (
    <video
      ref={videoRef}
      controls
      preload="metadata"
      src={previewUrl}
      onTimeUpdate={(event) => {
        playbackRef.current.time = event.currentTarget.currentTime;
      }}
      onPlay={() => {
        playbackRef.current.playing = true;
      }}
      onPause={() => {
        playbackRef.current.playing = false;
      }}
      onLoadedMetadata={(event) => {
        const video = event.currentTarget;
        const { time, playing } = playbackRef.current;
        if (time > 0) {
          video.currentTime = time;
        }
        if (playing) {
          void video.play().catch(() => undefined);
        }
      }}
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
}

function MediaThumbnail({ media }: { media: ProjectMedia }) {
  // The list response carries the un-watermarked thumbnail; fetch it only for older responses.
  const fetchedUrl = useAssetPreviewUrl(
    media.thumbnailUrl || media.asset.processingStatus !== 'ready' ? null : media.assetId,
  );
  const previewUrl = media.thumbnailUrl ?? fetchedUrl;

  return previewUrl ? (
    <Image
      alt=""
      height={64}
      preview={false}
      src={previewUrl}
      style={{ objectFit: 'cover' }}
      width={88}
    />
  ) : (
    <div
      style={{
        alignItems: 'center',
        background: '#f5f5f5',
        color: '#8c8c8c',
        display: 'flex',
        height: 64,
        justifyContent: 'center',
        width: 88,
      }}
    >
      {media.asset.assetType === 'image' ? <FileImageOutlined /> : <FileOutlined />}
    </div>
  );
}

function ProjectOverview({ project }: { project: Project }) {
  const { t } = useTranslation();
  const status = getProjectStatus(project.evaluationStatus, t);

  return (
    <Card title={t('projects.projectInformation')} size="small" styles={{ body: { padding: 12 } }}>
      <Descriptions column={{ xs: 1, sm: 2, md: 3, xl: 6 }} size="small" bordered>
        <Descriptions.Item label={t('projects.name')}>{project.name}</Descriptions.Item>
        <Descriptions.Item label={t('projects.status')}>
          <Tag color={status.color}>{status.label}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label={t('projects.folder')}>
          {project.folderPath || project.folderId}
        </Descriptions.Item>
        <Descriptions.Item label={t('projects.location')}>
          {[project.countryName, project.provinceName].filter(Boolean).join(' / ') || '-'}
        </Descriptions.Item>
        <Descriptions.Item label={t('projects.category')}>
          {project.categoryName || '-'}
        </Descriptions.Item>
        <Descriptions.Item label={t('projects.fileCounts')}>
          <Space wrap>
            <Tag color="blue">
              {project.imageCount} {t('media.image')}
            </Tag>
            <Tag color="purple">
              {project.videoCount} {t('media.video')}
            </Tag>
          </Space>
        </Descriptions.Item>
      </Descriptions>
      <Space size={[8, 4]} style={{ marginTop: 8 }} wrap>
        <Typography.Text type="secondary">{t('projects.tags')}:</Typography.Text>
        {project.tags?.length ? (
          project.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)
        ) : (
          <Typography.Text type="secondary">-</Typography.Text>
        )}
        <Space size={4}>
          <Avatar size={18} src={project.ownerUser?.avatar}>
            {project.ownerUser?.name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Typography.Text type="secondary">
            {t('common.author')}:{' '}
            {project.ownerUser?.name || project.ownerUser?.email || t('common.unknown')}
          </Typography.Text>
        </Space>
        <Typography.Text type="secondary">
          {t('projects.createdAt')}: {formatDateTime(project.createdAt)}
        </Typography.Text>
        <Typography.Text type="secondary">
          {t('projects.updatedAt')}: {formatDateTime(project.updatedAt)}
        </Typography.Text>
        <Typography.Text type="secondary">
          {t('projects.originalSize')}: {formatFileSize(project.originalBytes)}
        </Typography.Text>
        <Typography.Text type="secondary">
          {t('projects.renderedSize')}: {formatFileSize(project.renderedBytes)}
        </Typography.Text>
      </Space>
      <Typography.Paragraph
        ellipsis={{ rows: 2, expandable: true, symbol: t('common.viewMore') }}
        style={{ margin: '8px 0 0' }}
      >
        <Typography.Text type="secondary">{t('projects.description')}: </Typography.Text>
        {project.description || '-'}
      </Typography.Paragraph>
    </Card>
  );
}

function MediaDetails({
  media,
  retryLoading,
  onRetry,
}: {
  media: ProjectMedia;
  retryLoading: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const evaluation = getEvaluationStatus(media.evaluationStatus, t);
  const history = useQuery({
    queryKey: mediaQueryKeys.evaluationHistory(media.id),
    queryFn: () => getProjectMediaEvaluationHistory(media.id),
  });

  return (
    <Card title={t('projects.fileInformation')} size="small">
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label={t('media.filename')}>
          {media.asset.originalFilename}
        </Descriptions.Item>
        <Descriptions.Item label={t('media.type')}>
          <Tag icon={media.asset.assetType === 'image' ? <FileImageOutlined /> : <FileOutlined />}>
            {media.asset.assetType === 'image' ? t('media.image') : t('media.video')}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label={t('media.fileSize')}>
          {formatFileSize(media.asset.fileSizeBytes)}
        </Descriptions.Item>
        <Descriptions.Item label={t('media.duration')}>
          {formatDuration(media.durationSeconds)}
        </Descriptions.Item>
        <Descriptions.Item label={t('media.resolution')}>
          {formatResolution(media)}
        </Descriptions.Item>
        <Descriptions.Item label={t('media.uploadedAt')}>
          {formatDateTime(media.createdAt)}
        </Descriptions.Item>
        <Descriptions.Item label={t('media.mimeType')}>{media.asset.mimeType}</Descriptions.Item>
        <Descriptions.Item label={t('media.status')}>
          {media.asset.processingStatus}
        </Descriptions.Item>
        {media.asset.processingError ? (
          <Descriptions.Item label={t('media.status')}>
            <Typography.Text type="danger">{media.asset.processingError}</Typography.Text>
          </Descriptions.Item>
        ) : null}
        {media.asset.processingStatus === 'failed' ? (
          <Descriptions.Item label={t('media.actions')}>
            <Button icon={<ReloadOutlined />} loading={retryLoading} size="small" onClick={onRetry}>
              {t('media.retryProcessing')}
            </Button>
          </Descriptions.Item>
        ) : null}
        <Descriptions.Item label={t('media.caption')}>{media.caption || '-'}</Descriptions.Item>
      </Descriptions>
      <Divider />
      <Typography.Text strong>{t('projects.fileEvaluation')}</Typography.Text>
      <div style={{ marginTop: 12 }}>
        <Tag color={evaluation.color}>{evaluation.label}</Tag>
      </div>
      <Divider />
      <Typography.Text strong>{t('projects.evaluationHistory')}</Typography.Text>
      <List
        dataSource={history.data ?? []}
        loading={history.isPending}
        locale={{ emptyText: t('projects.noEvaluationHistory') }}
        renderItem={(item: ProjectMediaEvaluation) => {
          const itemStatus = getEvaluationStatus(item.evaluationStatus, t);
          return (
            <List.Item>
              <List.Item.Meta
                description={
                  <Space direction="vertical" size={2}>
                    <Typography.Text>{item.comment || '-'}</Typography.Text>
                    <Typography.Text type="secondary">
                      {item.evaluatedBy} · {formatDateTime(item.createdAt)}
                    </Typography.Text>
                  </Space>
                }
                title={<Tag color={itemStatus.color}>{itemStatus.label}</Tag>}
              />
            </List.Item>
          );
        }}
        size="small"
      />
    </Card>
  );
}

export function ProjectDetailDrawer({
  open,
  projectId,
  mode = 'view',
  onClose,
}: ProjectReviewDrawerProps) {
  const { t } = useTranslation();
  const { canAny } = usePermissions();
  const mediaSource: MediaSource =
    mode === 'evaluate' && canAny(ORIGINAL_PERMISSIONS) ? 'original' : 'preview';
  const { token } = theme.useToken();
  const { message } = AntApp.useApp();
  const [selectedMediaId, setSelectedMediaId] = useState<string>();
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [downloadJobId, setDownloadJobId] = useState<string>();
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
  const selectedMedia = mediaItems.find((item) => item.id === selectedMediaId) ?? mediaItems[0];
  const audit = useQuery({
    queryKey: ['audit', 'project', projectId],
    queryFn: () => getProjectAudit(projectId ?? ''),
    enabled: open && Boolean(projectId),
  });
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
          <ProjectOverview project={project.data} />
          <Divider />
          <Row gutter={[16, 16]} align="top">
            <Col xs={24} lg={8} xl={6}>
              <Card
                title={t('projects.reviewFiles')}
                extra={
                  <Space>
                    <Tag>{t('media.fileCount', { count: mediaItems.length })}</Tag>
                    <Button
                      icon={<DownloadOutlined />}
                      loading={download.isPending}
                      size="small"
                      onClick={() => requestDownload('multiple')}
                    >
                      {t('projects.downloadSelected')}
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
                    {media.hasNextPage ? (
                      <Button
                        loading={media.isFetchingNextPage}
                        size="small"
                        onClick={() => void media.fetchNextPage()}
                      >
                        {t('projects.loadMoreFiles')}
                      </Button>
                    ) : null}
                  </Space>
                }
                styles={{
                  body: {
                    maxHeight: 'calc(100vh - 430px)',
                    overflowY: 'auto',
                    padding: 8,
                  },
                }}
              >
                {media.isError ? (
                  <Alert type="error" showIcon message={media.error.message} />
                ) : null}
                {mediaItems.length === 0 && !media.isPending ? (
                  <Empty description={t('media.empty')} />
                ) : (
                  <List
                    dataSource={mediaItems}
                    renderItem={(item) => {
                      const isSelected = item.id === selectedMedia?.id;
                      const status = getEvaluationStatus(item.evaluationStatus, t);
                      return (
                        <List.Item
                          style={{
                            background: isSelected ? '#e6f4ff' : undefined,
                            borderRadius: 6,
                            cursor: 'pointer',
                            marginBottom: 4,
                            padding: 8,
                            width: '100%',
                            boxSizing: 'border-box',
                          }}
                          onClick={() => setSelectedMediaId(item.id)}
                        >
                          <Flex
                            gap={8}
                            align="start"
                            style={{
                              width: '100%',
                              minWidth: 0,
                            }}
                          >
                            {/* Thumbnail */}
                            <div
                              style={{
                                flexShrink: 0,
                              }}
                            >
                              <MediaThumbnail media={item} />
                            </div>

                            {/* Content */}
                            <Flex
                              vertical
                              gap={4}
                              style={{
                                flex: 1,
                                minWidth: 0,
                                width: 0,
                              }}
                            >
                              {/* Filename */}
                              <Flex
                                align="center"
                                gap={8}
                                style={{
                                  width: '100%',
                                  minWidth: 0,
                                }}
                              >
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

                                <Typography.Text
                                  ellipsis={{ tooltip: item.asset.originalFilename }}
                                  style={{
                                    flex: 1,
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    fontWeight: 700,
                                  }}
                                >
                                  {item.asset.originalFilename}
                                </Typography.Text>
                              </Flex>

                              {/* Metadata */}
                              <Space size={4} wrap>
                                <Typography.Text type="secondary">
                                  {formatDuration(item.durationSeconds)}
                                </Typography.Text>

                                <Typography.Text type="secondary">
                                  {formatResolution(item)}
                                </Typography.Text>

                                <Typography.Text type="secondary">
                                  {formatDateTime(item.createdAt)}
                                </Typography.Text>

                                <Tag color={status.color}>{status.label}</Tag>
                              </Space>
                            </Flex>
                          </Flex>
                        </List.Item>
                      );
                    }}
                  />
                )}
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
                  retryLoading={retry.isPending}
                  onRetry={() => retry.mutate()}
                />
              ) : (
                <Empty description={t('projects.selectFileToPreview')} />
              )}
            </Col>
          </Row>
          <Card title={t('projects.auditLog')} style={{ marginTop: 16 }}>
            {audit.isError ? <Alert type="error" message={t('projects.auditLogError')} /> : null}
            <List
              dataSource={audit.data?.items ?? []}
              loading={audit.isPending}
              locale={{ emptyText: t('projects.auditLogEmpty') }}
              renderItem={(item: AuditLog) => (
                <List.Item>
                  <List.Item.Meta
                    title={<Tag>{item.action}</Tag>}
                    description={`${item.actorUser?.name ?? item.actorUser?.email ?? item.actorUserId} · ${formatDateTime(item.createdAt)}`}
                  />
                </List.Item>
              )}
            />
          </Card>
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
    </Drawer>
  );
}

/** @deprecated Use ProjectDetailDrawer. Evaluation actions live in ProjectEvaluationDrawer. */
export const ProjectReviewDrawer = ProjectDetailDrawer;
