import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Progress,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCreateDriveImport,
  useDisconnectGoogleDrive,
  useGoogleDriveConnection,
  useStartGoogleDriveConnection,
} from '../hooks/use-google-drive';

type ImportFormValues = { projectId: string; sourceRootId: string; sourceDriveId?: string };

export function GoogleDrivePage() {
  const { t } = useTranslation();
  const connection = useGoogleDriveConnection();
  const start = useStartGoogleDriveConnection();
  const disconnect = useDisconnectGoogleDrive();
  const createImport = useCreateDriveImport();
  const [batchId, setBatchId] = useState<string>();

  return (
    <PageContainer title={t('googleDrive.title')}>
      <Card title={t('googleDrive.connection')} style={{ marginBottom: 16 }}>
        {connection.isError ? (
          <Alert type="error" message={t('googleDrive.loadConnectionFailed')} />
        ) : null}
        {connection.data ? (
          <Space direction="vertical">
            <Descriptions column={1} size="small">
              <Descriptions.Item label={t('googleDrive.googleSubject')}>
                {connection.data.googleSubject}
              </Descriptions.Item>
              <Descriptions.Item label={t('common.status')}>
                <Tag color="green">{connection.data.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('googleDrive.scopes')}>
                {connection.data.scopes.join(', ')}
              </Descriptions.Item>
            </Descriptions>
            <Button danger onClick={() => disconnect.mutate()} loading={disconnect.isPending}>
              {t('googleDrive.disconnect')}
            </Button>
          </Space>
        ) : (
          <Button
            type="primary"
            onClick={() =>
              start.mutate({
                returnUrl: `${window.location.pathname}${window.location.search}${window.location.hash}`,
              })
            }
            loading={start.isPending}
          >
            {t('googleDrive.connect')}
          </Button>
        )}
      </Card>
      <Card title={t('googleDrive.snapshotTitle')}>
        <Typography.Paragraph type="secondary">
          {t('googleDrive.snapshotDescription')}
        </Typography.Paragraph>
        <Form<ImportFormValues>
          layout="vertical"
          onFinish={(values) => {
            void createImport
              .mutateAsync({
                projectId: values.projectId,
                sources: [
                  {
                    fileId: values.sourceRootId,
                    driveId: values.sourceDriveId,
                  },
                ],
              })
              .then((batch) => setBatchId(batch.id));
          }}
        >
          <Form.Item name="projectId" label={t('render.projectId')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="sourceRootId"
            label={t('googleDrive.sourceRootId')}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="sourceDriveId" label={t('googleDrive.sharedDriveId')}>
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={createImport.isPending}>
            {t('googleDrive.createImport')}
          </Button>
        </Form>
        {batchId ? <Progress percent={0} status="active" style={{ marginTop: 16 }} /> : null}
      </Card>
    </PageContainer>
  );
}
