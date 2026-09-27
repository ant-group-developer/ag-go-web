import { Alert, Flex, Input, Segmented, Table, Typography } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RenderJob, RenderJobStatusCounts, RenderJobStatusFilter } from '../api/render';
import { useRetryRenderJob } from '../hooks/use-render';
import { RenderJobOutputsTable } from './render-job-outputs-table';
import { buildRenderJobColumns, RENDER_JOB_BASE_SCROLL_X } from './render-job-table-columns';

const ACTIVE_STATUSES = ['queued', 'processing'];
const CLIENT_PAGE_SIZE = 20;

/**
 * Filtering and paging done by the server: `jobs` is already the current page and the table
 * only reports filter / page changes back.
 */
export type RenderJobTableServerMode = {
  counts: RenderJobStatusCounts;
  status: RenderJobStatusFilter;
  onStatusChange: (status: RenderJobStatusFilter) => void;
  onSearchChange: (text: string) => void;
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
  /** Omit to filter and page the given jobs in the browser. */
  server?: RenderJobTableServerMode;
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
  server,
}: RenderJobTableProps) {
  const { t } = useTranslation();
  const retryJob = useRetryRenderJob();
  const [localStatus, setLocalStatus] = useState<RenderJobStatusFilter>('all');
  const [localSearch, setLocalSearch] = useState('');
  const statusFilter = server?.status ?? localStatus;

  const filteredJobs = useMemo(() => {
    if (server) {
      return jobs;
    }
    const keyword = localSearch.trim().toLocaleLowerCase('vi-VN');
    return jobs.filter((job) => {
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
  }, [jobs, localSearch, localStatus, server]);

  const localCounts = useMemo<RenderJobStatusCounts>(
    () => ({
      all: jobs.length,
      active: jobs.filter((job) => ACTIVE_STATUSES.includes(job.status)).length,
      completed: jobs.filter((job) => job.status === 'completed').length,
      failed: jobs.filter((job) => job.status === 'failed').length,
    }),
    [jobs],
  );
  const counts = server?.counts ?? localCounts;

  const columns = buildRenderJobColumns({ t, retryJob, showSource, showCreated, hideProject });

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
          ]}
        />
        <Input.Search
          allowClear
          placeholder={t('render.searchJobs')}
          style={{ maxWidth: 280 }}
          onChange={(event) => (server?.onSearchChange ?? setLocalSearch)(event.target.value)}
        />
      </Flex>
      <Table<RenderJob>
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={filteredJobs}
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
