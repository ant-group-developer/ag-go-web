import type {
  ImportHistorySort,
  ImportHistorySortField,
  ImportItemSort,
  ImportItemSortField,
} from '../api/google-drive';

export const IMPORT_HISTORY_SORT_FIELDS: readonly ImportHistorySortField[] = [
  'createdAt',
  'finishedAt',
  'project',
  'fileCount',
  'totalBytes',
  'progress',
];

/** Newest first, the order the server returns without a sort. */
export const DEFAULT_IMPORT_HISTORY_SORT: ImportHistorySort = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export const IMPORT_ITEM_SORT_FIELDS: readonly ImportItemSortField[] = [
  'createdAt',
  'name',
  'size',
  'resolution',
  'duration',
  'modifiedAt',
];

/** Import order, the order the server returns without a sort. */
export const DEFAULT_IMPORT_ITEM_SORT: ImportItemSort = { sortBy: 'createdAt', sortOrder: 'asc' };
