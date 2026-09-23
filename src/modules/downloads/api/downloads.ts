import { apiClient } from '../../../shared/lib/api-client';

export type DownloadResult =
  | {
      mode: 'single';
      url: string;
      expiresAt: string;
      mimeType: string;
      fileSizeBytes: string;
    }
  | {
      mode: 'job';
      downloadJobId: string;
      status: string;
      totalItems: number;
    };

export type DownloadJob = {
  id: string;
  status: string;
  totalItems: number;
  completedItems: number;
  downloadType: 'original' | 'rendered';
  url?: string | null;
};

export function createDownload(input: {
  scope: 'single' | 'multiple' | 'project';
  projectId?: string;
  projectMediaIds?: string[];
  downloadType: 'original' | 'rendered';
}) {
  return apiClient<DownloadResult>('/downloads', {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify(input),
  });
}

export function getDownload(id: string) {
  return apiClient<DownloadJob>(`/downloads/${id}`);
}

export function cancelDownload(id: string) {
  return apiClient<DownloadJob>(`/downloads/${id}/cancel`, { method: 'POST' });
}
