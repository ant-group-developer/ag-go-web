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
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import {
  attachProjectMedia,
  getProjectMedia,
  removeProjectMedia,
  reorderProjectMedia,
  type AttachProjectMediaInput,
  type ProjectMedia,
} from '../api/media';

export function ProjectMediaPage() {
  const { projectId = '' } = useParams();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<AttachProjectMediaInput>();
  const media = useQuery({
    queryKey: ['projects', projectId, 'media'],
    queryFn: () => getProjectMedia(projectId),
    enabled: Boolean(projectId),
  });
  const attach = useMutation({
    mutationFn: (input: AttachProjectMediaInput) => attachProjectMedia(projectId, input),
    onSuccess: () => {
      form.resetFields();
      void queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'media'] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
  const remove = useMutation({
    mutationFn: removeProjectMedia,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'media'] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
  const reorder = useMutation({
    mutationFn: (mediaIds: string[]) => reorderProjectMedia(projectId, mediaIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'media'] });
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
      <Card title={t('media.attachTitle')}>
        <Form<AttachProjectMediaInput>
          form={form}
          layout="inline"
          onFinish={(values) => attach.mutate(values)}
          initialValues={{ assetType: 'image', mimeType: 'image/jpeg', fileSizeBytes: 0 }}
        >
          <Form.Item
            name="assetType"
            rules={[{ required: true, message: t('media.assetTypeRequired') }]}
          >
            <Select
              style={{ width: 120 }}
              options={[
                { value: 'image', label: t('media.image') },
                { value: 'video', label: t('media.video') },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="originalFilename"
            rules={[{ required: true, message: t('media.filenameRequired') }]}
          >
            <Input placeholder={t('media.filename')} />
          </Form.Item>
          <Form.Item
            name="mimeType"
            rules={[{ required: true, message: t('media.mimeTypeRequired') }]}
          >
            <Input placeholder={t('media.mimeType')} />
          </Form.Item>
          <Form.Item
            name="fileSizeBytes"
            rules={[{ required: true, message: t('media.fileSizeRequired') }]}
          >
            <InputNumber min={0} placeholder={t('media.fileSize')} />
          </Form.Item>
          <Form.Item name="caption">
            <Input placeholder={t('media.caption')} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={attach.isPending}>
            {t('media.attach')}
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
