import { ReloadOutlined } from '@ant-design/icons';
import { Button, Flex, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { TableRefreshButton } from '../../../shared/components/table-refresh-button';
import { formatDate } from '../../../shared/lib/format-date';
import { formatFileSize } from '../../../shared/lib/format-file-size';
import { PAGE_TABLE_STICKY } from '../../../shared/lib/sticky-table-header';
import type { ImportItem } from '../api/google-drive';
import { useRetryDriveImportItem } from '../hooks/use-google-drive';
import {
  displayFilename,
  formatDimensions,
  formatDuration,
  importStatusColor,
  importStatusLabel,
} from '../utils/import-format';

type ImportItemsTableProps = {
  items: ImportItem[];
  loading?: boolean;
  /** Paginate long lists (history drawer); the live progress card shows every row. */
  paginate?: boolean;
  /** Fixed body height; rows scroll inside the table. */
  scrollY?: number;
  /** `sticky` config for the header; defaults to the page-level offset (56px ProLayout header). */
  sticky?: TableProps<ImportItem>['sticky'];
  /** Refetches the items list; renders a reload button above the table when given. */
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function ImportItemsTable({
  items,
  loading,
  paginate,
  scrollY,
  sticky,
  onRefresh,
  refreshing,
}: ImportItemsTableProps) {
  const { t } = useTranslation();
  const retryItem = useRetryDriveImportItem();
  const columns: ColumnsType<ImportItem> = [
    {
      key: 'file',
      title: t('common.file'),
      width: 300,
      ellipsis: { showTitle: false },
      render: (_, item) => {
        const name = displayFilename(item.sourceName, item.sourceMimeType);
        return (
          <Typography.Text
            ellipsis={{ tooltip: name }}
            style={{ maxWidth: '100%', display: 'block' }}
          >
            {name}
          </Typography.Text>
        );
      },
    },
    {
      key: 'size',
      title: t('media.size'),
      width: 110,
      render: (_, item) => formatFileSize(item.sourceSizeBytes),
    },
    {
      key: 'resolution',
      title: t('media.resolution'),
      width: 130,
      render: (_, item) => formatDimensions(item.sourceWidth, item.sourceHeight),
    },
    {
      key: 'duration',
      title: t('media.duration'),
      width: 100,
      render: (_, item) => formatDuration(item.sourceDurationSeconds),
    },
    // Tạm ẩn cột người tạo
    {
      key: 'modifiedAt',
      title: t('projects.updatedAt'),
      width: 170,
      render: (_, item) => formatDate(item.sourceModifiedAt),
    },
    {
      key: 'status',
      title: t('common.status'),
      width: 200,
      render: (_, item) => (
        <Space direction="vertical" size={2}>
          <Tag color={importStatusColor(item.status)}>{importStatusLabel(item.status, t)}</Tag>
          {item.errorMessage ? (
            <Typography.Text
              type="danger"
              ellipsis={{ tooltip: item.errorMessage }}
              style={{ maxWidth: 190, fontSize: 12 }}
            >
              {item.errorMessage}
            </Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      key: 'outcome',
      title: t('googleDrive.resolution'),
      width: 170,
      render: (_, item) =>
        item.resolution ? <Tag>{t(`googleDrive.resolutions.${item.resolution}`)}</Tag> : '-',
    },
    {
      key: 'actions',
      title: t('common.actions'),
      width: 110,
      fixed: 'right',
      render: (_, item) =>
        item.status === 'failed' ? (
          <Button
            size="small"
            icon={<ReloadOutlined />}
            loading={retryItem.isPending && retryItem.variables?.itemId === item.id}
            onClick={() => retryItem.mutate({ batchId: item.batchId, itemId: item.id })}
          >
            {t('common.retry')}
          </Button>
        ) : null,
    },
  ];

  return (
    <Table<ImportItem>
      size="small"
      rowKey="id"
      sticky={sticky ?? PAGE_TABLE_STICKY}
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
      scroll={{ x: 1300, y: scrollY }}
      columns={columns}
      dataSource={items}
      pagination={
        paginate ? { pageSize: 20, hideOnSinglePage: true, showSizeChanger: false } : false
      }
    />
  );
}
