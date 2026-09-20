import axios from 'axios';
import { apiBlob, apiClient, ApiError, apiUrl } from '../../../shared/lib/api-client';

export type Asset = {
  id: string;
  assetType: 'image' | 'video';
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: string;
  processingStatus: string;
};

export type ProjectMedia = {
  id: string;
  projectId: string;
  assetId: string;
  sortOrder: number;
  caption: string | null;
  asset: Asset;
};

export type ProjectMediaPage = {
  items: ProjectMedia[];
  nextCursor: string | null;
};

export type AttachProjectMediaInput = {
  assetId?: string;
  assetType?: 'image' | 'video';
  originalFilename?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  caption?: string;
  sortOrder?: number;
};

export function getProjectMedia(projectId: string): Promise<ProjectMediaPage> {
  return apiClient<ProjectMediaPage>(`/projects/${projectId}/media`);
}

export function attachProjectMedia(
  projectId: string,
  input: AttachProjectMediaInput,
): Promise<ProjectMedia> {
  return apiClient<ProjectMedia>(`/projects/${projectId}/media`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function removeProjectMedia(mediaId: string): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/project-media/${mediaId}`, {
    method: 'DELETE',
  });
}

export function reorderProjectMedia(projectId: string, mediaIds: string[]) {
  return apiClient<{ success: boolean }>(`/projects/${projectId}/reorder-media`, {
    method: 'PATCH',
    body: JSON.stringify({ mediaIds }),
  });
}

export function setProjectThumbnail(projectId: string, projectMediaId: string | null) {
  return apiClient(`/projects/${projectId}/thumbnail`, {
    method: 'PATCH',
    body: JSON.stringify({ projectMediaId }),
  });
}

export async function getAssetPreviewUrl(
  assetId: string,
  variantCode = 'thumbnail',
): Promise<string> {
  return URL.createObjectURL(await apiBlob(`/assets/${assetId}/preview/${variantCode}`));
}

export type UploadSession = {
  assetId: string;
  uploadSessionId: string;
  uploadUrl: string;
  expiresAt: string;
  status: string;
};

export type CreateUploadSessionInput = {
  assetType: 'image' | 'video';
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
};

export function createUploadSession(
  input: CreateUploadSessionInput,
  idempotencyKey: string,
): Promise<UploadSession> {
  return apiClient<UploadSession>('/assets/upload-session', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(input),
  });
}

export function uploadAssetContent(
  session: UploadSession,
  file: File,
  onProgress: (progress: number) => void,
): Promise<void> {
  return axios
    .put(apiUrl(session.uploadUrl), file, {
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      onUploadProgress: (event) => {
        if (event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    })
    .then(() => {
      onProgress(100);
    })
    .catch((error: unknown) => {
      if (axios.isAxiosError(error)) {
        throw new ApiError(
          error.response?.data || error.message || 'Upload failed',
          error.response?.status ?? 0,
        );
      }
      throw error;
    });
}

export function completeUpload(assetId: string, uploadSessionId: string) {
  return apiClient<{ id: string; processingStatus: string; renderJobId: string }>(
    `/assets/${assetId}/complete`,
    {
      method: 'POST',
      body: JSON.stringify({ uploadSessionId }),
    },
  );
}

export function abortUpload(assetId: string, uploadSessionId: string) {
  return apiClient<{ success: boolean }>(`/assets/${assetId}/abort`, {
    method: 'POST',
    body: JSON.stringify({ uploadSessionId }),
  });
}
