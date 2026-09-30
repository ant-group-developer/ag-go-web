import { Flex, Input, Segmented } from 'antd';
import { useTranslation } from 'react-i18next';
import { SortDropdown } from '../../../shared/components/sort-dropdown';
import { TableRefreshButton } from '../../../shared/components/table-refresh-button';
import type { SortDirection } from '../../../shared/lib/compare-sort-values';

/** Status tabs shared by the import history and a batch's files. */
export type ImportListStatus = 'all' | 'active' | 'completed' | 'failed';

type ImportListToolbarProps<F extends string> = {
  counts: Record<ImportListStatus, number>;
  status: ImportListStatus;
  onStatusChange: (status: ImportListStatus) => void;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  sortFields: readonly { value: F; label: string }[];
  sort: { sortBy: F; sortOrder: SortDirection };
  onSortChange: (sort: { sortBy: F; sortOrder: SortDirection }) => void;
  onRefresh: () => void;
  refreshing?: boolean;
};

/** One row above an import table: status tabs on the left; search, sort and reload on the right. */
export function ImportListToolbar<F extends string>({
  counts,
  status,
  onStatusChange,
  searchPlaceholder,
  onSearchChange,
  sortFields,
  sort,
  onSortChange,
  onRefresh,
  refreshing,
}: ImportListToolbarProps<F>) {
  const { t } = useTranslation();
  return (
    <Flex gap={12} wrap justify="space-between">
      <Segmented<ImportListStatus>
        value={status}
        onChange={onStatusChange}
        options={[
          { value: 'all', label: `${t('render.filterAll')} (${counts.all})` },
          { value: 'active', label: `${t('googleDrive.status.importing')} (${counts.active})` },
          {
            value: 'completed',
            label: `${t('googleDrive.status.completed')} (${counts.completed})`,
          },
          { value: 'failed', label: `${t('googleDrive.status.failed')} (${counts.failed})` },
        ]}
      />
      <Flex gap={8}>
        <Input.Search
          allowClear
          placeholder={searchPlaceholder}
          style={{ maxWidth: 320 }}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <SortDropdown<F>
          fields={sortFields}
          sortBy={sort.sortBy}
          sortOrder={sort.sortOrder}
          onChange={(change) => onSortChange({ ...sort, ...change })}
        />
        <TableRefreshButton onRefresh={onRefresh} refreshing={refreshing} />
      </Flex>
    </Flex>
  );
}
