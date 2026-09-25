import { PageContainer } from '@ant-design/pro-components';
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from '../../../shared/components/select';
import { bilingualSearchText } from '../../../shared/lib/search-text';
import { createDownload, type DownloadResult } from '../api/downloads';

type FormValues = {
  scope: 'single' | 'multiple' | 'project';
  projectId?: string;
  projectMediaIds?: string;
  downloadType: 'original' | 'rendered';
};

export function DownloadsPage() {
  const { t } = useTranslation();
  const [result, setResult] = useState<DownloadResult>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  return (
    <PageContainer title={t('downloads.title')}>
      <Card title={t('downloads.createRequest')}>
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
              setError(
                requestError instanceof Error ? requestError.message : t('downloads.failed'),
              );
            } finally {
              setLoading(false);
            }
          }}
        >
          <Form.Item name="scope" label={t('downloads.scope')}>
            <Select
              options={[
                {
                  value: 'single',
                  label: t('downloads.scopeSingle'),
                  searchText: bilingualSearchText('downloads.scopeSingle'),
                },
                {
                  value: 'multiple',
                  label: t('downloads.scopeMultiple'),
                  searchText: bilingualSearchText('downloads.scopeMultiple'),
                },
                {
                  value: 'project',
                  label: t('downloads.scopeProject'),
                  searchText: bilingualSearchText('downloads.scopeProject'),
                },
              ]}
            />
          </Form.Item>
          <Form.Item name="projectId" label={t('downloads.projectId')}>
            <Input />
          </Form.Item>
          <Form.Item name="projectMediaIds" label={t('downloads.projectMediaIds')}>
            <Input placeholder={t('downloads.mediaIdsPlaceholder')} />
          </Form.Item>
          <Form.Item name="downloadType" label={t('downloads.type')}>
            <Select
              options={[
                {
                  value: 'original',
                  label: t('downloads.typeOriginal'),
                  searchText: bilingualSearchText('downloads.typeOriginal'),
                },
                {
                  value: 'rendered',
                  label: t('downloads.typeRendered'),
                  searchText: bilingualSearchText('downloads.typeRendered'),
                },
              ]}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            {t('downloads.submit')}
          </Button>
        </Form>
        {error ? <Alert type="error" message={error} style={{ marginTop: 16 }} /> : null}
        {result?.mode === 'single' ? (
          <Space direction="vertical" style={{ marginTop: 16 }}>
            <Typography.Text>
              {t('downloads.expiresAt', { date: result.expiresAt })}
            </Typography.Text>
            <Button type="link" href={result.url} target="_blank" rel="noreferrer">
              {t('downloads.openFile')}
            </Button>
          </Space>
        ) : null}
        {result?.mode === 'job' ? (
          <Typography.Paragraph style={{ marginTop: 16 }}>
            {t('downloads.jobStatus', { id: result.downloadJobId, status: result.status })}
          </Typography.Paragraph>
        ) : null}
      </Card>
    </PageContainer>
  );
}
