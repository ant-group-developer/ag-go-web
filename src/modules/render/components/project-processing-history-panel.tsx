import { ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Empty, List, Select, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatFileSize } from '../../../shared/lib/format-file-size';
import {
  useDriveImport,
  useProjectImports,
  useRetryDriveImportItem,
} from '../../google-drive/hooks/use-google-drive';
import {
  useCreateRenderBatch,
  useProjectRenderBatches,
  useRenderProfiles,
} from '../hooks/use-render';
import { RenderBatchTable } from './render-batch-table';
import { RenderJobsDrawer } from './render-jobs-drawer';

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

function importStatusLabel(status: string, t: (key: string) => string): string {
  return (
    {
      queued: t('googleDrive.status.queued'),
      importing: t('googleDrive.status.importing'),
      completed: t('googleDrive.status.completed'),
      failed: t('googleDrive.status.failed'),
      cancelled: t('googleDrive.status.cancelled'),
    }[status] ?? status
  );
}

export function ProjectProcessingHistoryPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const imports = useProjectImports(projectId);
  const renderBatches = useProjectRenderBatches(projectId);
  const profiles = useRenderProfiles();
  const createBatch = useCreateRenderBatch();
  const retryImport = useRetryDriveImportItem();
  const [selectedImportId, setSelectedImportId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const importDetail = useDriveImport(selectedImportId);
  const [profileId, setProfileId] = useState<string>();

  return (
    <Card title={t('render.projectProcessingHistory')} style={{ marginTop: 16 }}>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          style={{ minWidth: 240 }}
          placeholder={t('render.renderProfilePlaceholder')}
          value={profileId}
          onChange={setProfileId}
          options={profiles.data?.map((profile) => ({
            value: profile.id,
            label: `${profile.name} · v${profile.profileVersion}`,
          }))}
        />
        <Button
          type="primary"
          loading={createBatch.isPending}
          disabled={!profiles.data?.length}
          onClick={() =>
            createBatch.mutate({
              projectId,
              ...(profileId ? { renderProfileId: profileId } : {}),
            })
          }
        >
          {t('render.renderAllProject')}
        </Button>
      </Space>

      {imports.isError || renderBatches.isError ? (
        <Alert
          type="error"
          showIcon
          message={imports.error?.message ?? renderBatches.error?.message}
        />
      ) : null}

      <Typography.Title level={5}>{t('render.importFilesTitle')}</Typography.Title>
      {imports.data?.length ? (
        <List
          size="small"
          bordered
          dataSource={imports.data}
          renderItem={(batch) => (
            <List.Item
              actions={[
                <Button key="view" type="link" onClick={() => setSelectedImportId(batch.id)}>
                  {t('common.viewDetails')}
                </Button>,
              ]}
            >
              <Space>
                <Typography.Text>
                  {new Date(batch.createdAt).toLocaleString('vi-VN')}
                </Typography.Text>
                <Tag
                  color={
                    batch.status === 'completed'
                      ? 'success'
                      : batch.status === 'failed'
                        ? 'error'
                        : 'processing'
                  }
                >
                  {statusLabel(batch.status, t)}
                </Tag>
                <Typography.Text type="secondary">
                  {batch.completedItems}/{batch.totalItems}
                </Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('render.noImportHistory')} />
      )}

      {importDetail.data ? (
        <List
          size="small"
          header={<Typography.Text strong>{t('render.importDetailsTitle')}</Typography.Text>}
          dataSource={importDetail.data.items}
          renderItem={(item) => (
            <List.Item
              actions={
                item.status === 'failed'
                  ? [
                      <Button
                        key="retry"
                        size="small"
                        loading={retryImport.isPending}
                        icon={<ReloadOutlined />}
                        onClick={() =>
                          retryImport.mutate({ batchId: item.batchId, itemId: item.id })
                        }
                      >
                        {t('common.retry')}
                      </Button>,
                    ]
                  : undefined
              }
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Typography.Text>{item.sourceName}</Typography.Text>
                    <Typography.Text type="secondary">
                      {formatFileSize(item.sourceSizeBytes)}
                    </Typography.Text>
                  </Space>
                }
                description={
                  <Space>
                    <Tag color={item.status === 'failed' ? 'error' : 'processing'}>
                      {importStatusLabel(item.status, t)}
                    </Tag>
                    {item.errorMessage ? (
                      <Typography.Text type="danger">{item.errorMessage}</Typography.Text>
                    ) : null}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      ) : null}

      <Typography.Title level={5} style={{ marginTop: 20 }}>
        {t('render.renderTitle')}
      </Typography.Title>
      <RenderBatchTable
        batches={renderBatches.data ?? []}
        loading={renderBatches.isLoading}
        hideScope
        onViewJobs={(batch) => setSelectedBatchId(batch.id)}
      />
      <RenderJobsDrawer
        batch={renderBatches.data?.find((batch) => batch.id === selectedBatchId)}
        open={Boolean(selectedBatchId)}
        onClose={() => setSelectedBatchId('')}
      />
    </Card>
  );
}
