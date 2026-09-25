import { EyeOutlined } from '@ant-design/icons';
import { Button, Progress, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import type { RenderBatch } from '../api/render';
import { formatDateTime, RENDER_STATUS_COLORS, renderStatusLabel } from '../utils/render-format';
import { RenderBatchScope } from './render-batch-scope';

type RenderBatchTableProps = {
  batches: RenderBatch[];
  loading?: boolean;
  /** Hide the project column, e.g. inside a project page. */
  hideScope?: boolean;
  onViewJobs: (batch: RenderBatch) => void;
  /** Fixed body height; rows scroll inside the table. */
  scrollY?: number;
};

export function RenderBatchTable({
  batches,
  loading,
  hideScope,
  onViewJobs,
  scrollY,
}: RenderBatchTableProps) {
  const { t } = useTranslation();
  const columns: ColumnsType<RenderBatch> = [
    {
      key: 'createdAt',
      title: t('render.createdAt'),
      width: 170,
      render: (_, batch) => formatDateTime(batch.createdAt),
    },
    ...(hideScope
      ? []
      : [
          {
            key: 'scope',
            title: t('render.project'),
            render: (_: unknown, batch: RenderBatch) => <RenderBatchScope batch={batch} />,
          },
        ]),
    {
      key: 'profile',
      title: t('render.profile'),
      width: 160,
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

  return (
    <Table<RenderBatch>
      rowKey="id"
      size="small"
      loading={loading}
      columns={columns}
      dataSource={batches}
      scroll={{ x: 1000, y: scrollY }}
      pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
      onRow={(batch) => ({ onDoubleClick: () => onViewJobs(batch) })}
      locale={{ emptyText: t('render.noRenderHistory') }}
    />
  );
}
