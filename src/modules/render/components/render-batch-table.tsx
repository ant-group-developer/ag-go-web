import {
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Flex,
  Popconfirm,
  Progress,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { TableRefreshButton } from '../../../shared/components/table-refresh-button';
import { formatDate } from '../../../shared/lib/format-date';
import { PAGE_TABLE_STICKY } from '../../../shared/lib/sticky-table-header';
import type { RenderBatch } from '../api/render';
import {
  useCancelRenderBatch,
  usePauseRenderBatch,
  useResumeRenderBatch,
} from '../hooks/use-render';
import {
  RENDER_PAUSABLE_STATUSES,
  RENDER_STATUS_COLORS,
  renderStatusLabel,
} from '../utils/render-format';
import { RenderBatchScope } from './render-batch-scope';
import { RetryFailedBatchButton } from './retry-failed-batch-button';

type RenderBatchTableProps = {
  batches: RenderBatch[];
  loading?: boolean;
  /** Hide the project column, e.g. inside a project page. */
  hideScope?: boolean;
  onViewJobs: (batch: RenderBatch) => void;
  /** Fixed body height; rows scroll inside the table. */
  scrollY?: number;
  /** Sticky header offset; defaults to below the page header, use 0 inside drawers. */
  sticky?: TableProps<RenderBatch>['sticky'];
  /** Shows a reload button above the table. */
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function RenderBatchTable({
  batches,
  loading,
  hideScope,
  onViewJobs,
  scrollY,
  sticky = PAGE_TABLE_STICKY,
  onRefresh,
  refreshing,
}: RenderBatchTableProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const pauseBatch = usePauseRenderBatch();
  const resumeBatch = useResumeRenderBatch();
  const cancelBatch = useCancelRenderBatch();
  const onError = (error: Error) => void message.error(error.message);
  const isPending = (mutation: { isPending: boolean; variables?: string }, batch: RenderBatch) =>
    mutation.isPending && mutation.variables === batch.id;
  const columns: ColumnsType<RenderBatch> = [
    {
      key: 'createdAt',
      title: t('render.createdAt'),
      width: 170,
      render: (_, batch) => formatDate(batch.createdAt),
    },
    ...(hideScope
      ? []
      : [
          {
            key: 'scope',
            title: t('render.project'),
            width: 260,
            render: (_: unknown, batch: RenderBatch) => <RenderBatchScope batch={batch} />,
          },
        ]),
    {
      key: 'profile',
      title: t('render.profile'),
      width: 160,
      ellipsis: true,
      render: (_, batch) =>
        batch.profileName ? (
          <Typography.Text>
            {batch.profileName}{' '}
            <Typography.Text type="secondary">v{batch.profileVersion}</Typography.Text>
          </Typography.Text>
        ) : (
          '-'
        ),
    },
    {
      key: 'status',
      title: t('render.statusColumn'),
      width: 140,
      render: (_, batch) => (
        <Tag color={RENDER_STATUS_COLORS[batch.status]}>{renderStatusLabel(batch.status, t)}</Tag>
      ),
    },
    {
      key: 'progress',
      title: t('render.progress'),
      width: 220,
      render: (_, batch) => (
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <Progress
            percent={batch.progressPercent}
            size="small"
            status={batch.failedJobs > 0 ? 'exception' : undefined}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('render.jobCounts', {
              completed: batch.completedJobs,
              failed: batch.failedJobs,
              total: batch.totalJobs,
            })}
          </Typography.Text>
        </Space>
      ),
    },
    {
      key: 'createdBy',
      title: t('render.createdBy'),
      width: 160,
      ellipsis: true,
      render: (_, batch) => batch.createdByUser?.name ?? batch.createdByUser?.email ?? '-',
    },
    {
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_, batch) => (
        <Space size={4}>
          <Tooltip title={t('common.viewJobs')}>
            <Button
              size="small"
              icon={<EyeOutlined />}
              aria-label={t('common.viewJobs')}
              onClick={() => onViewJobs(batch)}
            />
          </Tooltip>
          {RENDER_PAUSABLE_STATUSES.includes(batch.status) ? (
            <Tooltip title={t('render.pauseBatch')}>
              <Button
                size="small"
                icon={<PauseCircleOutlined />}
                aria-label={t('render.pauseBatch')}
                loading={isPending(pauseBatch, batch)}
                onClick={() => pauseBatch.mutate(batch.id, { onError })}
              />
            </Tooltip>
          ) : null}
          {batch.status === 'paused' ? (
            <Tooltip title={t('render.resumeBatch')}>
              <Button
                size="small"
                icon={<PlayCircleOutlined />}
                aria-label={t('render.resumeBatch')}
                loading={isPending(resumeBatch, batch)}
                onClick={() => resumeBatch.mutate(batch.id, { onError })}
              />
            </Tooltip>
          ) : null}
          <RetryFailedBatchButton batch={batch} />
          {[...RENDER_PAUSABLE_STATUSES, 'paused'].includes(batch.status) ? (
            <Popconfirm
              title={t('render.cancelBatchConfirm')}
              okButtonProps={{ danger: true }}
              onConfirm={() => cancelBatch.mutateAsync(batch.id).catch(onError)}
            >
              <Tooltip title={t('render.cancelBatch')}>
                <Button
                  size="small"
                  danger
                  icon={<StopOutlined />}
                  aria-label={t('render.cancelBatch')}
                  loading={isPending(cancelBatch, batch)}
                />
              </Tooltip>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  const table = (
    <Table<RenderBatch>
      rowKey="id"
      size="small"
      loading={loading}
      columns={columns}
      dataSource={batches}
      sticky={sticky}
      scroll={{ x: hideScope ? 1000 : 1260, y: scrollY }}
      pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
      onRow={(batch) => ({ onDoubleClick: () => onViewJobs(batch) })}
      locale={{ emptyText: t('render.noRenderHistory') }}
    />
  );
  if (!onRefresh) {
    return table;
  }
  return (
    <Flex vertical gap={12}>
      <Flex justify="flex-end">
        <TableRefreshButton onRefresh={onRefresh} refreshing={refreshing} />
      </Flex>
      {table}
    </Flex>
  );
}
