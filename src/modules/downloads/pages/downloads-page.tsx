import { PageContainer } from '@ant-design/pro-components';
import { Alert, Button, Card, Form, Input, Select, Space, Typography } from 'antd';
import { useState } from 'react';
import { createDownload, type DownloadResult } from '../api/downloads';

type FormValues = {
  scope: 'single' | 'multiple' | 'project';
  projectId?: string;
  projectMediaIds?: string;
  downloadType: 'original' | 'rendered';
};

export function DownloadsPage() {
  const [result, setResult] = useState<DownloadResult>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  return (
    <PageContainer title="Downloads">
      <Card title="Tạo download request">
        <Form<FormValues>
          layout="vertical"
          initialValues={{ scope: 'single', downloadType: 'original' }}
          onFinish={async (values) => {
            setLoading(true);
            setError(undefined);
            try {
              const response = await createDownload({
                scope: values.scope,
                projectId: values.projectId,
                projectMediaIds: values.projectMediaIds
                  ?.split(',')
                  .map((value) => value.trim())
                  .filter(Boolean),
                downloadType: values.downloadType,
              });
              setResult(response);
            } catch (requestError) {
              setError(requestError instanceof Error ? requestError.message : 'Download failed');
            } finally {
              setLoading(false);
            }
          }}
        >
          <Form.Item name="scope" label="Scope">
            <Select
              options={[
                { value: 'single', label: 'Single' },
                { value: 'multiple', label: 'Multiple' },
                { value: 'project', label: 'Project' },
              ]}
            />
          </Form.Item>
          <Form.Item name="projectId" label="Project ID">
            <Input />
          </Form.Item>
          <Form.Item name="projectMediaIds" label="Project media IDs">
            <Input placeholder="Comma separated UUIDs" />
          </Form.Item>
          <Form.Item name="downloadType" label="Type">
            <Select
              options={[
                { value: 'original', label: 'Original' },
                { value: 'rendered', label: 'Rendered' },
              ]}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Tạo download
          </Button>
        </Form>
        {error ? <Alert type="error" message={error} style={{ marginTop: 16 }} /> : null}
        {result?.mode === 'single' ? (
          <Space direction="vertical" style={{ marginTop: 16 }}>
            <Typography.Text>URL hết hạn: {result.expiresAt}</Typography.Text>
            <Button type="link" href={result.url} target="_blank" rel="noreferrer">
              Mở file
            </Button>
          </Space>
        ) : null}
        {result?.mode === 'job' ? (
          <Typography.Paragraph style={{ marginTop: 16 }}>
            Download job: {result.downloadJobId} ({result.status})
          </Typography.Paragraph>
        ) : null}
      </Card>
    </PageContainer>
  );
}
