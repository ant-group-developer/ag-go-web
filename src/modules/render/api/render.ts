import { apiClient } from '../../../shared/lib/api-client';
import { uploadAssetContent, type UploadSession } from '../../media/api/media';

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

/** Preview widths (watermarked) and thumbnail width (no watermark); heights follow the file. */
export type RenderSizes = {
  previewWidths: number[];
  thumbnailWidth: number;
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
  renderSizes?: Partial<RenderSizes> | null;
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
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string;
  renderProfileId: string;
  /** Project of the batch; for batches spanning several projects, the first one by name. */
  projectName?: string | null;
  projectCount?: number;
  folderPath?: string | null;
  profileName?: string | null;
  profileVersion?: number | null;
  createdByUser?: { id: string; name?: string; email?: string } | null;
};

/** A rendered file of the job's asset (a preview size or the thumbnail). */
export type RenderJobOutput = {
  variantCode: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  fileSizeBytes: string;
  hasWatermark: boolean;
  renderVersion: number;
};

/** What queued a render job: a batch, an upload, a Drive import or a per-file retry. */
export type RenderJobSource = 'batch' | 'upload' | 'import' | 'retry' | 'other';

export type RenderJob = {
  id: string;
  assetId: string;
  renderBatchId: string | null;
  source?: RenderJobSource;
  status: string;
  progressPercent: number;
  progressMessage: string | null;
  attemptCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt?: string | null;
  finishedAt: string | null;
  renderVersion?: number;
  asset?: {
    id: string;
    assetType: 'image' | 'video';
    originalFilename: string;
    mimeType: string;
    fileSizeBytes: string;
    processingStatus: string;
    width: number | null;
    height: number | null;
    durationSeconds: number | null;
  } | null;
  project?: { id: string; name: string } | null;
  outputs?: RenderJobOutput[];
  createdByUser?: { id: string; name?: string; email?: string } | null;
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
  > & { renderSizes: RenderSizes }
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
    body: JSON.stringify(input),
  });
}

/** Presigned URL of the uploaded watermark logo (the original, not a watermarked variant). */
export async function getWatermarkLogoUrl(assetId: string): Promise<string> {
  const result = await apiClient<{ url: string }>(`/render-watermark/logos/${assetId}/url`);
  return result.url;
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
  renderProfileId?: string;
}) {
  return apiClient<RenderBatch>('/render-batches', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getProjectRenderBatches(projectId: string) {
  return apiClient<RenderBatch[]>(`/projects/${projectId}/render-batches`);
}

export function getAllRenderBatches() {
  return apiClient<RenderBatch[]>('/render-batches');
}

export function getRenderBatchJobs(batchId: string) {
  return apiClient<RenderJob[]>(`/render-batches/${batchId}/jobs`);
}

/** Status tabs of a render job list; 'active' groups queued and processing jobs. */
export type RenderJobStatusFilter = 'all' | 'active' | 'completed' | 'failed' | 'cancelled';

export type RenderJobStatusCounts = Record<RenderJobStatusFilter, number>;

/** Server-sortable render job columns: queued time, processing start and processing duration. */
export type RenderJobSortField = 'createdAt' | 'startedAt' | 'elapsed';

export type RenderJobSort = { sortBy: RenderJobSortField; sortOrder: 'asc' | 'desc' };

export type AutoRenderJobsParams = {
  projectId?: string;
  page: number;
  pageSize: number;
  status: RenderJobStatusFilter;
  search?: string;
  /** Omit for newest first. */
  sort?: RenderJobSort;
};

export type AutoRenderJobPage = {
  items: RenderJob[];
  total: number;
  page: number;
  pageSize: number;
  /** Jobs per status tab (search applied, status filter not). */
  counts: RenderJobStatusCounts;
};

/**
 * One page of the jobs queued automatically after an upload or a Drive import, newest first
 * unless `sort` is given.
 */
export function getAutoRenderJobs({
  projectId,
  page,
  pageSize,
  status,
  search,
  sort,
}: AutoRenderJobsParams) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    status,
  });
  if (projectId) {
    query.set('projectId', projectId);
  }
  if (search) {
    query.set('search', search);
  }
  if (sort) {
    query.set('sortBy', sort.sortBy);
    query.set('sortOrder', sort.sortOrder);
  }
  return apiClient<AutoRenderJobPage>(`/render-jobs/auto?${query.toString()}`);
}

export function retryRenderJob(jobId: string) {
  return apiClient<RenderJob>(`/render-jobs/${jobId}/retry`, { method: 'POST' });
}

export function getRenderBatch(id: string) {
  return apiClient<RenderBatch>(`/render-batches/${id}`);
}

export function cancelRenderBatch(id: string) {
  return apiClient<RenderBatch>(`/render-batches/${id}/cancel`, { method: 'POST' });
}
