import axios from 'axios';
import { apiClient, ApiError, apiUrl } from '../../../shared/lib/api-client';

export type Asset = {
  id: string;
  assetType: 'image' | 'video';
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: string;
  processingStatus: string;
  processingError?: string | null;
  extension?: string | null;
  /** 'local' | 'google_drive' */
  sourceType?: string;
  /** Probed when processed: width, height, durationSeconds, format, codec, frameRate, … */
  sourceMetadata?: Record<string, unknown> | null;
  createdBy?: string;
  createdAt?: string;
};

/** A preview variant the requester may view; heights follow the file's aspect ratio. */
export type PreviewVariant = {
  variantCode: string;
  width: number | null;
  height: number | null;
  /** Short edge in px (min(width, height)); null for legacy variants. */
  resolution: number | null;
  hasWatermark: boolean;
  mimeType: string;
  /** bigint as string. */
  fileSizeBytes: string;
  /** Average bitrate for videos (fileSize*8/duration); null for images. */
  bitrateBps: number | null;
};

export type ProjectMedia = {
  id: string;
  projectId: string;
  assetId: string;
  sortOrder: number;
  caption: string | null;
  evaluationStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  /** Un-watermarked thumbnail, used wherever media is listed. */
  thumbnailUrl?: string | null;
  /** Largest watermarked preview. */
  previewUrl?: string | null;
  previewVariants?: PreviewVariant[];
  previewVariantCode?: string | null;
  watermarkVariant?: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  creatorName?: string | null;
  modifiedAt?: string | null;
  createdByUser?: { id: string; name?: string; email?: string } | null;
  asset: Asset;
};

export type ProjectMediaPage = {
  items: ProjectMedia[];
  nextCursor: string | null;
};

export type ProjectMediaQueryParams = {
  cursor?: string;
  limit?: number;
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

export type UpdateProjectMediaInput = {
  sortOrder?: number;
  caption?: string;
  evaluationStatus?: ProjectMedia['evaluationStatus'];
  comment?: string | null;
};

export type ProjectMediaEvaluation = {
  id: string;
  projectMediaId: string;
  evaluationStatus: ProjectMedia['evaluationStatus'];
  comment: string | null;
  evaluatedBy: string;
  /** Account of `evaluatedBy`; null when the account service could not resolve it. */
  evaluatedByUser?: { id: string; name?: string; email?: string; avatar?: string } | null;
  createdAt: string;
};

export function getProjectMedia(
  projectId: string,
  params: ProjectMediaQueryParams = {},
): Promise<ProjectMediaPage> {
  const query = new URLSearchParams();
  if (params.cursor) {
    query.set('cursor', params.cursor);
  }
  if (params.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  const queryString = query.toString();
  return apiClient<ProjectMediaPage>(
    `/projects/${projectId}/media${queryString ? `?${queryString}` : ''}`,
  );
}

/** Largest page the media endpoint serves. */
const PROJECT_MEDIA_MAX_PAGE_SIZE = 100;

/** Loads every media item of a project by following the cursor until the last page. */
export async function getAllProjectMedia(projectId: string): Promise<ProjectMediaPage> {
  const items: ProjectMedia[] = [];
  let cursor: string | undefined;
  do {
    const page = await getProjectMedia(projectId, {
      cursor,
      limit: PROJECT_MEDIA_MAX_PAGE_SIZE,
    });
    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return { items, nextCursor: null };
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

export function updateProjectMedia(
  mediaId: string,
  input: UpdateProjectMediaInput,
): Promise<ProjectMedia> {
  return apiClient<ProjectMedia>(`/project-media/${mediaId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export type BulkApprovalResult = {
  /** Files switched to "approved" by this call. */
  approvedCount: number;
  /** Selected files that were already approved. */
  unchangedCount: number;
  projects: Array<{
    projectId: string;
    evaluationStatus: 'draft' | 'pending' | 'completed' | 'partially_completed' | 'failed';
    totalMedia: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
  }>;
};

export function bulkApproveProjectMedia(
  mediaIds: string[],
  comment?: string | null,
): Promise<BulkApprovalResult> {
  return apiClient<BulkApprovalResult>('/project-media/bulk-approve', {
    method: 'POST',
    body: JSON.stringify({ mediaIds, comment: comment || undefined }),
  });
}

/**
 * Approves every pending file of the projects (rejected ones too with `overrideRejected`);
 * each project's status then follows from its files.
 */
export function bulkApproveProjects(input: {
  projectIds: string[];
  overrideRejected?: boolean;
  comment?: string | null;
}): Promise<BulkApprovalResult> {
  return apiClient<BulkApprovalResult>('/projects/bulk-approve', {
    method: 'POST',
    body: JSON.stringify({ ...input, comment: input.comment || undefined }),
  });
}

export function getProjectMediaEvaluationHistory(
  mediaId: string,
): Promise<ProjectMediaEvaluation[]> {
  return apiClient<ProjectMediaEvaluation[]>(`/project-media/${mediaId}/evaluations`);
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

/**
 * Presigned URL of an asset variant. With `variantCode = 'preview'`, `width` picks the smallest
 * watermarked preview at least that wide (the largest without it).
 */
export async function getAssetPreviewUrl(
  assetId: string,
  variantCode = 'thumbnail',
  width?: number,
): Promise<string> {
  const query = new URLSearchParams({ variantCode });
  if (width) {
    query.set('width', String(Math.round(width)));
  }
  const result = await apiClient<{ url: string }>(
    `/assets/${assetId}/preview-url?${query.toString()}`,
  );
  return result.url;
}

/**
 * Presigned URL of the original, un-watermarked file. Requires the evaluate or
 * download-original permission.
 */
export async function getAssetOriginalUrl(assetId: string): Promise<string> {
  const result = await apiClient<{ url: string }>(`/assets/${assetId}/original-url`);
  return result.url;
}

export type UploadSession = {
  assetId: string;
  uploadSessionId: string;
  /** Presigned URL for a single PUT; null when the file goes up in parts (see `multipart`). */
  uploadUrl: string | null;
  /** Set for large files: part `n` is bytes `(n - 1) * partSize` up to `n * partSize`. */
  multipart?: { partSize: number; partCount: number } | null;
  expiresAt: string;
  status: string;
};

export type CreateUploadSessionInput = {
  assetType: 'image' | 'video';
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  targetProjectId: string;
  /** Files sharing this id are logged as one upload batch in the project audit log. */
  uploadBatchId?: string;
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
  onProgress: (progress: number) => void = () => undefined,
): Promise<void> {
  if (session.multipart) {
    return uploadInParts(session, session.multipart, file, onProgress);
  }
  if (!session.uploadUrl) {
    return Promise.reject(new Error('Upload session has no upload URL'));
  }
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
      throw toUploadError(error);
    });
}

/** Part URLs are requested this many at a time, so none expires before it is used. */
const PART_URL_BATCH = 20;
const PARALLEL_PARTS = 4;
const PART_ATTEMPTS = 3;

function requestUploadPartUrls(session: UploadSession, partNumbers: number[]) {
  return apiClient<{ parts: Array<{ partNumber: number; url: string }> }>(
    `/assets/${session.assetId}/upload-parts`,
    {
      method: 'POST',
      body: JSON.stringify({ uploadSessionId: session.uploadSessionId, partNumbers }),
    },
  );
}

/**
 * Uploads a large file straight to R2 in parts, a few at a time. A failed part is retried on
 * its own with a fresh URL, so a network hiccup does not restart the whole file. The API
 * assembles the parts when the upload is completed.
 */
async function uploadInParts(
  session: UploadSession,
  layout: { partSize: number; partCount: number },
  file: File,
  onProgress: (progress: number) => void,
): Promise<void> {
  const sentBytes = new Map<number, number>();
  const reportProgress = () => {
    let sent = 0;
    for (const bytes of sentBytes.values()) {
      sent += bytes;
    }
    // 100 is reported only once every part is in.
    onProgress(Math.min(99, Math.floor((sent / file.size) * 100)));
  };

  const uploadPart = async (partNumber: number, firstUrl: string) => {
    const start = (partNumber - 1) * layout.partSize;
    const part = file.slice(start, Math.min(start + layout.partSize, file.size));
    let url = firstUrl;
    for (let attempt = 1; ; attempt += 1) {
      try {
        await axios.put(apiUrl(url), part, {
          onUploadProgress: (event) => {
            sentBytes.set(partNumber, event.loaded);
            reportProgress();
          },
        });
        sentBytes.set(partNumber, part.size);
        reportProgress();
        return;
      } catch (error) {
        sentBytes.set(partNumber, 0);
        if (attempt >= PART_ATTEMPTS) {
          throw toUploadError(error);
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000 * 2 ** (attempt - 1)));
        // The URL may have expired while waiting.
        const { parts } = await requestUploadPartUrls(session, [partNumber]);
        url = parts[0].url;
      }
    }
  };

  for (let first = 1; first <= layout.partCount; first += PART_URL_BATCH) {
    const partNumbers = Array.from(
      { length: Math.min(PART_URL_BATCH, layout.partCount - first + 1) },
      (_, index) => first + index,
    );
    const { parts } = await requestUploadPartUrls(session, partNumbers);
    const urls = new Map(parts.map((part) => [part.partNumber, part.url]));
    let next = 0;
    let failed = false;
    const worker = async () => {
      // Once a part has failed for good the caller aborts the upload; stop sending the rest.
      while (!failed && next < partNumbers.length) {
        const partNumber = partNumbers[next];
        next += 1;
        const url = urls.get(partNumber);
        try {
          if (!url) {
            throw new Error(`No upload URL for part ${partNumber}`);
          }
          await uploadPart(partNumber, url);
        } catch (error) {
          failed = true;
          throw error;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL_PARTS, partNumbers.length) }, worker));
  }
  onProgress(100);
}

function toUploadError(error: unknown): unknown {
  if (axios.isAxiosError(error)) {
    return new ApiError(
      error.response?.data || error.message || 'Upload failed',
      error.response?.status ?? 0,
    );
  }
  return error;
}

/**
 * Completing an upload session that targets a project also attaches the asset to it;
 * `projectMediaId` is the resulting project media row.
 */
export function completeUpload(assetId: string, uploadSessionId: string) {
  return apiClient<{
    id: string;
    processingStatus: string;
    renderJobId?: string | null;
    outboxEventId?: string | null;
    projectMediaId: string | null;
  }>(`/assets/${assetId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ uploadSessionId }),
  });
}

export function abortUpload(assetId: string, uploadSessionId: string) {
  return apiClient<{ success: boolean }>(`/assets/${assetId}/abort`, {
    method: 'POST',
    body: JSON.stringify({ uploadSessionId }),
  });
}

export function retryAssetProcessing(assetId: string) {
  return apiClient<{ id: string; outboxEventId: string }>(`/assets/${assetId}/retry`, {
    method: 'POST',
  });
}
