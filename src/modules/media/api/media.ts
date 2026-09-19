import { apiClient } from '../../../shared/lib/api-client';

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
  assetType: 'image' | 'video';
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
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
