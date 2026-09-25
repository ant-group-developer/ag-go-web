import { EyeOutlined } from '@ant-design/icons';
import { Button, Progress, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { formatFileSize } from '../../../shared/lib/format-file-size';
import type { ImportHistoryItem } from '../api/google-drive';
import { formatDate, importStatusColor, importStatusLabel } from '../utils/import-format';

type ImportBatchTableProps = {
  batches: ImportHistoryItem[];
  loading?: boolean;
  onViewItems: (batch: ImportHistoryItem) => void;
  /** Fixed body height; rows scroll inside the table. */
  scrollY?: number;
};

export function ImportBatchTable({
  batches,
  loading,
  onViewItems,
  scrollY,
}: ImportBatchTableProps) {
  const { t } = useTranslation();
  const columns: ColumnsType<ImportHistoryItem> = [
    {
      key: 'createdAt',
      title: t('render.createdAt'),
      width: 170,
      render: (_, batch) => formatDate(batch.createdAt),
    },
    {
      key: 'status',
      title: t('render.statusColumn'),
      width: 150,
      render: (_, batch) => (
        <Tag color={importStatusColor(batch.status)}>{importStatusLabel(batch.status, t)}</Tag>
      ),
    },
    {
      key: 'files',
      title: t('googleDrive.fileCountColumn'),
      width: 170,
      render: (_, batch) => (
        <Space direction="vertical" size={2}>
          <Typography.Text>
            {t('googleDrive.fileCount', { count: batch.fileCount })}
          </Typography.Text>
          <Space size={4} wrap>
            {batch.imageCount > 0 ? (
              <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                {t('googleDrive.imageCount', { count: batch.imageCount })}
              </Tag>
            ) : null}
            {batch.videoCount > 0 ? (
              <Tag color="purple" style={{ marginInlineEnd: 0 }}>
                {t('googleDrive.videoCount', { count: batch.videoCount })}
              </Tag>
            ) : null}
          </Space>
        </Space>
      ),
    },
    {
      key: 'size',
      title: t('render.fileSize'),
      width: 150,
      render: (_, batch) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{formatFileSize(batch.totalBytes)}</Typography.Text>
          {batch.importedBytes !== batch.totalBytes ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('googleDrive.importedSize', { size: formatFileSize(batch.importedBytes) })}
            </Typography.Text>
          ) : null}
        </Space>
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
            status={batch.failedItems > 0 ? 'exception' : undefined}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('render.jobCounts', {
              completed: batch.completedItems,
              failed: batch.failedItems,
              total: batch.totalItems,
            })}
          </Typography.Text>
        </Space>
      ),
    },
    {
      key: 'duplicatePolicy',
      title: t('googleDrive.duplicatePolicy'),
      width: 170,
      render: (_, batch) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>
            {t(`googleDrive.duplicatePolicies.${batch.duplicatePolicy}`)}
          </Typography.Text>
          {batch.reusedCount > 0 ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('googleDrive.reusedCount', { count: batch.reusedCount })}
            </Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      key: 'finishedAt',
      title: t('googleDrive.finishedAt'),
      width: 170,
      render: (_, batch) => formatDate(batch.finishedAt),
    },
    {
      key: 'createdBy',
      title: t('render.createdBy'),
      width: 160,
      render: (_, batch) => batch.createdByUser?.name ?? batch.createdByUser?.email ?? '-',
    },
    {
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_, batch) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => onViewItems(batch)}>
          {t('common.viewDetails')}
        </Button>
      ),
    },
  ];

  return (
    <Table<ImportHistoryItem>
      rowKey="id"
      size="small"
      loading={loading}
      columns={columns}
      dataSource={batches}
      scroll={{ x: 1400, y: scrollY }}
      pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
      onRow={(batch) => ({ onDoubleClick: () => onViewItems(batch) })}
      locale={{ emptyText: t('render.noImportHistory') }}
    />
  );
}
