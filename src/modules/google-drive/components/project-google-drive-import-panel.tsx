import { DeleteOutlined } from '@ant-design/icons';
import { DrivePicker, DrivePickerDocsView } from '@googleworkspace/drive-picker-react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, List, Progress, Radio, Space, Table, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatFileSize } from '../../../shared/lib/format-file-size';
import { mediaQueryKeys } from '../../media/queries/media-query-keys';
import { projectQueryKeys } from '../../projects/queries/project-query-keys';
import type { DuplicatePolicy } from '../api/google-drive';
import {
  useCancelDriveImport,
  useCreateDriveImport,
  useDisconnectGoogleDrive,
  useDriveImport,
  useGoogleDriveConnection,
  useGoogleDrivePickerToken,
  useRetryDriveImportItem,
  useStartGoogleDriveConnection,
  useSummarizeGoogleDriveSources,
} from '../hooks/use-google-drive';

type PickedSource = {
  fileId: string;
  driveId?: string;
  name?: string;
  mimeType?: string;
  sizeBytes?: number | string;
};

type PickerDocument = {
  id: string;
  driveId?: string;
  name?: string;
  mimeType?: string;
  sizeBytes?: number | string;
  size?: number | string;
};

type PickerEvent = { detail?: { docs?: PickerDocument[] } };
type PickerMode = 'files' | 'folders';

function displayFilename(name: string, mimeType?: string | null): string {
  if (name.lastIndexOf('.') > 0) {
    return name;
  }
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mp4',
    'video/webm': 'webm',
  };
  const extension = mimeType ? extensions[mimeType.toLowerCase()] : undefined;
  return extension ? `${name}.${extension}` : name;
}

function importStatusLabel(status: string, t: (key: string) => string): string {
  const normalized = status.toLowerCase();
  return (
    {
      queued: t('googleDrive.status.queued'),
      importing: t('googleDrive.status.importing'),
      processing: t('googleDrive.status.processing'),
      completed: t('googleDrive.status.completed'),
      partial: t('googleDrive.status.partial'),
      partially_completed: t('googleDrive.status.partial'),
      failed: t('googleDrive.status.failed'),
      cancelled: t('googleDrive.status.cancelled'),
    }[normalized] ?? status
  );
}

function importStatusColor(status: string): string {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case 'completed':
      return 'success';
    case 'failed':
      return 'error';
    case 'cancelled':
      return 'default';
    case 'partial':
    case 'partially_completed':
      return 'warning';
    default:
      return 'processing';
  }
}

function formatDimensions(width: number | null, height: number | null): string {
  return width && height ? `${width} × ${height}` : '-';
}

function formatDuration(value: string | null): string {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '-';
  }
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString('vi-VN') : '-';
}

export function ProjectGoogleDriveImportPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<PickedSource[]>([]);
  const [duplicatePolicy, setDuplicatePolicy] = useState<DuplicatePolicy>('reuse_existing');
  const connection = useGoogleDriveConnection();
  const pickerToken = useGoogleDrivePickerToken(
    connection.data?.status === 'active' &&
    connection.data.scopes.some((scope) =>
      scope.includes('https://www.googleapis.com/auth/drive.readonly'),
    ),
  );
  const start = useStartGoogleDriveConnection();
  const disconnect = useDisconnectGoogleDrive();
  const createImport = useCreateDriveImport();
  const cancelImport = useCancelDriveImport();
  const retryItem = useRetryDriveImportItem();
  const summarizeSources = useSummarizeGoogleDriveSources();
  const [batchId, setBatchId] = useState<string>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>('folders');
  const [pickerError, setPickerError] = useState<string>();
  const batch = useDriveImport(batchId ?? '');
  const batchStatus = batch.data?.status;
  const batchCompletedItems = batch.data?.completedItems;
  const batchFailedItems = batch.data?.failedItems;
  useEffect(() => {
    if (!batchStatus) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: mediaQueryKeys.project(projectId) });
    void queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(projectId) });
    void queryClient.invalidateQueries({ queryKey: projectQueryKeys.list() });
  }, [batchCompletedItems, batchFailedItems, batchStatus, projectId, queryClient]);
  const selectedCounts = useMemo(
    () =>
      selected.reduce(
        (counts, source) => {
          if (source.mimeType === 'application/vnd.google-apps.folder') {
            counts.folderCount += 1;
          } else if (source.mimeType?.startsWith('video/')) {
            counts.videoCount += 1;
          } else if (source.mimeType?.startsWith('image/')) {
            counts.imageCount += 1;
          }
          return counts;
        },
        { imageCount: 0, videoCount: 0, folderCount: 0 },
      ),
    [selected],
  );

  const openPicker = (mode: PickerMode) => {
    if (pickerToken.data?.accessToken && connection.data?.status === 'active') {
      setPickerError(undefined);
      setPickerMode(mode);
      setPickerOpen(true);
    }
  };

  const hasPickerScope = Boolean(
    connection.data?.scopes.some((scope) =>
      scope.includes('https://www.googleapis.com/auth/drive.readonly'),
    ),
  );
  const isConnected = connection.data?.status === 'active' && hasPickerScope;

  const removeSelectedSource = (fileId: string) => {
    const nextSources = selected.filter((source) => source.fileId !== fileId);
    setSelected(nextSources);
    if (nextSources.length > 0) {
      summarizeSources.mutate({
        projectId,
        sources: nextSources.map((source) => ({
          fileId: source.fileId,
          driveId: source.driveId,
        })),
      });
    }
  };

  return (
    <Card
      title={t('googleDrive.importTitle')}
      extra={
        connection.data?.status === 'active' ? (
          <Button danger size="small" onClick={() => disconnect.mutate()}>
            {t('googleDrive.disconnect')}
          </Button>
        ) : null
      }
    >
      {!isConnected ? (
        <Button
          type="primary"
          loading={start.isPending}
          onClick={() =>
            start.mutate({
              projectId,
              returnUrl: `${window.location.pathname}${window.location.search}${window.location.hash}`,
            })
          }
        >
          {connection.data ? t('googleDrive.reconnect') : t('googleDrive.connect')}
        </Button>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          {!hasPickerScope ? (
            <Alert type="warning" showIcon message={t('googleDrive.scopeWarning')} />
          ) : null}
          {pickerToken.isError ? (
            <Alert
              type="error"
              showIcon
              message={pickerToken.error.message}
              description={t('googleDrive.expiredScopeDescription')}
            />
          ) : null}
          {pickerError ? <Alert type="error" showIcon message={pickerError} /> : null}
          <Typography.Text type="secondary">{t('googleDrive.selectPrompt')}</Typography.Text>
          <Button
            type="primary"
            disabled={!pickerToken.data?.accessToken}
            loading={pickerToken.isLoading}
            onClick={() => openPicker('folders')}
          >
            {t('googleDrive.selectFolders')}
          </Button>
          {pickerOpen ? (
            <DrivePicker
              {...({
                id: 'project-drive-picker',
                'app-id': import.meta.env.VITE_GOOGLE_PICKER_APP_ID,
                'client-id': import.meta.env.VITE_GOOGLE_PICKER_CLIENT_ID,
                'developer-key': import.meta.env.VITE_GOOGLE_PICKER_API_KEY,
                'oauth-token': pickerToken.data?.accessToken,
                scope: 'https://www.googleapis.com/auth/drive.readonly',
                'mine-only': false,
                origin: window.location.origin,
                'max-items': 100,
              } as Record<string, unknown>)}
              multiselect
              onCanceled={() => setPickerOpen(false)}
              onOauthError={() => {
                setPickerOpen(false);
                setPickerError(t('googleDrive.oauthError'));
              }}
              onOauthResponse={() => setPickerError(undefined)}
              onPicked={(event: PickerEvent) => {
                setPickerOpen(false);
                const pickedDocs = event.detail?.docs ?? [];
                const sources = pickedDocs
                  .filter(
                    (doc) =>
                      doc.mimeType === 'application/vnd.google-apps.folder' ||
                      doc.mimeType?.startsWith('image/') ||
                      doc.mimeType?.startsWith('video/'),
                  )
                  .map((doc) => ({
                    fileId: doc.id,
                    driveId: doc.driveId,
                    name: doc.name,
                    mimeType: doc.mimeType,
                    sizeBytes: doc.sizeBytes ?? doc.size,
                  }));
                if (sources.length < pickedDocs.length) {
                  setPickerError(t('googleDrive.invalidMediaWarning'));
                }
                setSelected(sources);
                summarizeSources.mutate({
                  projectId,
                  sources: sources.map((source) => ({
                    fileId: source.fileId,
                    driveId: source.driveId,
                  })),
                });
              }}
            >
              {pickerMode === 'files' ? (
                <>
                  <DrivePickerDocsView
                    {...({
                      'include-folders': 'false',
                      'select-folder-enabled': 'false',
                      'mime-types': 'image/*,video/*',
                      mode: 'GRID',
                      'view-id': 'DOCS',
                    } as Record<string, unknown>)}
                  />
                  <DrivePickerDocsView
                    {...({
                      'enable-drives': 'true',
                      'include-folders': 'false',
                      'select-folder-enabled': 'false',
                      'mime-types': 'image/*,video/*',
                      mode: 'GRID',
                      'view-id': 'DOCS',
                    } as Record<string, unknown>)}
                  />
                </>
              ) : (
                <>
                  <DrivePickerDocsView
                    {...({
                      'include-folders': 'true',
                      'select-folder-enabled': 'true',
                      'mime-types': 'application/vnd.google-apps.folder',
                      mode: 'GRID',
                      'view-id': 'FOLDERS',
                    } as Record<string, unknown>)}
                  />
                  <DrivePickerDocsView
                    {...({
                      'enable-drives': 'true',
                      'include-folders': 'true',
                      'select-folder-enabled': 'true',
                      'mime-types': 'application/vnd.google-apps.folder',
                      mode: 'GRID',
                      'view-id': 'FOLDERS',
                    } as Record<string, unknown>)}
                  />
                </>
              )}
            </DrivePicker>
          ) : null}
          {selected.length ? (
            <>
              {summarizeSources.isPending ? (
                <Alert type="info" showIcon message={t('googleDrive.scanningFolder')} />
              ) : summarizeSources.isError ? (
                <Alert
                  type="error"
                  showIcon
                  message={t('googleDrive.summarizeError')}
                  description={summarizeSources.error.message}
                />
              ) : summarizeSources.data ? (
                <>
                  <Alert
                    type="info"
                    showIcon
                    message={t('googleDrive.totalValidFiles', {
                      count: summarizeSources.data.fileCount,
                    })}
                    description={
                      <Space wrap>
                        <Tag color="blue">
                          {t('googleDrive.imageCount', { count: summarizeSources.data.imageCount })}
                        </Tag>
                        <Tag color="purple">
                          {t('googleDrive.videoCount', { count: summarizeSources.data.videoCount })}
                        </Tag>
                        <Tag>{formatFileSize(summarizeSources.data.totalBytes)}</Tag>
                        {summarizeSources.data.folderCount > 0 ? (
                          <Tag>
                            {t('googleDrive.folderCount', {
                              count: summarizeSources.data.folderCount,
                            })}
                          </Tag>
                        ) : null}
                        {summarizeSources.data.unsupportedCount > 0 ? (
                          <Typography.Text type="secondary">
                            {t('googleDrive.unsupportedIgnored', {
                              count: summarizeSources.data.unsupportedCount,
                            })}
                          </Typography.Text>
                        ) : null}
                      </Space>
                    }
                  />
                  {summarizeSources.data.duplicateCount > 0 ? (
                    <Alert
                      type="warning"
                      showIcon
                      message={t('googleDrive.duplicatesFound', {
                        count: summarizeSources.data.duplicateCount,
                      })}
                      description={
                        <Radio.Group
                          value={duplicatePolicy}
                          onChange={(event) => setDuplicatePolicy(event.target.value)}
                        >
                          <Space direction="vertical">
                            <Radio value="create_new">{t('googleDrive.createNew')}</Radio>
                            <Radio value="reuse_existing">{t('googleDrive.reuseExisting')}</Radio>
                            <Radio value="overwrite_existing">
                              {t('googleDrive.overwriteExisting')}
                            </Radio>
                          </Space>
                        </Radio.Group>
                      }
                    />
                  ) : null}
                </>
              ) : (
                <Space wrap>
                  <Tag color="blue">
                    {t('googleDrive.imagesSelected', { count: selectedCounts.imageCount })}
                  </Tag>
                  <Tag color="purple">
                    {t('googleDrive.videosSelected', { count: selectedCounts.videoCount })}
                  </Tag>
                  {selectedCounts.folderCount > 0 ? (
                    <Tag>
                      {t('googleDrive.foldersPendingScan', { count: selectedCounts.folderCount })}
                    </Tag>
                  ) : null}
                </Space>
              )}
              <List
                bordered
                size="small"
                dataSource={selected}
                renderItem={(source) => (
                  <List.Item
                    actions={[
                      <Button
                        key="remove"
                        type="text"
                        danger
                        aria-label={t('common.delete')}
                        icon={<DeleteOutlined />}
                        onClick={() => removeSelectedSource(source.fileId)}
                      />,
                    ]}
                  >
                    <Space>
                      <Tag>{source.mimeType?.startsWith('video/') ? 'Video' : 'Image/Folder'}</Tag>
                      <Typography.Text>
                        {displayFilename(source.name ?? source.fileId, source.mimeType)}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        {formatFileSize(source.sizeBytes)}
                      </Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
              <Button
                type="primary"
                loading={createImport.isPending || summarizeSources.isPending}
                disabled={summarizeSources.isPending || summarizeSources.isError}
                onClick={() =>
                  void createImport
                    .mutateAsync({
                      projectId,
                      sources: selected,
                      duplicatePolicy,
                      idempotencyKey: crypto.randomUUID(),
                    })
                    .then((created) => setBatchId(created.id))
                }
              >
                {t('googleDrive.importToProject')}
              </Button>
            </>
          ) : null}
          {batchId ? (
            <Card size="small" title={t('googleDrive.importProgress')} style={{ marginTop: 16 }}>
              <Progress
                percent={batch.data?.progressPercent ?? 0}
                status={
                  batch.data?.status === 'failed'
                    ? 'exception'
                    : batch.data?.status === 'completed'
                      ? 'success'
                      : 'active'
                }
              />
              <Space style={{ marginBottom: 8 }}>
                <Typography.Text>
                  {t('googleDrive.completedItems', {
                    completed: batch.data?.completedItems ?? 0,
                    total: batch.data?.totalItems ?? 0,
                  })}
                </Typography.Text>
                {batch.data ? (
                  <Tag color={importStatusColor(batch.data.status)}>
                    {importStatusLabel(batch.data.status, t)}
                  </Tag>
                ) : null}
                {batch.data && !['completed', 'failed', 'cancelled'].includes(batch.data.status) ? (
                  <Button
                    danger
                    size="small"
                    loading={cancelImport.isPending}
                    onClick={() => cancelImport.mutate(batchId)}
                  >
                    {t('googleDrive.cancelImport')}
                  </Button>
                ) : null}
              </Space>
              <Table
                size="small"
                rowKey="id"
                scroll={{ x: 860 }}
                pagination={false}
                dataSource={(batch.data?.items ?? []).filter((item) => {
                  const mime = item.sourceMimeType?.toLowerCase();
                  return mime !== 'application/vnd.google-apps.folder' && !mime?.includes('folder');
                })}
                columns={[
                  {
                    title: t('common.file'),
                    dataIndex: 'sourceName',
                    render: (name: string, item) => (
                      <Typography.Text ellipsis style={{ maxWidth: 220 }}>
                        {displayFilename(name, item.sourceMimeType)}
                      </Typography.Text>
                    ),
                  },
                  {
                    title: t('media.size'),
                    dataIndex: 'sourceSizeBytes',
                    render: (value: string | null) => formatFileSize(value),
                  },
                  {
                    title: t('media.resolution'),
                    render: (_, item) => formatDimensions(item.sourceWidth, item.sourceHeight),
                  },
                  {
                    title: t('media.duration'),
                    dataIndex: 'sourceDurationSeconds',
                    render: (value: string | null) => formatDuration(value),
                  },
                  // Tạm ẩn cột người tạo
                  {
                    title: t('projects.updatedAt'),
                    dataIndex: 'sourceModifiedAt',
                    render: (value: string | null) => formatDate(value),
                  },
                  {
                    title: t('common.status'),
                    dataIndex: 'status',
                    render: (value: string) => (
                      <Tag color={importStatusColor(value)}>{importStatusLabel(value, t)}</Tag>
                    ),
                  },
                  {
                    title: t('googleDrive.resolution'),
                    dataIndex: 'resolution',
                    render: (value: string | null) =>
                      value ? <Tag>{t(`googleDrive.resolutions.${value}`)}</Tag> : '-',
                  },
                  {
                    title: t('common.actions'),
                    render: (_, item) =>
                      item.status === 'failed' ? (
                        <Button
                          size="small"
                          loading={retryItem.isPending && retryItem.variables?.itemId === item.id}
                          onClick={() => retryItem.mutate({ batchId, itemId: item.id })}
                        >
                          {t('common.retry')}
                        </Button>
                      ) : null,
                  },
                ]}
              />
            </Card>
          ) : null}
        </Space>
      )}
    </Card>
  );
}
