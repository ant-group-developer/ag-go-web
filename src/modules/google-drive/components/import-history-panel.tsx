import { Alert, Card, Flex, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ImportHistoryItem, ImportHistorySortField } from '../api/google-drive';
import { useAllImports } from '../hooks/use-google-drive';
import { useServerListState } from '../hooks/use-server-list-state';
import {
  DEFAULT_IMPORT_HISTORY_SORT,
  IMPORT_HISTORY_SORT_FIELDS,
} from '../utils/import-batch-sort';
import { ImportBatchDrawer } from './import-batch-drawer';
import { ImportBatchTable } from './import-batch-table';
import { ImportListToolbar, type ImportListStatus } from './import-list-toolbar';

const EMPTY_COUNTS = { all: 0, active: 0, completed: 0, failed: 0 };

/**
 * Google Drive import jobs across all projects (the Import Drive tab of the Log page), paged,
 * filtered, sorted and searched on the server so every job can be browsed.
 */
export function ImportHistoryPanel() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<ImportHistoryItem>();
  const list = useServerListState<ImportListStatus, typeof DEFAULT_IMPORT_HISTORY_SORT>(
    'all',
    DEFAULT_IMPORT_HISTORY_SORT,
  );
  const imports = useAllImports(list.params);
  const batches = imports.data?.items ?? [];
  const sortLabels: Record<ImportHistorySortField, string> = {
    createdAt: t('render.createdAt'),
    finishedAt: t('googleDrive.finishedAt'),
    project: t('render.project'),
    fileCount: t('googleDrive.fileCountColumn'),
    totalBytes: t('render.fileSize'),
    progress: t('render.progress'),
  };
  // Prefer the polled page entry so the drawer summary stays live; keep the clicked one when
  // the batch moves off this page.
  const selectedBatch = batches.find((batch) => batch.id === selected?.id) ?? selected;

  return (
    <Card>
      <Flex vertical gap={16}>
        <Typography.Text type="secondary">{t('logs.importHint')}</Typography.Text>
        {imports.isError ? <Alert type="error" showIcon message={imports.error.message} /> : null}
        <ImportListToolbar<ImportHistorySortField>
          counts={imports.data?.counts ?? EMPTY_COUNTS}
          status={list.status}
          onStatusChange={list.setStatus}
          searchPlaceholder={t('logs.searchImports')}
          onSearchChange={list.setSearchInput}
          sortFields={IMPORT_HISTORY_SORT_FIELDS.map((field) => ({
            value: field,
            label: sortLabels[field],
          }))}
          sort={list.sort}
          onSortChange={list.setSort}
          onRefresh={() => void imports.refetch()}
          refreshing={imports.isFetching}
        />
        <ImportBatchTable
          batches={batches}
          loading={imports.isLoading || (imports.isPlaceholderData && imports.isFetching)}
          onViewItems={setSelected}
          showProject
          pagination={list.pagination(
            imports.data?.total ?? 0,
            Boolean(imports.data) && !imports.isPlaceholderData,
          )}
        />
      </Flex>
      <ImportBatchDrawer
        batch={selectedBatch}
        open={Boolean(selected)}
        onClose={() => setSelected(undefined)}
      />
    </Card>
  );
}
