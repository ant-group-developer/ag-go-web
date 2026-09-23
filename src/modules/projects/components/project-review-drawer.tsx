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
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Image,
  List,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getProjectAudit, type AuditLog } from '../../audit/api/audit';
import { createDownload, getDownload, type DownloadResult } from '../../downloads/api/downloads';
import {
  getAssetPreviewUrl,
  getProjectMedia,
  getProjectMediaEvaluationHistory,
  retryAssetProcessing,
  type ProjectMedia,
  type ProjectMediaEvaluation,
} from '../../media/api/media';
import { mediaQueryKeys } from '../../media/queries/media-query-keys';
import { getProject } from '../api/projects';
import { projectQueryKeys } from '../queries/project-query-keys';
import type { Project } from '../types/project.type';

type ProjectReviewDrawerProps = {
  open: boolean;
  projectId?: string;
  onClose: () => void;
};

function formatDateTime(value: string | undefined): string {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatFileSize(value: string | undefined): string {
  const bytes = Number(value ?? 0);
  if (!bytes) {
    return '—';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** unitIndex).toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDuration(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
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
  return media.width && media.height ? `${media.width} × ${media.height}` : '—';
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

function MediaPreview({ media }: { media: ProjectMedia }) {
  const { t } = useTranslation();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const isReady = media.asset.processingStatus === 'ready';

  useEffect(() => {
    if (media.previewUrl) {
      setPreviewUrl(media.previewUrl);
      return undefined;
    }
    if (!isReady) {
      setPreviewUrl(undefined);
      return undefined;
    }

    let disposed = false;
    void getAssetPreviewUrl(media.assetId, 'preview')
      .then((url) => {
        if (disposed) {
          return;
        }
        setPreviewUrl(url);
      })
      .catch(() => setPreviewUrl(undefined));

    return () => {
      disposed = true;
    };
  }, [isReady, media.assetId, media.previewUrl]);

  if (!previewUrl) {
    return (
      <div
        style={{
          alignItems: 'center',
          background: '#f5f5f5',
          color: '#8c8c8c',
          display: 'flex',
          minHeight: 420,
          justifyContent: 'center',
        }}
      >
        {isReady ? <Spin size="small" /> : t('projects.previewUnavailable')}
      </div>
    );
  }

  if (media.asset.assetType === 'video') {
    return (
      <video
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
    );
  }

  return (
    <Image
      alt={media.asset.originalFilename}
      preview
      src={previewUrl}
      style={{ maxHeight: 560, objectFit: 'contain', width: '100%' }}
      wrapperStyle={{ display: 'block', textAlign: 'center' }}
    />
  );
}

function MediaThumbnail({ media }: { media: ProjectMedia }) {
  const [previewUrl, setPreviewUrl] = useState<string>();

  useEffect(() => {
    if (media.asset.processingStatus !== 'ready') {
      setPreviewUrl(undefined);
      return undefined;
    }

    let disposed = false;
    void getAssetPreviewUrl(media.assetId)
      .then((url) => {
        if (disposed) {
          return;
        }
        setPreviewUrl(url);
      })
      .catch(() => setPreviewUrl(undefined));

    return () => {
      disposed = true;
    };
  }, [media.asset.processingStatus, media.assetId]);

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
          {[project.countryName, project.provinceName].filter(Boolean).join(' / ') || '—'}
        </Descriptions.Item>
        <Descriptions.Item label={t('projects.category')}>
          {project.categoryName || '—'}
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
          <Typography.Text type="secondary">—</Typography.Text>
        )}
        <Typography.Text type="secondary">
          {t('projects.ownerUserId')}: {project.ownerUserId || '—'}
        </Typography.Text>
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
        {project.description || '—'}
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
        <Descriptions.Item label={t('media.caption')}>{media.caption || '—'}</Descriptions.Item>
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
                    <Typography.Text>{item.comment || '—'}</Typography.Text>
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

export function ProjectDetailDrawer({ open, projectId, onClose }: ProjectReviewDrawerProps) {
  const { t } = useTranslation();
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
      void message.success('Đã tạo download job');
    },
    onError: (error) => {
      void message.error(error instanceof Error ? error.message : 'Không thể tạo download');
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
      void message.warning('Hãy chọn ít nhất một file');
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
      title={project.data?.name ?? t('projects.reviewTitle')}
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
      styles={{ body: { overflow: 'auto', padding: 20 } }}
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
                      Tải file đã chọn
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      loading={download.isPending}
                      size="small"
                      type="primary"
                      onClick={() => requestDownload('project')}
                    >
                      Tải toàn bộ
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
                          }}
                          onClick={() => setSelectedMediaId(item.id)}
                        >
                          <List.Item.Meta
                            avatar={<MediaThumbnail media={item} />}
                            description={
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
                            }
                            title={
                              <Space>
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
                                  ellipsis
                                  style={{ display: 'block', maxWidth: 180 }}
                                >
                                  {item.asset.originalFilename}
                                </Typography.Text>
                              </Space>
                            }
                          />
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
                  <MediaPreview media={selectedMedia} />
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
          <Card title="Audit log" style={{ marginTop: 16 }}>
            {audit.isError ? <Alert type="error" message="Không thể tải audit log" /> : null}
            <List
              dataSource={audit.data?.items ?? []}
              loading={audit.isPending}
              locale={{ emptyText: 'Chưa có audit log' }}
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
              message={`Download: ${downloadJob.data?.status ?? 'queued'}`}
              description={
                downloadJob.data?.url ? (
                  <Button type="link" href={downloadJob.data.url} target="_blank">
                    Mở file ZIP
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
