import {
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseCircleFilled,
  DeleteOutlined,
  FileImageOutlined,
  InboxOutlined,
  LoadingOutlined,
  ReloadOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UploadFile, UploadProps } from 'antd';
import {
  Alert,
  App as AntApp,
  Avatar,
  Button,
  Card,
  Image,
  Progress,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../shared/lib/format-date';
import { formatFileSize } from '../../../shared/lib/format-file-size';
import { projectQueryKeys } from '../../projects/queries/project-query-keys';
import {
  abortUpload,
  completeUpload,
  createUploadSession,
  getAllProjectMedia,
  removeProjectMedia,
  uploadAssetContent,
  type ProjectMedia,
} from '../api/media';
import { mediaQueryKeys } from '../queries/media-query-keys';

type ProjectMediaUploadFile = UploadFile<ProjectMedia>;
type UploadTaskStatus = 'queued' | 'uploading' | 'done' | 'error';
type UploadTask = {
  uid: string;
  run: () => Promise<void>;
};

const MAX_CONCURRENT_UPLOADS = 3;

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

function formatDimensions(
  width: number | null | undefined,
  height: number | null | undefined,
): string {
  return width && height ? `${width} × ${height}` : '-';
}

function formatDuration(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '-';
  }
  const total = Math.round(value);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

type ProjectMediaPanelProps = {
  projectId: string;
};

export function ProjectMediaPanel({ projectId }: ProjectMediaPanelProps) {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const queryClient = useQueryClient();
  const uploadQueueRef = useRef<UploadTask[]>([]);
  const activeUploadsRef = useRef(0);
  const taskStatusesRef = useRef<Record<string, UploadTaskStatus>>({});
  // Upload uid -> project media id, so finished uploads are replaced by their server row.
  const uploadedMediaIdsRef = useRef(new Map<string, string>());
  const [fileList, setFileList] = useState<ProjectMediaUploadFile[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<Record<string, UploadTaskStatus>>({});
  const media = useQuery({
    queryKey: mediaQueryKeys.project(projectId),
    queryFn: () => getAllProjectMedia(projectId),
    enabled: Boolean(projectId),
  });
  const items = media.data?.items;
  const serverFileList = useMemo<ProjectMediaUploadFile[]>(
    () =>
      (items ?? []).map((item) => ({
        uid: item.id,
        name: displayFilename(item.asset.originalFilename, item.asset.mimeType),
        status: 'done',
        percent: 100,
        response: item,
        // The list shows the un-watermarked thumbnail (image or video frame).
        ...(item.thumbnailUrl ? { thumbUrl: item.thumbnailUrl } : {}),
      })),
    [items],
  );

  const updateTaskStatus = useCallback((uid: string, status: UploadTaskStatus) => {
    taskStatusesRef.current = { ...taskStatusesRef.current, [uid]: status };
    setTaskStatuses(taskStatusesRef.current);
  }, []);

  const invalidateProjectData = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: mediaQueryKeys.project(projectId) });
    void queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(projectId) });
    void queryClient.invalidateQueries({ queryKey: projectQueryKeys.list() });
  }, [projectId, queryClient]);

  const runUploadQueue = useCallback(() => {
    while (activeUploadsRef.current < MAX_CONCURRENT_UPLOADS && uploadQueueRef.current.length > 0) {
      const task = uploadQueueRef.current.shift();
      if (!task) {
        return;
      }

      activeUploadsRef.current += 1;
      updateTaskStatus(task.uid, 'uploading');
      void task.run().finally(() => {
        activeUploadsRef.current -= 1;
        runUploadQueue();
      });
    }
  }, [updateTaskStatus]);

  useEffect(() => {
    const serverMediaIds = new Set((items ?? []).map((item) => item.id));
    setFileList((current) => {
      const pendingOrFailedFiles = current.filter((file) => {
        const mediaId = file.response?.id ?? uploadedMediaIdsRef.current.get(file.uid) ?? file.uid;
        return file.status !== 'done' || !serverMediaIds.has(mediaId);
      });
      const serverUids = new Set(serverFileList.map((file) => file.uid));
      return [
        ...serverFileList,
        ...pendingOrFailedFiles.filter((file) => !serverUids.has(file.uid)),
      ];
    });
  }, [items, serverFileList]);

  const customRequest: NonNullable<UploadProps['customRequest']> = (options) => {
    const uid = (options.file as UploadFile).uid;
    updateTaskStatus(uid, 'queued');
    uploadQueueRef.current.push({
      uid,
      run: async () => {
        const file = options.file as File;
        const assetType = file.type.startsWith('video/') ? 'video' : 'image';
        let session: Awaited<ReturnType<typeof createUploadSession>> | undefined;
        let uploadCompleted = false;

        try {
          session = await createUploadSession(
            {
              assetType,
              originalFilename: file.name,
              mimeType: file.type || 'application/octet-stream',
              fileSizeBytes: file.size,
              targetProjectId: projectId,
            },
            globalThis.crypto.randomUUID(),
          );
          await uploadAssetContent(session, file, (percent) => options.onProgress?.({ percent }));
          const completed = await completeUpload(session.assetId, session.uploadSessionId);
          uploadCompleted = true;
          if (completed.projectMediaId) {
            uploadedMediaIdsRef.current.set(uid, completed.projectMediaId);
          }
          options.onSuccess?.(undefined);
          updateTaskStatus(uid, 'done');
          invalidateProjectData();
        } catch (error) {
          if (session && !uploadCompleted) {
            await abortUpload(session.assetId, session.uploadSessionId).catch(() => undefined);
          }
          updateTaskStatus(uid, 'error');
          options.onError?.(error instanceof Error ? error : new Error(t('media.uploadFailed')));
        }
      },
    });
    runUploadQueue();
  };

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      void message.error(t('projects.unsupportedMedia'));
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const removeFile = useCallback(
    async (file: ProjectMediaUploadFile) => {
      const taskStatus = taskStatusesRef.current[file.uid];
      if (taskStatus === 'uploading' || (file.status === 'uploading' && taskStatus !== 'queued')) {
        return;
      }

      if (taskStatus === 'queued') {
        uploadQueueRef.current = uploadQueueRef.current.filter((task) => task.uid !== file.uid);
        const nextStatuses = { ...taskStatusesRef.current };
        delete nextStatuses[file.uid];
        taskStatusesRef.current = nextStatuses;
        setTaskStatuses(nextStatuses);
        setFileList((current) => current.filter((entry) => entry.uid !== file.uid));
        return;
      }

      const existingMediaId =
        items?.find((item) => item.id === file.uid)?.id ??
        file.response?.id ??
        uploadedMediaIdsRef.current.get(file.uid);
      if (!existingMediaId) {
        setFileList((current) => current.filter((entry) => entry.uid !== file.uid));
        return;
      }

      try {
        await removeProjectMedia(existingMediaId);
        setFileList((current) => current.filter((entry) => entry.uid !== file.uid));
        invalidateProjectData();
      } catch (error) {
        void message.error(error instanceof Error ? error.message : t('media.removeFailed'));
      }
    },
    [items, invalidateProjectData, message, t],
  );

  const isVideoFile = (file: ProjectMediaUploadFile): boolean =>
    file.response?.asset.assetType === 'video' || Boolean(file.type?.startsWith('video/'));

  const statusForFile = (file: ProjectMediaUploadFile): UploadTaskStatus => {
    const taskStatus = taskStatuses[file.uid];
    if (taskStatus) {
      return taskStatus;
    }
    if (file.status === 'error') {
      return 'error';
    }
    if (file.status === 'uploading') {
      return 'uploading';
    }
    return 'done';
  };

  const statusLabels: Record<UploadTaskStatus, string> = {
    queued: t('media.uploadQueued'),
    uploading: t('media.uploading'),
    done: t('media.uploadDone'),
    error: t('media.uploadError'),
  };
  const statusColors: Record<UploadTaskStatus, string> = {
    queued: 'default',
    uploading: 'processing',
    done: 'success',
    error: 'error',
  };
  const statusIcons: Record<UploadTaskStatus, ReactNode> = {
    queued: <ClockCircleOutlined />,
    uploading: <LoadingOutlined />,
    done: <CheckCircleFilled />,
    error: <CloseCircleFilled />,
  };
  const statusCounts = fileList.reduce<Record<UploadTaskStatus, number>>(
    (counts, file) => {
      counts[statusForFile(file)] += 1;
      return counts;
    },
    { queued: 0, uploading: 0, done: 0, error: 0 },
  );

  return (
    <Card
      title={t('media.projectMedia')}
      loading={media.isPending}
      extra={
        <Button
          aria-label={t('common.refresh')}
          icon={<ReloadOutlined />}
          loading={media.isFetching}
          onClick={() => void media.refetch()}
        />
      }
    >
      {media.isError ? (
        <Alert type="error" showIcon message={media.error.message} style={{ marginBottom: 16 }} />
      ) : null}
      <Space size={[8, 8]} wrap style={{ marginBottom: 16 }}>
        <Tag>{t('media.fileCount', { count: fileList.length })}</Tag>
        <Tag icon={statusIcons.queued} color={statusColors.queued}>
          {statusLabels.queued}: {statusCounts.queued}
        </Tag>
        <Tag icon={statusIcons.uploading} color={statusColors.uploading}>
          {statusLabels.uploading}: {statusCounts.uploading}
        </Tag>
        <Tag icon={statusIcons.done} color={statusColors.done}>
          {statusLabels.done}: {statusCounts.done}
        </Tag>
        <Tag icon={statusIcons.error} color={statusColors.error}>
          {statusLabels.error}: {statusCounts.error}
        </Tag>
        <Typography.Text type="secondary">
          {t('media.concurrentUploadLimit', { count: MAX_CONCURRENT_UPLOADS })}
        </Typography.Text>
      </Space>
      <Upload.Dragger
        accept="image/*,video/*"
        multiple
        fileList={fileList}
        customRequest={customRequest}
        beforeUpload={beforeUpload}
        onChange={({ fileList: nextFileList }) =>
          setFileList(nextFileList as ProjectMediaUploadFile[])
        }
        showUploadList={false}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">{t('media.dropFiles')}</p>
        <p className="ant-upload-hint">{t('media.dropFilesHint')}</p>
      </Upload.Dragger>
      <Table<ProjectMediaUploadFile>
        style={{ marginTop: 24 }}
        size="small"
        rowKey="uid"
        scroll={{ x: 1130, y: 400 }}
        pagination={false}
        locale={{ emptyText: t('media.empty') }}
        dataSource={fileList}
        columns={[
          {
            key: 'file',
            title: t('common.file'),
            dataIndex: 'name',
            width: 280,
            fixed: 'left',
            render: (name: string, file) => {
              const video = isVideoFile(file);
              const filename = displayFilename(
                name,
                file.response?.asset.mimeType ?? file.type ?? undefined,
              );
              return (
                <Space align="center" size={12}>
                  {file.thumbUrl ? (
                    <Image
                      src={file.thumbUrl}
                      alt={filename}
                      width={40}
                      height={40}
                      style={{ objectFit: 'cover', borderRadius: 6 }}
                      // Enlarging an image shows the watermarked preview, not the thumbnail.
                      preview={{
                        mask: null,
                        src: video ? undefined : (file.response?.previewUrl ?? undefined),
                      }}
                    />
                  ) : (
                    <Avatar
                      shape="square"
                      size={40}
                      icon={video ? <VideoCameraOutlined /> : <FileImageOutlined />}
                      style={{
                        backgroundColor: video ? '#722ed1' : '#1677ff',
                        borderRadius: 6,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <Tooltip title={filename} placement="topLeft">
                    <Typography.Text ellipsis style={{ maxWidth: 200, fontWeight: 500 }}>
                      {filename}
                    </Typography.Text>
                  </Tooltip>
                </Space>
              );
            },
          },
          {
            key: 'status',
            title: t('common.status'),
            width: 140,
            render: (_, file) => {
              const status = statusForFile(file);
              return (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Tag
                    icon={statusIcons[status]}
                    color={statusColors[status]}
                    style={{ margin: 0 }}
                  >
                    {statusLabels[status]}
                  </Tag>
                  {status === 'uploading' ? (
                    <Progress
                      percent={Math.round(file.percent ?? 0)}
                      size="small"
                      style={{ margin: 0, width: 100 }}
                    />
                  ) : null}
                </Space>
              );
            },
          },
          {
            key: 'size',
            title: t('media.size'),
            width: 100,
            render: (_, file) => (
              <Typography.Text type="secondary">
                {formatFileSize(file.response?.asset.fileSizeBytes ?? file.size)}
              </Typography.Text>
            ),
          },
          {
            key: 'resolution',
            title: t('media.resolution'),
            width: 120,
            align: 'center',
            render: (_, file) => {
              const dimensions = formatDimensions(file.response?.width, file.response?.height);
              return (
                <Typography.Text type={dimensions === '-' ? 'secondary' : undefined}>
                  {dimensions}
                </Typography.Text>
              );
            },
          },
          {
            key: 'duration',
            title: t('media.duration'),
            width: 100,
            align: 'center',
            render: (_, file) => {
              const duration = formatDuration(file.response?.durationSeconds);
              return (
                <Typography.Text type={duration === '-' ? 'secondary' : undefined}>
                  {duration}
                </Typography.Text>
              );
            },
          },
          {
            key: 'author',
            title: t('common.author'),
            width: 150,
            ellipsis: true,
            render: (_, file) => {
              const author =
                file.response?.creatorName ||
                file.response?.createdByUser?.name ||
                file.response?.createdByUser?.email ||
                '-';
              return (
                <Tooltip title={author} placement="topLeft">
                  <Typography.Text ellipsis style={{ maxWidth: 130 }}>
                    {author}
                  </Typography.Text>
                </Tooltip>
              );
            },
          },
          {
            key: 'updatedAt',
            title: t('projects.updatedAt'),
            width: 160,
            render: (_, file) => (
              <Typography.Text type="secondary">
                {formatDate(file.response?.modifiedAt ?? file.response?.updatedAt)}
              </Typography.Text>
            ),
          },
          {
            key: 'actions',
            title: t('common.actions'),
            width: 80,
            align: 'center',
            fixed: 'right',
            render: (_, file) => {
              const status = statusForFile(file);
              return (
                <Tooltip title={t('common.delete')}>
                  <Button
                    type="text"
                    danger
                    size="small"
                    aria-label={t('common.delete')}
                    icon={<DeleteOutlined />}
                    disabled={status === 'uploading'}
                    onClick={() => void removeFile(file)}
                  />
                </Tooltip>
              );
            },
          },
        ]}
      />
    </Card>
  );
}
