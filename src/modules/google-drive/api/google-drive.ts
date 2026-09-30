import { apiClient } from '../../../shared/lib/api-client';

export type GoogleDriveConnection = {
  id: string;
  googleSubject: string;
  scopes: string[];
  status: 'active' | 'revoked' | 'error';
  expiresAt: string | null;
  revokedAt: string | null;
  lastError?: string | null;
};

export type ImportBatch = {
  id: string;
  projectId: string;
  status: string;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  progressPercent: number;
  duplicatePolicy: DuplicatePolicy;
  createdAt: string;
};

export type DuplicatePolicy = 'create_new' | 'reuse_existing' | 'overwrite_existing';

export type ImportHistoryItem = ImportBatch & {
  /** Files in the batch, excluding traversed folders. */
  fileCount: number;
  imageCount: number;
  videoCount: number;
  totalBytes: string;
  importedBytes: string;
  reusedCount: number;
  finishedAt: string | null;
  updatedAt: string;
  createdByUser?: { id: string; name?: string; email?: string } | null;
  /** Google Drive folders picked as sources of the batch (subfolders are not listed). */
  sourceFolders: ImportSourceFolder[];
  /** Only set by the cross-project listing (`getAllImports`). */
  projectName?: string | null;
};

export type ImportSourceFolder = {
  fileId: string | null;
  name: string;
  status: string;
};

export type ImportItem = {
  id: string;
  batchId: string;
  sourceFileId: string | null;
  sourceName: string;
  sourceMimeType: string | null;
  sourceSizeBytes: string | null;
  sourceWidth: number | null;
  sourceHeight: number | null;
  sourceDurationSeconds: string | null;
  sourceCreator: string | null;
  sourceModifiedAt: string | null;
  resolution: 'created' | 'reused' | 'overwritten' | null;
  status: string;
  errorMessage: string | null;
};

export type DriveSourceSummary = {
  imageCount: number;
  videoCount: number;
  fileCount: number;
  folderCount: number;
  unsupportedCount: number;
  totalBytes: string;
  duplicateCount: number;
  duplicates: Array<{
    fileId: string;
    name: string;
    existingAssetId: string;
    existingProjectMediaId: string;
    createdAt: string;
  }>;
};

export function getGoogleDriveConnection() {
  return apiClient<GoogleDriveConnection | null>('/google-drive/connection');
}

export function startGoogleDriveConnection(input?: { projectId?: string; returnUrl?: string }) {
  const query = new URLSearchParams();
  if (input?.projectId) {
    query.set('projectId', input.projectId);
  }
  if (input?.returnUrl) {
    query.set('returnUrl', input.returnUrl);
  }
  const queryString = query.toString();
  return apiClient<{ authorizationUrl: string; state: string }>(
    `/google-drive/connection/start${queryString ? `?${queryString}` : ''}`,
    { method: 'POST' },
  );
}

export function getGoogleDrivePickerToken() {
  return apiClient<{ accessToken: string; expiresAt: string }>('/google-drive/picker-token');
}

export function summarizeGoogleDriveSources(input: {
  projectId: string;
  sources: Array<{ fileId: string; driveId?: string }>;
}) {
  return apiClient<DriveSourceSummary>('/google-drive/sources/summary', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function disconnectGoogleDrive() {
  return apiClient<{ success: boolean }>('/google-drive/connection', { method: 'DELETE' });
}

export function createDriveImport(input: {
  projectId: string;
  sources: Array<{
    fileId: string;
    driveId?: string;
    name?: string;
    mimeType?: string;
  }>;
  duplicatePolicy?: DuplicatePolicy;
  idempotencyKey?: string;
}) {
  return apiClient<ImportBatch>('/google-drive/imports', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getDriveImport(id: string) {
  return apiClient<ImportBatch & { items: ImportItem[] }>(`/google-drive/imports/${id}`);
}

/** Status tabs of a batch's files; 'active' groups queued and importing files. */
export type ImportItemStatusFilter = 'all' | 'active' | 'completed' | 'failed';

/** Server-sortable file columns; `createdAt` is the import order. */
export type ImportItemSortField =
  'createdAt' | 'name' | 'size' | 'resolution' | 'duration' | 'modifiedAt';

export type ImportItemSort = { sortBy: ImportItemSortField; sortOrder: 'asc' | 'desc' };

export type ImportItemsParams = {
  page: number;
  pageSize: number;
  status: ImportItemStatusFilter;
  search?: string;
  /** Omit for the import order. */
  sort?: ImportItemSort;
};

export type ImportItemsPage = {
  items: ImportItem[];
  total: number;
  page: number;
  pageSize: number;
  /** Files per status tab (search applied, status filter not). */
  counts: Record<ImportItemStatusFilter, number>;
};

/** One page of the files of a batch (source folders left out). */
export function getImportItems(
  batchId: string,
  { page, pageSize, status, search, sort }: ImportItemsParams,
) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    status,
  });
  if (search) {
    query.set('search', search);
  }
  if (sort) {
    query.set('sortBy', sort.sortBy);
    query.set('sortOrder', sort.sortOrder);
  }
  return apiClient<ImportItemsPage>(`/google-drive/imports/${batchId}/items?${query.toString()}`);
}

export function getProjectImports(projectId: string) {
  return apiClient<ImportHistoryItem[]>(
    `/google-drive/imports?projectId=${encodeURIComponent(projectId)}`,
  );
}

/** Import jobs across all projects: every batch for admins, otherwise the caller's own. */
/** Status tabs of the import history; 'active' groups batches not finished yet. */
export type ImportHistoryStatusFilter = 'all' | 'active' | 'completed' | 'failed';

export type ImportHistoryStatusCounts = Record<ImportHistoryStatusFilter, number>;

/** Server-sortable import history columns. */
export type ImportHistorySortField =
  'createdAt' | 'finishedAt' | 'project' | 'fileCount' | 'totalBytes' | 'progress';

export type ImportHistorySort = { sortBy: ImportHistorySortField; sortOrder: 'asc' | 'desc' };

export type ImportHistoryParams = {
  page: number;
  pageSize: number;
  status: ImportHistoryStatusFilter;
  search?: string;
  /** Omit for newest first. */
  sort?: ImportHistorySort;
};

export type ImportHistoryPage = {
  items: ImportHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  /** Batches per status tab (search applied, status filter not). */
  counts: ImportHistoryStatusCounts;
};

/** One page of the Drive imports of every project the user can see, newest first unless `sort` is given. */
export function getAllImports({ page, pageSize, status, search, sort }: ImportHistoryParams) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    status,
  });
  if (search) {
    query.set('search', search);
  }
  if (sort) {
    query.set('sortBy', sort.sortBy);
    query.set('sortOrder', sort.sortOrder);
  }
  return apiClient<ImportHistoryPage>(`/google-drive/imports?${query.toString()}`);
}

export function cancelDriveImport(id: string) {
  return apiClient<ImportBatch>(`/google-drive/imports/${id}/cancel`, { method: 'POST' });
}

export function pauseDriveImport(id: string) {
  return apiClient<ImportBatch>(`/google-drive/imports/${id}/pause`, { method: 'POST' });
}

export function resumeDriveImport(id: string) {
  return apiClient<ImportBatch>(`/google-drive/imports/${id}/resume`, { method: 'POST' });
}

export function retryDriveImportItem(batchId: string, itemId: string) {
  return apiClient<ImportItem>(`/google-drive/imports/${batchId}/items/${itemId}/retry`, {
    method: 'POST',
  });
}
