import { apiClient } from '../../../shared/lib/api-client';

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
  watermarkConfig: Record<string, unknown>;
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
