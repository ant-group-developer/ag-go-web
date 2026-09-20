import { InboxOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UploadFile, UploadProps } from 'antd';
import { Alert, App as AntApp, Button, Card, Space, Tag, Typography, Upload } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { projectQueryKeys } from '../../projects/queries/project-query-keys';
import {
  abortUpload,
  attachProjectMedia,
  completeUpload,
  createUploadSession,
  getAssetPreviewUrl,
  getProjectMedia,
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

type ProjectMediaPanelProps = {
  projectId: string;
};

export function ProjectMediaPanel({ projectId }: ProjectMediaPanelProps) {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const queryClient = useQueryClient();
  const previewUrlsRef = useRef<string[]>([]);
  const uploadQueueRef = useRef<UploadTask[]>([]);
  const activeUploadsRef = useRef(0);
  const taskStatusesRef = useRef<Record<string, UploadTaskStatus>>({});
  const [fileList, setFileList] = useState<ProjectMediaUploadFile[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [taskStatuses, setTaskStatuses] = useState<Record<string, UploadTaskStatus>>({});
  const media = useQuery({
    queryKey: mediaQueryKeys.project(projectId),
    queryFn: () => getProjectMedia(projectId),
    enabled: Boolean(projectId),
  });
  const items = media.data?.items;
  const serverFileList = useMemo<ProjectMediaUploadFile[]>(
    () =>
      (items ?? []).map((item) => ({
        uid: item.id,
        name: item.asset.originalFilename,
        status: 'done',
        percent: 100,
        response: item,
        ...(previewUrls[item.id] ? { thumbUrl: previewUrls[item.id] } : {}),
      })),
    [items, previewUrls],
  );

  const updateTaskStatus = useCallback((uid: string, status: UploadTaskStatus) => {
    taskStatusesRef.current = { ...taskStatusesRef.current, [uid]: status };
    setTaskStatuses(taskStatusesRef.current);
  }, []);

  useEffect(() => {
    let disposed = false;
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = [];
    setPreviewUrls({});

    const readyImages = (items ?? []).filter(
      (item) => item.asset.assetType === 'image' && item.asset.processingStatus === 'ready',
    );
    void Promise.all(
      readyImages.map(async (item) => {
        try {
          const url = await getAssetPreviewUrl(item.assetId);
          return [item.id, url] as const;
        } catch {
          return undefined;
        }
      }),
    ).then((entries) => {
      const urls = entries.filter((entry): entry is readonly [string, string] => Boolean(entry));
      if (disposed) {
        urls.forEach(([, url]) => URL.revokeObjectURL(url));
        return;
      }
      previewUrlsRef.current = urls.map(([, url]) => url);
      setPreviewUrls(Object.fromEntries(urls));
    });

    return () => {
      disposed = true;
    };
  }, [items]);

  useEffect(() => () => previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

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
        const responseId = file.response?.id;
        const mediaId = responseId ?? file.uid;
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
            },
            globalThis.crypto.randomUUID(),
          );
          await uploadAssetContent(session, file, (percent) => options.onProgress?.({ percent }));
          const asset = await completeUpload(session.assetId, session.uploadSessionId);
          uploadCompleted = true;
          const projectMedia = await attachProjectMedia(projectId, { assetId: asset.id });
          options.onSuccess?.(projectMedia);
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

  const handleRemove: UploadProps['onRemove'] = async (file) => {
    const taskStatus = taskStatusesRef.current[file.uid];
    if (taskStatus === 'uploading' || (file.status === 'uploading' && taskStatus !== 'queued')) {
      return false;
    }

    if (taskStatus === 'queued') {
      uploadQueueRef.current = uploadQueueRef.current.filter((task) => task.uid !== file.uid);
      const nextStatuses = { ...taskStatusesRef.current };
      delete nextStatuses[file.uid];
      taskStatusesRef.current = nextStatuses;
      setTaskStatuses(nextStatuses);
      return true;
    }

    const existingMedia =
      items?.find((item) => item.id === file.uid) ?? (file as ProjectMediaUploadFile).response;
    if (!existingMedia) {
      setFileList((current) => current.filter((entry) => entry.uid !== file.uid));
      return true;
    }

    try {
      await removeProjectMedia(existingMedia.id);
      invalidateProjectData();
      return true;
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('media.removeFailed'));
      return false;
    }
  };

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
  const statusCounts = fileList.reduce<Record<UploadTaskStatus, number>>(
    (counts, file) => {
      counts[statusForFile(file)] += 1;
      return counts;
    },
    { queued: 0, uploading: 0, done: 0, error: 0 },
  );

  const itemRender: NonNullable<UploadProps['itemRender']> = (originNode, file) => {
    const uploadFile = file as ProjectMediaUploadFile;
    const status = statusForFile(uploadFile);

    return (
      <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
        {originNode}
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      </Space>
    );
  };

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
        <Tag color={statusColors.queued}>
          {statusLabels.queued}: {statusCounts.queued}
        </Tag>
        <Tag color={statusColors.uploading}>
          {statusLabels.uploading}: {statusCounts.uploading}
        </Tag>
        <Tag color={statusColors.done}>
          {statusLabels.done}: {statusCounts.done}
        </Tag>
        <Tag color={statusColors.error}>
          {statusLabels.error}: {statusCounts.error}
        </Tag>
        <Typography.Text type="secondary">
          {t('media.concurrentUploadLimit', { count: MAX_CONCURRENT_UPLOADS })}
        </Typography.Text>
      </Space>
      <Upload.Dragger
        accept="image/*,video/*"
        multiple
        listType="picture"
        fileList={fileList}
        customRequest={customRequest}
        beforeUpload={beforeUpload}
        onChange={({ fileList: nextFileList }) =>
          setFileList(nextFileList as ProjectMediaUploadFile[])
        }
        onRemove={handleRemove}
        itemRender={itemRender}
        progress={{ strokeWidth: 2, showInfo: true }}
        showUploadList={{ showPreviewIcon: true, showDownloadIcon: false, showRemoveIcon: true }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">{t('media.dropFiles')}</p>
        <p className="ant-upload-hint">{t('media.dropFilesHint')}</p>
      </Upload.Dragger>
      {items?.length === 0 && !media.isError ? (
        <Typography.Text type="secondary">{t('media.empty')}</Typography.Text>
      ) : null}
    </Card>
  );
}
