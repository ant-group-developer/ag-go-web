import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  List,
  Progress,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useAllRenderBatches,
  useCreateRenderBatch,
  useRenderBatchJobs,
  useRenderProfiles,
  useRetryRenderJob,
} from '../hooks/use-render';

type FormValues = { projectId?: string; folderId?: string };

function statusLabel(status: string, t: (key: string) => string): string {
  return (
    {
      queued: t('render.status.queued'),
      processing: t('render.status.processing'),
      completed: t('render.status.completed'),
      partial: t('render.status.partial'),
      failed: t('render.status.failed'),
      cancelled: t('render.status.cancelled'),
    }[status] ?? status
  );
}

export function RenderPage() {
  const { t } = useTranslation();
  const profiles = useRenderProfiles();
  const batches = useAllRenderBatches();
  const createBatch = useCreateRenderBatch();
  const retryJob = useRetryRenderJob();
  const [createdId, setCreatedId] = useState<string>();
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const jobs = useRenderBatchJobs(selectedBatchId);
  const [profileId, setProfileId] = useState<string>();

  return (
    <PageContainer title={t('render.title')}>
      {profiles.isLoading ? <Spin /> : null}
      {profiles.isError ? <Alert type="error" message={t('render.loadProfilesFailed')} /> : null}
      {profiles.data?.length ? (
        <Card title={t('render.defaultProfile')} style={{ marginBottom: 16 }}>
          <List
            dataSource={profiles.data}
            renderItem={(profile) => (
              <List.Item>
                <Space>
                  <strong>{profile.name}</strong>
                  <Tag>{profile.outputFormat}</Tag>
                  <span>v{profile.profileVersion}</span>
                  {profile.watermarkEnabled ? <Tag color="blue">{t('render.watermark')}</Tag> : null}
                </Space>
              </List.Item>
            )}
          />
        </Card>
      ) : (
        <Empty description={t('render.noProfiles')} />
      )}
      <Card title={t('render.createBatch')}>
        <Form<FormValues>
          layout="inline"
          onFinish={(values) => {
            void createBatch
              .mutateAsync({ ...values, ...(profileId ? { renderProfileId: profileId } : {}) })
              .then((batch) => setCreatedId(batch.id));
          }}
        >
          <Form.Item name="projectId" label={t('render.projectId')}>
            <Input placeholder={t('render.projectIdPlaceholder')} />
          </Form.Item>
          <Form.Item name="folderId" label={t('render.folderId')}>
            <Input placeholder={t('render.folderIdPlaceholder')} />
          </Form.Item>
          <Form.Item label={t('render.profile')}>
            <Select
              allowClear
              style={{ minWidth: 220 }}
              placeholder={t('render.defaultProfilePlaceholder')}
              value={profileId}
              onChange={setProfileId}
              options={profiles.data?.map((profile) => ({
                value: profile.id,
                label: `${profile.name} · v${profile.profileVersion}`,
              }))}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={createBatch.isPending}>
            {t('render.submitBatch')}
          </Button>
        </Form>
        {createdId ? <Progress percent={0} status="active" style={{ marginTop: 16 }} /> : null}
      </Card>
      <Card title={t('render.systemHistory')} style={{ marginTop: 16 }}>
        {batches.isError ? <Alert type="error" message={batches.error.message} /> : null}
        {batches.isLoading ? <Spin /> : null}
        {batches.data?.length ? (
          <List
            bordered
            dataSource={batches.data}
            renderItem={(batch) => (
              <List.Item
                actions={[
                  <Button key="jobs" type="link" onClick={() => setSelectedBatchId(batch.id)}>
                    {t('common.viewJobs')}
                  </Button>,
                ]}
              >
                <Space wrap>
                  <Typography.Text>
                    {new Date(batch.createdAt).toLocaleString('vi-VN')}
                  </Typography.Text>
                  <Tag
                    color={
                      batch.status === 'completed'
                        ? 'success'
                        : batch.status === 'failed' || batch.status === 'partial'
                          ? 'error'
                          : 'processing'
                    }
                  >
                    {statusLabel(batch.status, t)}
                  </Tag>
                  <Typography.Text type="secondary">
                    {batch.completedJobs}/{batch.totalJobs} jobs
                  </Typography.Text>
                  <Progress percent={batch.progressPercent} size="small" style={{ width: 140 }} />
                </Space>
              </List.Item>
            )}
          />
        ) : (
          <Empty description={t('render.noRenderHistory')} />
        )}
        {jobs.data ? (
          <List
            style={{ marginTop: 16 }}
            header={<Typography.Text strong>{t('render.renderJobsTitle')}</Typography.Text>}
            dataSource={jobs.data}
            renderItem={(job) => (
              <List.Item
                actions={
                  job.status === 'failed'
                    ? [
                        <Button
                          key="retry"
                          size="small"
                          loading={retryJob.isPending}
                          onClick={() => retryJob.mutate(job.id)}
                        >
                          {t('common.retry')}
                        </Button>,
                      ]
                    : undefined
                }
              >
                <List.Item.Meta
                  title={`${job.assetId} · ${statusLabel(job.status, t)}`}
                  description={
                    job.errorMessage ??
                    job.progressMessage ??
                    t('render.attempt', { count: job.attemptCount })
                  }
                />
              </List.Item>
            )}
          />
        ) : null}
      </Card>
    </PageContainer>
  );
}
