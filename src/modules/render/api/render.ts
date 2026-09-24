import { apiClient } from '../../../shared/lib/api-client';
import {
  uploadAssetContent,
  type UploadSession,
} from '../../media/api/media';

export const WATERMARK_POSITIONS = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'center',
] as const;

export type WatermarkPosition = (typeof WATERMARK_POSITIONS)[number];

export type WatermarkConfig = {
  text: string;
  logoAssetId: string | null;
  color: string;
  fontFamily: string;
  fontSize: number;
  repeat: boolean;
  gapX: number;
  gapY: number;
  rotate: number;
  maxWidth: number | null;
  position: WatermarkPosition;
  opacity: number;
  scale: number;
  margin: number;
};

export type RenderProfile = {
  id: string;
  name: string;
  code: string;
  profileVersion: number;
  outputFormat: string;
  maxWidth: number | null;
  maxHeight: number | null;
  imageQuality: number;
  videoBitrateBps: string | null;
  watermarkEnabled: boolean;
  watermarkConfig: WatermarkConfig;
};

export type RenderBatch = {
  id: string;
  projectId: string | null;
  folderId: string | null;
  status: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  progressPercent: number;
  createdAt: string;
};

export function getRenderProfiles() {
  return apiClient<RenderProfile[]>('/render-profiles');
}

export type UpdateRenderProfileInput = Partial<
  Pick<
    RenderProfile,
    | 'name'
    | 'outputFormat'
    | 'maxWidth'
    | 'maxHeight'
    | 'imageQuality'
    | 'videoBitrateBps'
    | 'watermarkEnabled'
    | 'watermarkConfig'
  >
>;

export function updateRenderProfile(id: string, input: UpdateRenderProfileInput) {
  return apiClient<RenderProfile>(`/render-profiles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export type RerenderWatermarkInput = {
  scope: 'PROJECT' | 'FILTER' | 'NOT_WATERMARKED';
  projectIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  categoryIds?: string[];
  mediaType?: 'ALL' | 'IMAGE' | 'VIDEO';
};

export function rerenderWatermark(input: RerenderWatermarkInput) {
  return apiClient<{
    scope: string;
    matchedMedia: number;
    enqueuedJobs: number;
    batchId: string | null;
  }>('/render-watermark/rerender', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function createWatermarkLogoUploadSession(input: {
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
}) {
  return apiClient<UploadSession>('/render-watermark/upload-session', {
    method: 'POST',
    body: JSON.stringify({ assetType: 'image', ...input }),
  });
}

export function completeWatermarkLogoUpload(assetId: string, uploadSessionId: string) {
  return apiClient<{ id: string; processingStatus: string }>(
    `/render-watermark/assets/${assetId}/complete`,
    {
      method: 'POST',
      body: JSON.stringify({ uploadSessionId }),
    },
  );
}

export function abortWatermarkLogoUpload(assetId: string, uploadSessionId: string) {
  return apiClient<{ success: boolean }>(`/render-watermark/assets/${assetId}/abort`, {
    method: 'POST',
    body: JSON.stringify({ uploadSessionId }),
  });
}

export async function uploadWatermarkLogo(file: File): Promise<string> {
  const session = await createWatermarkLogoUploadSession({
    originalFilename: file.name,
    mimeType: file.type || 'image/png',
    fileSizeBytes: file.size,
  });
  let completed = false;
  try {
    await uploadAssetContent(session, file, () => undefined);
    const asset = await completeWatermarkLogoUpload(session.assetId, session.uploadSessionId);
    completed = true;
    return asset.id;
  } finally {
    if (!completed) {
      await abortWatermarkLogoUpload(session.assetId, session.uploadSessionId).catch(
        () => undefined,
      );
    }
  }
}

export function createRenderBatch(input: {
  projectId?: string;
  folderId?: string;
  projectMediaIds?: string[];
}) {
  return apiClient<RenderBatch>('/render-batches', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getRenderBatch(id: string) {
  return apiClient<RenderBatch>(`/render-batches/${id}`);
}

export function cancelRenderBatch(id: string) {
  return apiClient<RenderBatch>(`/render-batches/${id}/cancel`, { method: 'POST' });
}
