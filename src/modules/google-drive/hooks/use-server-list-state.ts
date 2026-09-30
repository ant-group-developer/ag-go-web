import type { TablePaginationConfig } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;

/**
 * Status tab, search, sort and page of a list paged on the server. A new filter, search or
 * sort starts again from the first page.
 */
export function useServerListState<
  Status extends string,
  Sort extends { sortBy: string; sortOrder: string },
>(defaultStatus: Status, defaultSort: Sort) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>(defaultStatus);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);
  const [sort, setSort] = useState(defaultSort);
  const [paging, setPaging] = useState({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
  const queryKey = `${status}|${search}|${sort.sortBy}|${sort.sortOrder}`;
  const [filterKey, setFilterKey] = useState(queryKey);
  if (filterKey !== queryKey) {
    setFilterKey(queryKey);
    setPaging((current) => ({ ...current, page: 1 }));
  }

  return {
    status,
    setStatus,
    setSearchInput,
    sort,
    setSort,
    /** Query params of the current page. */
    params: { status, search: search || undefined, sort, ...paging },
    /**
     * Table paging for a server answer of `total` rows. Rows leave a tab while it is polled
     * (e.g. running ones finish), so pass `settled` once the answer matches the params to move
     * back onto a real page.
     */
    pagination(total: number, settled: boolean): TablePaginationConfig {
      const lastPage = Math.max(1, Math.ceil(total / paging.pageSize));
      if (settled && paging.page > lastPage) {
        setPaging({ ...paging, page: lastPage });
      }
      return {
        current: paging.page,
        pageSize: paging.pageSize,
        total,
        showSizeChanger: true,
        pageSizeOptions: PAGE_SIZE_OPTIONS,
        hideOnSinglePage: false,
        showTotal: (count, range) =>
          t('common.paginationTotal', { start: range[0], end: range[1], total: count }),
        onChange: (page, pageSize) =>
          setPaging((current) =>
            // Changing the page size jumps back to the first page.
            pageSize !== current.pageSize ? { page: 1, pageSize } : { page, pageSize },
          ),
      };
    },
  };
}
