import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value';
import type { RenderJobSort, RenderJobStatusFilter } from '../api/render';
import { useAutoRenderJobs } from '../hooks/use-render';
import { DEFAULT_RENDER_JOB_SORT } from '../utils/render-job-sort';
import { RenderJobTable } from './render-job-table';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;
const EMPTY_COUNTS = { all: 0, active: 0, completed: 0, failed: 0, cancelled: 0 };

type AutoRenderJobTableProps = {
  /** Limit to one project; omit for every project the user can view. */
  projectId?: string;
  /** Skip fetching, e.g. while the tab holding the table is hidden. */
  enabled?: boolean;
  hint?: string;
  hideProject?: boolean;
  scrollY?: number;
};

/**
 * Every render job queued automatically by uploads and Drive imports, paged, filtered, sorted
 * and searched on the server so no job is cut off.
 */
export function AutoRenderJobTable({
  projectId,
  enabled = true,
  hint,
  hideProject,
  scrollY,
}: AutoRenderJobTableProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<RenderJobStatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);
  const [sort, setSort] = useState<RenderJobSort>(DEFAULT_RENDER_JOB_SORT);
  const [paging, setPaging] = useState({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
  // A new filter, search or sort starts again from the first page.
  const queryKey = `${status}|${search}|${sort.sortBy}|${sort.sortOrder}`;
  const [filterKey, setFilterKey] = useState(queryKey);
  if (filterKey !== queryKey) {
    setFilterKey(queryKey);
    setPaging((current) => ({ ...current, page: 1 }));
  }

  const jobs = useAutoRenderJobs(
    { projectId, status, search: search || undefined, sort, ...paging },
    enabled && (projectId === undefined || Boolean(projectId)),
  );
  // Jobs leave a tab while it is polled (e.g. "processing" ones finish): stay on a real page.
  const lastPage = Math.max(1, Math.ceil((jobs.data?.total ?? 0) / paging.pageSize));
  if (jobs.data && !jobs.isPlaceholderData && paging.page > lastPage) {
    setPaging({ ...paging, page: lastPage });
  }

  return (
    <RenderJobTable
      jobs={jobs.data?.items ?? []}
      loading={jobs.isLoading || (jobs.isPlaceholderData && jobs.isFetching)}
      error={jobs.isError ? jobs.error.message : undefined}
      hint={hint}
      showSource
      showCreated
      hideProject={hideProject}
      scrollY={scrollY}
      onRefresh={() => void jobs.refetch()}
      refreshing={jobs.isFetching}
      server={{
        counts: jobs.data?.counts ?? EMPTY_COUNTS,
        status,
        onStatusChange: setStatus,
        onSearchChange: setSearchInput,
        sort,
        onSortChange: setSort,
        pagination: {
          current: paging.page,
          pageSize: paging.pageSize,
          total: jobs.data?.total ?? 0,
          showSizeChanger: true,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          hideOnSinglePage: false,
          showTotal: (total, range) =>
            t('common.paginationTotal', { start: range[0], end: range[1], total }),
          onChange: (page, pageSize) =>
            setPaging((current) =>
              // Changing the page size jumps back to the first page.
              pageSize !== current.pageSize ? { page: 1, pageSize } : { page, pageSize },
            ),
        },
      }}
    />
  );
}
