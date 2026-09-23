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
import {
  useCreateDriveImport,
  useDisconnectGoogleDrive,
  useGoogleDriveConnection,
  useStartGoogleDriveConnection,
} from '../hooks/use-google-drive';

type ImportFormValues = { projectId: string; sourceRootId: string; sourceDriveId?: string };

export function GoogleDrivePage() {
  const connection = useGoogleDriveConnection();
  const start = useStartGoogleDriveConnection();
  const disconnect = useDisconnectGoogleDrive();
  const createImport = useCreateDriveImport();
  const [batchId, setBatchId] = useState<string>();

  return (
    <PageContainer title="Google Drive">
      <Card title="Connection" style={{ marginBottom: 16 }}>
        {connection.isError ? <Alert type="error" message="Không thể tải connection" /> : null}
        {connection.data ? (
          <Space direction="vertical">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Google subject">
                {connection.data.googleSubject}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color="green">{connection.data.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Scopes">
                {connection.data.scopes.join(', ')}
              </Descriptions.Item>
            </Descriptions>
            <Button danger onClick={() => disconnect.mutate()} loading={disconnect.isPending}>
              Ngắt kết nối
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
            Kết nối Google Drive
          </Button>
        )}
      </Card>
      <Card title="Import snapshot">
        <Typography.Paragraph type="secondary">
          Chọn file/folder trong Google Picker rồi nhập ID để tạo snapshot import.
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
          <Form.Item name="projectId" label="Project ID" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sourceRootId" label="Google file/folder ID" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sourceDriveId" label="Shared Drive ID">
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={createImport.isPending}>
            Tạo import
          </Button>
        </Form>
        {batchId ? <Progress percent={0} status="active" style={{ marginTop: 16 }} /> : null}
      </Card>
    </PageContainer>
  );
}
