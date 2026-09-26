import { Alert, Card, Flex, Input, Segmented, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAllImports } from '../hooks/use-google-drive';
import { IMPORT_FINISHED_STATUSES } from '../utils/import-format';
import { ImportBatchDrawer } from './import-batch-drawer';
import { ImportBatchTable } from './import-batch-table';

type StatusFilter = 'all' | 'active' | 'completed' | 'failed';

/** Google Drive import jobs across all projects (the Import Drive tab of the Log page). */
export function ImportHistoryPanel() {
  const { t } = useTranslation();
  const imports = useAllImports();
  const [selectedBatchId, setSelectedBatchId] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const batches = useMemo(() => imports.data ?? [], [imports.data]);
  const counts = useMemo(
    () => ({
      all: batches.length,
      active: batches.filter((batch) => !IMPORT_FINISHED_STATUSES.includes(batch.status)).length,
      completed: batches.filter((batch) => batch.status === 'completed').length,
      failed: batches.filter((batch) => ['failed', 'partial'].includes(batch.status)).length,
    }),
    [batches],
  );
  const filteredBatches = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return batches.filter((batch) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active'
          ? !IMPORT_FINISHED_STATUSES.includes(batch.status)
          : statusFilter === 'failed'
            ? ['failed', 'partial'].includes(batch.status)
            : batch.status === statusFilter);
      if (!matchesStatus) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return [
        batch.projectName,
        batch.createdByUser?.name,
        batch.createdByUser?.email,
        ...(batch.sourceFolders ?? []).map((folder) => folder.name),
      ].some((value) => value?.toLowerCase().includes(keyword));
    });
  }, [batches, search, statusFilter]);
  // Prefer the polled list entry so the drawer summary stays live.
  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId);

  return (
    <Card>
      <Flex vertical gap={16}>
        <Typography.Text type="secondary">{t('logs.importHint')}</Typography.Text>
        {imports.isError ? <Alert type="error" showIcon message={imports.error.message} /> : null}
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
            placeholder={t('logs.searchImports')}
            style={{ maxWidth: 320 }}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Flex>
        <ImportBatchTable
          batches={filteredBatches}
          loading={imports.isLoading}
          onViewItems={(batch) => setSelectedBatchId(batch.id)}
          showProject
        />
      </Flex>
      <ImportBatchDrawer
        batch={selectedBatch}
        open={Boolean(selectedBatchId)}
        onClose={() => setSelectedBatchId(undefined)}
      />
    </Card>
  );
}
