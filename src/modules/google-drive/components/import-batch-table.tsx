import {
  EyeOutlined,
  LoadingOutlined,
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
import type { ColumnsType, TablePaginationConfig, TableProps } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { TableRefreshButton } from '../../../shared/components/table-refresh-button';
import { formatDate } from '../../../shared/lib/format-date';
import { formatFileSize } from '../../../shared/lib/format-file-size';
import { PAGE_TABLE_STICKY } from '../../../shared/lib/sticky-table-header';
import type { ImportHistoryItem } from '../api/google-drive';
import {
  useCancelDriveImport,
  usePauseDriveImport,
  useResumeDriveImport,
} from '../hooks/use-google-drive';
import {
  IMPORT_PAUSABLE_STATUSES,
  importStatusColor,
  importStatusLabel,
  isImportScanning,
} from '../utils/import-format';
import { ImportSourceFolders } from './import-source-folders';

type ImportBatchTableProps = {
  batches: ImportHistoryItem[];
  loading?: boolean;
  onViewItems: (batch: ImportHistoryItem) => void;
  /** Fixed body height; rows scroll inside the table. */
  scrollY?: number;
  /** Show the project column, for the cross-project history. */
  showProject?: boolean;
  /** Refetches the batches list; renders a reload button above the table when given. */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Sticky header offset; defaults to below the page header, use 0 inside drawers. */
  sticky?: TableProps<ImportHistoryItem>['sticky'];
  /** Overrides the default client paging (10 rows, no size changer). */
  pagination?: TablePaginationConfig;
};

export function ImportBatchTable({
  batches,
  loading,
  onViewItems,
  scrollY,
  showProject,
  onRefresh,
  refreshing,
  sticky = PAGE_TABLE_STICKY,
  pagination = { pageSize: 10, hideOnSinglePage: true, showSizeChanger: false },
}: ImportBatchTableProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const pauseImport = usePauseDriveImport();
  const resumeImport = useResumeDriveImport();
  const cancelImport = useCancelDriveImport();
  const onError = (error: Error) => void message.error(error.message);
  const isPending = (
    mutation: { isPending: boolean; variables?: string },
    batch: ImportHistoryItem,
  ) => mutation.isPending && mutation.variables === batch.id;
  const scanning = (
    <Typography.Text type="secondary">
      <LoadingOutlined /> {t('googleDrive.scanningFolders')}
    </Typography.Text>
  );
  const columns: ColumnsType<ImportHistoryItem> = [
    {
      key: 'createdAt',
      title: t('render.createdAt'),
      width: 170,
      render: (_, batch) => formatDate(batch.createdAt),
    },
    ...(showProject
      ? [
          {
            key: 'project',
            title: t('render.project'),
            width: 220,
            render: (_: unknown, batch: ImportHistoryItem) => {
              const label = batch.projectName ?? batch.projectId;
              return (
                <Link to={`/projects/${batch.projectId}`} style={{ minWidth: 0 }}>
                  <Typography.Text ellipsis={{ tooltip: label }} style={{ color: 'inherit' }}>
                    {label}
                  </Typography.Text>
                </Link>
              );
            },
          },
        ]
      : []),
    {
      key: 'status',
      title: t('render.statusColumn'),
      width: 150,
      render: (_, batch) => (
        <Tag color={importStatusColor(batch.status)}>{importStatusLabel(batch.status, t)}</Tag>
      ),
    },
    {
      key: 'sourceFolders',
      title: t('googleDrive.sourceFolders'),
      width: 240,
      render: (_, batch) => (
        <ImportSourceFolders folders={batch.sourceFolders ?? []} maxVisible={2} />
      ),
    },
    {
      key: 'files',
      title: t('googleDrive.fileCountColumn'),
      width: 170,
      render: (_, batch) =>
        isImportScanning(batch) ? (
          scanning
        ) : (
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
      render: (_, batch) =>
        isImportScanning(batch) ? (
          scanning
        ) : (
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
      ellipsis: true,
      render: (_, batch) => batch.createdByUser?.name ?? batch.createdByUser?.email ?? '-',
    },
    {
      key: 'actions',
      width: 110,
      fixed: 'right',
      render: (_, batch) => (
        <Space size={4}>
          <Tooltip title={t('common.viewDetails')}>
            <Button
              size="small"
              icon={<EyeOutlined />}
              aria-label={t('common.viewDetails')}
              onClick={() => onViewItems(batch)}
            />
          </Tooltip>
          {IMPORT_PAUSABLE_STATUSES.includes(batch.status) ? (
            <Tooltip title={t('googleDrive.pauseImport')}>
              <Button
                size="small"
                icon={<PauseCircleOutlined />}
                aria-label={t('googleDrive.pauseImport')}
                loading={isPending(pauseImport, batch)}
                onClick={() => pauseImport.mutate(batch.id, { onError })}
              />
            </Tooltip>
          ) : null}
          {batch.status === 'paused' ? (
            <Tooltip title={t('googleDrive.resumeImport')}>
              <Button
                size="small"
                icon={<PlayCircleOutlined />}
                aria-label={t('googleDrive.resumeImport')}
                loading={isPending(resumeImport, batch)}
                onClick={() => resumeImport.mutate(batch.id, { onError })}
              />
            </Tooltip>
          ) : null}
          {[...IMPORT_PAUSABLE_STATUSES, 'paused'].includes(batch.status) ? (
            <Popconfirm
              title={t('googleDrive.cancelImportConfirm')}
              okButtonProps={{ danger: true }}
              onConfirm={() => cancelImport.mutateAsync(batch.id).catch(onError)}
            >
              <Tooltip title={t('googleDrive.cancelImport')}>
                <Button
                  size="small"
                  danger
                  icon={<StopOutlined />}
                  aria-label={t('googleDrive.cancelImport')}
                  loading={isPending(cancelImport, batch)}
                />
              </Tooltip>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <Table<ImportHistoryItem>
      rowKey="id"
      size="small"
      sticky={sticky}
      title={
        onRefresh
          ? () => (
              <Flex justify="flex-end">
                <TableRefreshButton onRefresh={onRefresh} refreshing={refreshing} size="small" />
              </Flex>
            )
          : undefined
      }
      loading={loading}
      columns={columns}
      dataSource={batches}
      scroll={{ x: showProject ? 1860 : 1640, y: scrollY }}
      pagination={pagination}
      onRow={(batch) => ({ onDoubleClick: () => onViewItems(batch) })}
      locale={{ emptyText: t('render.noImportHistory') }}
    />
  );
}
