import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Progress,
  Space,
  Table,
  Typography,
} from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { projectQueryKeys } from '../../projects/queries/project-query-keys';
import {
  abortUpload,
  attachProjectMedia,
  completeUpload,
  createUploadSession,
  getProjectMedia,
  removeProjectMedia,
  reorderProjectMedia,
  uploadAssetContent,
  type ProjectMedia,
} from '../api/media';
import { mediaQueryKeys } from '../queries/media-query-keys';
import type { UploadFormValues } from '../types/upload-form-values.type';

export function ProjectMediaPage() {
  const { projectId = '' } = useParams();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<UploadFormValues>();
  const [selectedFile, setSelectedFile] = useState<File>();
  const [uploadProgress, setUploadProgress] = useState(0);
  const media = useQuery({
    queryKey: mediaQueryKeys.project(projectId),
    queryFn: () => getProjectMedia(projectId),
    enabled: Boolean(projectId),
  });
  const upload = useMutation({
    mutationFn: async (values: UploadFormValues) => {
      if (!selectedFile) {
        throw new Error(t('media.fileRequired'));
      }
      const assetType = selectedFile.type.startsWith('video/') ? 'video' : 'image';
      const session = await createUploadSession(
        {
          assetType,
          originalFilename: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          fileSizeBytes: selectedFile.size,
        },
        globalThis.crypto.randomUUID(),
      );
      try {
        setUploadProgress(5);
        await uploadAssetContent(session, selectedFile, setUploadProgress);
        const completed = await completeUpload(session.assetId, session.uploadSessionId);
        return attachProjectMedia(projectId, {
          assetId: completed.id,
          caption: values.caption,
          sortOrder: values.sortOrder,
        });
      } catch (error) {
        await abortUpload(session.assetId, session.uploadSessionId).catch(() => undefined);
        throw error;
      }
    },
    onSuccess: () => {
      form.resetFields();
      setSelectedFile(undefined);
      setUploadProgress(100);
      void queryClient.invalidateQueries({ queryKey: mediaQueryKeys.project(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all() });
    },
    onSettled: () => {
      window.setTimeout(() => setUploadProgress(0), 800);
    },
  });
  const remove = useMutation({
    mutationFn: removeProjectMedia,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mediaQueryKeys.project(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all() });
    },
  });
  const reorder = useMutation({
    mutationFn: (mediaIds: string[]) => reorderProjectMedia(projectId, mediaIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mediaQueryKeys.project(projectId) });
    },
  });

  if (!projectId) {
    return <Alert type="error" message={t('media.invalidProject')} />;
  }
  if (media.isError) {
    return <Alert type="error" message={media.error.message} />;
  }

  const items = media.data?.items ?? [];
  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= items.length) {
      return;
    }
    const mediaIds = items.map((item) => item.id);
    [mediaIds[index], mediaIds[target]] = [mediaIds[target], mediaIds[index]];
    reorder.mutate(mediaIds);
  };

  return (
    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
      <Space>
        <Link to="/projects">{t('media.backToProjects')}</Link>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t('media.title')}
        </Typography.Title>
      </Space>
      <Card title={t('media.uploadTitle')}>
        <Space direction="vertical" style={{ display: 'flex' }}>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={(event) => setSelectedFile(event.target.files?.[0])}
          />
          {selectedFile ? <Typography.Text>{selectedFile.name}</Typography.Text> : null}
          {upload.isError ? <Alert type="error" message={upload.error.message} /> : null}
          {upload.isPending ? <Progress percent={uploadProgress} /> : null}
        </Space>
        <Form<UploadFormValues>
          form={form}
          layout="inline"
          onFinish={(values) => upload.mutate(values)}
        >
          <Form.Item name="caption">
            <Input placeholder={t('media.caption')} />
          </Form.Item>
          <Form.Item name="sortOrder">
            <InputNumber min={0} placeholder={t('media.order')} />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={upload.isPending}
            disabled={!selectedFile}
          >
            {t('media.upload')}
          </Button>
        </Form>
      </Card>
      <Card loading={media.isPending}>
        {items.length === 0 ? (
          <Empty description={t('media.empty')} />
        ) : (
          <Table<ProjectMedia>
            rowKey="id"
            dataSource={items}
            pagination={false}
            columns={[
              { title: t('media.order'), dataIndex: 'sortOrder', width: 90 },
              { title: t('media.filename'), render: (_, item) => item.asset.originalFilename },
              { title: t('media.type'), render: (_, item) => item.asset.assetType },
              { title: t('media.size'), render: (_, item) => item.asset.fileSizeBytes },
              { title: t('media.status'), render: (_, item) => item.asset.processingStatus },
              { title: t('media.caption'), dataIndex: 'caption' },
              {
                title: t('media.actions'),
                render: (_, _item, index) => (
                  <Space>
                    <Button size="small" disabled={index === 0} onClick={() => move(index, -1)}>
                      ↑
                    </Button>
                    <Button
                      size="small"
                      disabled={index === items.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      ↓
                    </Button>
                    <Popconfirm
                      title={t('media.removeConfirm')}
                      onConfirm={() => remove.mutate(_item.id)}
                    >
                      <Button danger size="small" loading={remove.isPending}>
                        {t('media.remove')}
                      </Button>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>
    </Space>
  );
}
