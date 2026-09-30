import { Alert, Descriptions, Drawer, Flex, Progress, Tag } from 'antd';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../shared/lib/format-date';
import { formatFileSize } from '../../../shared/lib/format-file-size';
import { CONTAINER_TABLE_STICKY } from '../../../shared/lib/sticky-table-header';
import type { ImportHistoryItem, ImportItemSortField } from '../api/google-drive';
import { useDriveImport, useImportItems } from '../hooks/use-google-drive';
import { useServerListState } from '../hooks/use-server-list-state';
import { DEFAULT_IMPORT_ITEM_SORT, IMPORT_ITEM_SORT_FIELDS } from '../utils/import-batch-sort';
import {
  IMPORT_FINISHED_STATUSES,
  importStatusColor,
  importStatusLabel,
  isFolderItem,
} from '../utils/import-format';
import { ImportItemsTable } from './import-items-table';
import { ImportListToolbar, type ImportListStatus } from './import-list-toolbar';
import { ImportSourceFolders } from './import-source-folders';

const EMPTY_COUNTS = { all: 0, active: 0, completed: 0, failed: 0 };

type ImportBatchDrawerProps = {
  batch?: ImportHistoryItem;
  open: boolean;
  onClose: () => void;
};

export function ImportBatchDrawer({ batch, open, onClose }: ImportBatchDrawerProps) {
  const { t } = useTranslation();
  const detail = useDriveImport(open && batch ? batch.id : '');
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
          <ImportBatchFiles
            key={batch.id}
            batchId={batch.id}
            live={!IMPORT_FINISHED_STATUSES.includes(current.status)}
          />
        </Flex>
      ) : null}
    </Drawer>
  );
}

/**
 * Files of the batch, paged, filtered, sorted and searched on the server. Lives inside the
 * drawer body, so its filters start over each time the drawer opens.
 */
function ImportBatchFiles({ batchId, live }: { batchId: string; live: boolean }) {
  const { t } = useTranslation();
  const list = useServerListState<ImportListStatus, typeof DEFAULT_IMPORT_ITEM_SORT>(
    'all',
    DEFAULT_IMPORT_ITEM_SORT,
  );
  const files = useImportItems(batchId, list.params, live);
  // Polling stops once the batch finishes: fetch once more so the last files show their result.
  const { refetch } = files;
  const wasLive = useRef(live);
  useEffect(() => {
    if (wasLive.current && !live) {
      void refetch();
    }
    wasLive.current = live;
  }, [live, refetch]);
  const sortLabels: Record<ImportItemSortField, string> = {
    createdAt: t('googleDrive.importOrder'),
    name: t('common.file'),
    size: t('media.size'),
    resolution: t('media.resolution'),
    duration: t('media.duration'),
    modifiedAt: t('projects.updatedAt'),
  };

  return (
    <>
      {files.isError ? <Alert type="error" showIcon message={files.error.message} /> : null}
      <ImportListToolbar<ImportItemSortField>
        counts={files.data?.counts ?? EMPTY_COUNTS}
        status={list.status}
        onStatusChange={list.setStatus}
        searchPlaceholder={t('googleDrive.searchFiles')}
        onSearchChange={list.setSearchInput}
        sortFields={IMPORT_ITEM_SORT_FIELDS.map((field) => ({
          value: field,
          label: sortLabels[field],
        }))}
        sort={list.sort}
        onSortChange={list.setSort}
        onRefresh={() => void files.refetch()}
        refreshing={files.isFetching}
      />
      <ImportItemsTable
        items={files.data?.items ?? []}
        loading={files.isLoading || (files.isPlaceholderData && files.isFetching)}
        sticky={CONTAINER_TABLE_STICKY}
        pagination={list.pagination(
          files.data?.total ?? 0,
          Boolean(files.data) && !files.isPlaceholderData,
        )}
      />
    </>
  );
}
