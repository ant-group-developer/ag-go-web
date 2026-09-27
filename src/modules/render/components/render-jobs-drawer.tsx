import { Alert, Descriptions, Drawer, Flex, Progress, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../shared/lib/format-date';
import { CONTAINER_TABLE_STICKY } from '../../../shared/lib/sticky-table-header';
import type { RenderBatch } from '../api/render';
import { useRenderBatchJobs } from '../hooks/use-render';
import { RENDER_STATUS_COLORS, renderStatusLabel } from '../utils/render-format';
import { RenderBatchScope } from './render-batch-scope';
import { RenderJobTable } from './render-job-table';

type RenderJobsDrawerProps = {
  batch?: RenderBatch;
  open: boolean;
  onClose: () => void;
};

/** Batch detail: summary and one row per file with its original and rendered sizes. */
export function RenderJobsDrawer({ batch, open, onClose }: RenderJobsDrawerProps) {
  const { t } = useTranslation();
  const jobs = useRenderBatchJobs(open && batch ? batch.id : '');
  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="min(1760px, 100vw)"
      title={t('render.batchDetail')}
      extra={
        batch ? (
          <Tag color={RENDER_STATUS_COLORS[batch.status]}>{renderStatusLabel(batch.status, t)}</Tag>
        ) : null
      }
      destroyOnHidden
    >
      {batch ? (
        <Flex vertical gap={16}>
          <Descriptions size="small" bordered column={{ xs: 1, md: 2, xl: 4 }}>
            <Descriptions.Item label={t('render.project')}>
              <RenderBatchScope batch={batch} />
            </Descriptions.Item>
            <Descriptions.Item label={t('render.profile')}>
              {batch.profileName ? `${batch.profileName} · v${batch.profileVersion}` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('render.createdBy')}>
              {batch.createdByUser?.name ?? batch.createdByUser?.email ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('render.createdAt')}>
              {formatDate(batch.createdAt)}
            </Descriptions.Item>
          </Descriptions>
          <Progress
            percent={batch.progressPercent}
            success={{
              percent: batch.totalJobs ? (batch.completedJobs / batch.totalJobs) * 100 : 0,
            }}
            status={batch.failedJobs > 0 ? 'exception' : undefined}
            format={() => `${batch.completedJobs}/${batch.totalJobs}`}
          />
          {batch.errorMessage ? <Alert type="error" showIcon message={batch.errorMessage} /> : null}
          <RenderJobTable
            jobs={jobs.data ?? []}
            loading={jobs.isLoading}
            error={jobs.isError ? jobs.error.message : undefined}
            sticky={CONTAINER_TABLE_STICKY}
            onRefresh={() => void jobs.refetch()}
            refreshing={jobs.isFetching}
          />
        </Flex>
      ) : null}
    </Drawer>
  );
}
