import { Alert, Flex, Input, Segmented, Table, Typography } from 'antd';
import type { TablePaginationConfig, TableProps } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TableRefreshButton } from '../../../shared/components/table-refresh-button';
import { PAGE_TABLE_STICKY } from '../../../shared/lib/sticky-table-header';
import type {
  RenderJob,
  RenderJobSort,
  RenderJobStatusCounts,
  RenderJobStatusFilter,
} from '../api/render';
import { useRetryRenderJob } from '../hooks/use-render';
import { DEFAULT_RENDER_JOB_SORT, sortRenderJobs } from '../utils/render-job-sort';
import { RenderJobOutputsTable } from './render-job-outputs-table';
import { RenderJobSortDropdown } from './render-job-sort-dropdown';
import { buildRenderJobColumns, RENDER_JOB_BASE_SCROLL_X } from './render-job-table-columns';

const ACTIVE_STATUSES = ['queued', 'processing'];
const CLIENT_PAGE_SIZE = 20;

/**
 * Filtering, sorting and paging done by the server: `jobs` is already the current page and the
 * table only reports filter / sort / page changes back.
 */
export type RenderJobTableServerMode = {
  counts: RenderJobStatusCounts;
  status: RenderJobStatusFilter;
  onStatusChange: (status: RenderJobStatusFilter) => void;
  onSearchChange: (text: string) => void;
  sort: RenderJobSort;
  onSortChange: (sort: RenderJobSort) => void;
  pagination: TablePaginationConfig;
};

type RenderJobTableProps = {
  jobs: RenderJob[];
  loading?: boolean;
  error?: string;
  /** Shown above the filters, e.g. where the jobs come from. */
  hint?: string;
  /** Show what queued each job (upload, Drive import, batch...). */
  showSource?: boolean;
  /** Show when and by whom each job was queued. */
  showCreated?: boolean;
  /** Hide the project column, e.g. inside a project page. */
  hideProject?: boolean;
  /** Fixed body height; rows scroll inside the table. */
  scrollY?: number;
  /** Sticky header offset; defaults to below the page header, use 0 inside drawers. */
  sticky?: TableProps<RenderJob>['sticky'];
  /** Omit to filter, sort and page the given jobs in the browser. */
  server?: RenderJobTableServerMode;
  /** Shows a reload button next to the search box. */
  onRefresh?: () => void;
  refreshing?: boolean;
};

/** One row per file with its original and rendered sizes, filterable by status and name. */
export function RenderJobTable({
  jobs,
  loading,
  error,
  hint,
  showSource,
  showCreated,
  hideProject,
  scrollY,
  sticky = PAGE_TABLE_STICKY,
  server,
  onRefresh,
  refreshing,
}: RenderJobTableProps) {
  const { t } = useTranslation();
  const retryJob = useRetryRenderJob();
  const [localStatus, setLocalStatus] = useState<RenderJobStatusFilter>('all');
  const [localSearch, setLocalSearch] = useState('');
  const [localSort, setLocalSort] = useState<RenderJobSort>(DEFAULT_RENDER_JOB_SORT);
  const statusFilter = server?.status ?? localStatus;
  const sort = server?.sort ?? localSort;

  const filteredJobs = useMemo(() => {
    if (server) {
      return jobs;
    }
    const keyword = localSearch.trim().toLocaleLowerCase('vi-VN');
    const matching = jobs.filter((job) => {
      const matchesStatus =
        localStatus === 'all' ||
        (localStatus === 'active' && ACTIVE_STATUSES.includes(job.status)) ||
        job.status === localStatus;
      const matchesSearch =
        !keyword ||
        (job.asset?.originalFilename ?? job.assetId).toLocaleLowerCase('vi-VN').includes(keyword) ||
        (job.project?.name ?? '').toLocaleLowerCase('vi-VN').includes(keyword);
      return matchesStatus && matchesSearch;
    });
    return sortRenderJobs(matching, localSort);
  }, [jobs, localSearch, localStatus, localSort, server]);

  const localCounts = useMemo<RenderJobStatusCounts>(
    () => ({
      all: jobs.length,
      active: jobs.filter((job) => ACTIVE_STATUSES.includes(job.status)).length,
      completed: jobs.filter((job) => job.status === 'completed').length,
      failed: jobs.filter((job) => job.status === 'failed').length,
      cancelled: jobs.filter((job) => job.status === 'cancelled').length,
    }),
    [jobs],
  );
  const counts = server?.counts ?? localCounts;

  const columns = buildRenderJobColumns({
    t,
    retryJob,
    showSource,
    showCreated,
    hideProject,
  });

  return (
    <Flex vertical gap={16}>
      {hint ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {hint}
        </Typography.Text>
      ) : null}
      {error ? <Alert type="error" showIcon message={error} /> : null}
      {retryJob.isError ? <Alert type="error" showIcon message={retryJob.error.message} /> : null}
      <Flex gap={12} wrap justify="space-between">
        <Segmented<RenderJobStatusFilter>
          value={statusFilter}
          onChange={server?.onStatusChange ?? setLocalStatus}
          options={[
            { value: 'all', label: `${t('render.filterAll')} (${counts.all})` },
            { value: 'active', label: `${t('render.status.processing')} (${counts.active})` },
            {
              value: 'completed',
              label: `${t('render.status.completed')} (${counts.completed})`,
            },
            { value: 'failed', label: `${t('render.status.failed')} (${counts.failed})` },
            {
              value: 'cancelled',
              label: `${t('render.status.cancelled')} (${counts.cancelled})`,
            },
          ]}
        />
        <Flex gap={8}>
          <Input.Search
            allowClear
            placeholder={t('render.searchJobs')}
            style={{ maxWidth: 280 }}
            onChange={(event) => (server?.onSearchChange ?? setLocalSearch)(event.target.value)}
          />
          <RenderJobSortDropdown value={sort} onChange={server?.onSortChange ?? setLocalSort} />
          {onRefresh ? <TableRefreshButton onRefresh={onRefresh} refreshing={refreshing} /> : null}
        </Flex>
      </Flex>
      <Table<RenderJob>
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={filteredJobs}
        sticky={sticky}
        scroll={{
          x: RENDER_JOB_BASE_SCROLL_X + (showSource ? 120 : 0) + (showCreated ? 170 : 0),
          y: scrollY,
        }}
        pagination={
          server?.pagination ?? {
            pageSize: CLIENT_PAGE_SIZE,
            hideOnSinglePage: true,
            showSizeChanger: false,
          }
        }
        expandable={{
          expandedRowRender: (job) => <RenderJobOutputsTable outputs={job.outputs ?? []} />,
          rowExpandable: (job) => (job.outputs?.length ?? 0) > 0,
        }}
        locale={{ emptyText: t('render.noJobs') }}
      />
    </Flex>
  );
}
