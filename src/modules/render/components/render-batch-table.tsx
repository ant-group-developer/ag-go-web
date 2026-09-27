import { EyeOutlined } from '@ant-design/icons';
import { Button, Flex, Progress, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { TableRefreshButton } from '../../../shared/components/table-refresh-button';
import { formatDate } from '../../../shared/lib/format-date';
import { PAGE_TABLE_STICKY } from '../../../shared/lib/sticky-table-header';
import type { RenderBatch } from '../api/render';
import { RENDER_STATUS_COLORS, renderStatusLabel } from '../utils/render-format';
import { RenderBatchScope } from './render-batch-scope';

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
      width: 120,
      fixed: 'right',
      render: (_, batch) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => onViewJobs(batch)}>
          {t('common.viewJobs')}
        </Button>
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
