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
  createdAt: string;
};

export type ImportItem = {
  id: string;
  batchId: string;
  sourceName: string;
  sourceMimeType: string | null;
  status: string;
  errorMessage: string | null;
};

export type DriveSourceSummary = {
  imageCount: number;
  videoCount: number;
  fileCount: number;
  folderCount: number;
  unsupportedCount: number;
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

export function summarizeGoogleDriveSources(
  sources: Array<{ fileId: string; driveId?: string }>,
) {
  return apiClient<DriveSourceSummary>('/google-drive/sources/summary', {
    method: 'POST',
    body: JSON.stringify({ sources }),
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

export function cancelDriveImport(id: string) {
  return apiClient<ImportBatch>(`/google-drive/imports/${id}/cancel`, { method: 'POST' });
}

export function retryDriveImportItem(batchId: string, itemId: string) {
  return apiClient<ImportItem>(`/google-drive/imports/${batchId}/items/${itemId}/retry`, {
    method: 'POST',
  });
}
