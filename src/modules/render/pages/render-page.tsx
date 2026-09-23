import { PageContainer } from '@ant-design/pro-components';
import { Alert, Button, Card, Empty, Form, Input, List, Progress, Space, Spin, Tag } from 'antd';
import { useState } from 'react';
import { useCreateRenderBatch, useRenderProfiles } from '../hooks/use-render';

type FormValues = { projectId?: string; folderId?: string };

export function RenderPage() {
  const profiles = useRenderProfiles();
  const createBatch = useCreateRenderBatch();
  const [createdId, setCreatedId] = useState<string>();

  return (
    <PageContainer title="Render">
      {profiles.isLoading ? <Spin /> : null}
      {profiles.isError ? <Alert type="error" message="Không thể tải render profile" /> : null}
      {profiles.data?.length ? (
        <Card title="Default profile" style={{ marginBottom: 16 }}>
          <List
            dataSource={profiles.data}
            renderItem={(profile) => (
              <List.Item>
                <Space>
                  <strong>{profile.name}</strong>
                  <Tag>{profile.outputFormat}</Tag>
                  <span>v{profile.profileVersion}</span>
                  {profile.watermarkEnabled ? <Tag color="blue">Watermark</Tag> : null}
                </Space>
              </List.Item>
            )}
          />
        </Card>
      ) : (
        <Empty description="Chưa có render profile" />
      )}
      <Card title="Tạo render batch">
        <Form<FormValues>
          layout="inline"
          onFinish={(values) => {
            void createBatch.mutateAsync(values).then((batch) => setCreatedId(batch.id));
          }}
        >
          <Form.Item name="projectId" label="Project ID">
            <Input placeholder="UUID project" />
          </Form.Item>
          <Form.Item name="folderId" label="Folder ID">
            <Input placeholder="UUID folder" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={createBatch.isPending}>
            Tạo batch
          </Button>
        </Form>
        {createdId ? <Progress percent={0} status="active" style={{ marginTop: 16 }} /> : null}
      </Card>
    </PageContainer>
  );
}
