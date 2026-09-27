import { Alert, Descriptions, Drawer, Flex, Input, Progress, Segmented, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../shared/lib/format-date';
import { formatFileSize } from '../../../shared/lib/format-file-size';
import { CONTAINER_TABLE_STICKY } from '../../../shared/lib/sticky-table-header';
import type { ImportHistoryItem } from '../api/google-drive';
import { useDriveImport } from '../hooks/use-google-drive';
import {
  displayFilename,
  importStatusColor,
  importStatusLabel,
  isFolderItem,
} from '../utils/import-format';
import { ImportItemsTable } from './import-items-table';
import { ImportSourceFolders } from './import-source-folders';

type StatusFilter = 'all' | 'active' | 'completed' | 'failed';

const ACTIVE_STATUSES = ['queued', 'importing'];

type ImportBatchDrawerProps = {
  batch?: ImportHistoryItem;
  open: boolean;
  onClose: () => void;
};

export function ImportBatchDrawer({ batch, open, onClose }: ImportBatchDrawerProps) {
  const { t } = useTranslation();
  const detail = useDriveImport(open && batch ? batch.id : '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const files = useMemo(
    () => (detail.data?.items ?? []).filter((item) => !isFolderItem(item)),
    [detail.data],
  );
  const counts = useMemo(
    () => ({
      all: files.length,
      active: files.filter((item) => ACTIVE_STATUSES.includes(item.status)).length,
      completed: files.filter((item) => item.status === 'completed').length,
      failed: files.filter((item) => item.status === 'failed').length,
    }),
    [files],
  );
  const filteredFiles = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return files.filter((item) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active'
          ? ACTIVE_STATUSES.includes(item.status)
          : item.status === statusFilter);
      return (
        matchesStatus &&
        (!keyword ||
          displayFilename(item.sourceName, item.sourceMimeType).toLowerCase().includes(keyword))
      );
    });
  }, [files, search, statusFilter]);

  // Prefer the live detail (polled while importing) over the list snapshot.
  const current = detail.data ?? batch;
  const sourceFolders = useMemo(
    () =>
      detail.data
        ? detail.data.items.filter(isFolderItem).map((item) => ({
            fileId: item.sourceFileId,
            name: item.sourceName,
            status: item.status,
          }))
        : (batch?.sourceFolders ?? []),
    [batch, detail.data],
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="min(1280px, 100vw)"
      title={t('render.importDetailsTitle')}
      extra={
        current ? (
          <Tag color={importStatusColor(current.status)}>
            {importStatusLabel(current.status, t)}
          </Tag>
        ) : null
      }
      destroyOnHidden
    >
      {batch && current ? (
        <Flex vertical gap={16}>
          <Descriptions size="small" bordered column={{ xs: 1, md: 2, xl: 4 }}>
            <Descriptions.Item label={t('render.createdAt')}>
              {formatDate(batch.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label={t('googleDrive.finishedAt')}>
              {formatDate(batch.finishedAt)}
            </Descriptions.Item>
            <Descriptions.Item label={t('render.createdBy')}>
              {batch.createdByUser?.name ?? batch.createdByUser?.email ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('googleDrive.duplicatePolicy')}>
              {t(`googleDrive.duplicatePolicies.${batch.duplicatePolicy}`)}
            </Descriptions.Item>
            <Descriptions.Item label={t('googleDrive.fileCountColumn')}>
              {t('googleDrive.fileCount', { count: batch.fileCount })}
              {' · '}
              {t('googleDrive.imageCount', { count: batch.imageCount })}
              {' · '}
              {t('googleDrive.videoCount', { count: batch.videoCount })}
            </Descriptions.Item>
            <Descriptions.Item label={t('render.fileSize')}>
              {formatFileSize(batch.totalBytes)}
              {batch.importedBytes !== batch.totalBytes
                ? ` (${t('googleDrive.importedSize', { size: formatFileSize(batch.importedBytes) })})`
                : null}
            </Descriptions.Item>
            <Descriptions.Item label={t('googleDrive.sourceFolders')} span="filled">
              <ImportSourceFolders folders={sourceFolders} />
            </Descriptions.Item>
          </Descriptions>
          <Progress
            percent={current.progressPercent}
            success={{
              percent: current.totalItems ? (current.completedItems / current.totalItems) * 100 : 0,
            }}
            status={current.failedItems > 0 ? 'exception' : undefined}
            format={() => `${current.completedItems}/${current.totalItems}`}
          />
          {detail.isError ? <Alert type="error" showIcon message={detail.error.message} /> : null}
          <Flex gap={12} wrap justify="space-between">
            <Segmented<StatusFilter>
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: `${t('render.filterAll')} (${counts.all})` },
                {
                  value: 'active',
                  label: `${t('googleDrive.status.importing')} (${counts.active})`,
                },
                {
                  value: 'completed',
                  label: `${t('googleDrive.status.completed')} (${counts.completed})`,
                },
                { value: 'failed', label: `${t('googleDrive.status.failed')} (${counts.failed})` },
              ]}
            />
            <Input.Search
              allowClear
              placeholder={t('googleDrive.searchFiles')}
              style={{ maxWidth: 280 }}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Flex>
          <ImportItemsTable
            items={filteredFiles}
            loading={detail.isLoading}
            paginate
            sticky={CONTAINER_TABLE_STICKY}
            onRefresh={() => void detail.refetch()}
            refreshing={detail.isFetching}
          />
        </Flex>
      ) : null}
    </Drawer>
  );
}
