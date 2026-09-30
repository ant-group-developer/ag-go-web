import { apiClient } from '../../../shared/lib/api-client';

// ─── Analysis status ─────────────────────────────────────────────────────────

export const ANALYSIS_STATUSES = [
  'queued',
  'extracting',
  'extracted',
  'describing',
  'paused',
  'completed',
  'failed',
  'cancelled',
] as const;

export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

export const ANALYSIS_TERMINAL_STATUSES: AnalysisStatus[] = ['completed', 'failed', 'cancelled'];

export function isTerminalStatus(status: AnalysisStatus | null | undefined): boolean {
  if (!status) return true;
  return ANALYSIS_TERMINAL_STATUSES.includes(status);
}

// ─── /analysis/stats ─────────────────────────────────────────────────────────

export type AnalysisStatusCounts = {
  none: number;
  queued: number;
  extracting: number;
  extracted: number;
  describing: number;
  paused: number;
  completed: number;
  failed: number;
  cancelled: number;
};

export type AnalysisStats = {
  counts: AnalysisStatusCounts;
  videos: {
    analyzed: number;
    usable: number;
  };
};

export function getAnalysisStats(folderIds?: string[]): Promise<AnalysisStats> {
  const query = new URLSearchParams();
  if (folderIds && folderIds.length > 0) {
    query.set('folderIds', folderIds.join(','));
  }
  const qs = query.toString();
  return apiClient<AnalysisStats>(`/analysis/stats${qs ? `?${qs}` : ''}`);
}

// ─── /analysis/backfill ──────────────────────────────────────────────────────

export type BackfillMode = 'missing' | 'outdated' | 'all';

export type BackfillInput = {
  name?: string;
  folderIds?: string[];
  projectIds?: string[];
  mode: BackfillMode;
  priority?: number;
  dryRun?: boolean;
};

export type BackfillResult = {
  batchId: string | null;
  matched: number;
  enqueued: number;
  skipped: number;
  dryRun: boolean;
};

export function runBackfill(input: BackfillInput): Promise<BackfillResult> {
  return apiClient<BackfillResult>('/analysis/backfill', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ─── /analysis/batches ───────────────────────────────────────────────────────

export const BATCH_STATUSES = ['running', 'paused', 'cancelled', 'completed'] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export type AnalysisBatch = {
  id: string;
  name: string;
  kind: 'backfill' | 'auto';
  mode: 'missing' | 'outdated' | 'all' | null;
  scope: { folderIds: string[]; projectIds: string[] };
  priority: number;
  status: BatchStatus;
  counts: {
    total: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BatchSortBy = 'createdAt' | 'name' | 'status';

export type BatchListParams = {
  page?: number;
  pageSize?: number;
  sortBy?: BatchSortBy;
  sortOrder?: 'asc' | 'desc';
  status?: BatchStatus;
};

export type BatchListResult = {
  items: AnalysisBatch[];
  total: number;
  page: number;
  pageSize: number;
};

export function listAnalysisBatches(params: BatchListParams = {}): Promise<BatchListResult> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.pageSize !== undefined) query.set('pageSize', String(params.pageSize));
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return apiClient<BatchListResult>(`/analysis/batches${qs ? `?${qs}` : ''}`);
}

export function pauseBatch(id: string): Promise<AnalysisBatch> {
  return apiClient<AnalysisBatch>(`/analysis/batches/${id}/pause`, { method: 'POST' });
}

export function resumeBatch(id: string): Promise<AnalysisBatch> {
  return apiClient<AnalysisBatch>(`/analysis/batches/${id}/resume`, { method: 'POST' });
}

export function cancelBatch(id: string): Promise<AnalysisBatch> {
  return apiClient<AnalysisBatch>(`/analysis/batches/${id}/cancel`, { method: 'POST' });
}

// ─── /analysis/logs ──────────────────────────────────────────────────────────

export type AnalysisLogLevel = 'info' | 'warn' | 'error';

export type AnalysisLogEntry = {
  id: string;
  level: AnalysisLogLevel;
  action: string;
  message: string;
  userId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type AnalysisLogPage = {
  items: AnalysisLogEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AnalysisLogsQuery = {
  level?: AnalysisLogLevel;
  search?: string;
  page?: number;
  pageSize?: number;
};

/** Processing log of the analysis pipeline (backfill → farm → extract → AI → done), newest first. */
export function getAnalysisLogs(query: AnalysisLogsQuery = {}): Promise<AnalysisLogPage> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return apiClient<AnalysisLogPage>(`/analysis/logs${qs ? `?${qs}` : ''}`);
}

// ─── /assets/:assetId/analysis (POST) ────────────────────────────────────────

export type StartAnalysisInput = {
  priority?: number;
};

export type StartAnalysisResult = {
  analysisId: string;
  status: AnalysisStatus;
};

export function startAssetAnalysis(
  assetId: string,
  input: StartAnalysisInput = {},
): Promise<StartAnalysisResult> {
  return apiClient<StartAnalysisResult>(`/assets/${assetId}/analysis`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ─── /assets/:assetId/analysis/{pause|resume|cancel} ─────────────────────────

export type AssetAnalysisActionResult = { affected: number };

export function pauseAssetAnalysis(assetId: string): Promise<AssetAnalysisActionResult> {
  return apiClient<AssetAnalysisActionResult>(`/assets/${assetId}/analysis/pause`, {
    method: 'POST',
  });
}

export function resumeAssetAnalysis(assetId: string): Promise<AssetAnalysisActionResult> {
  return apiClient<AssetAnalysisActionResult>(`/assets/${assetId}/analysis/resume`, {
    method: 'POST',
  });
}

export function cancelAssetAnalysis(assetId: string): Promise<AssetAnalysisActionResult> {
  return apiClient<AssetAnalysisActionResult>(`/assets/${assetId}/analysis/cancel`, {
    method: 'POST',
  });
}

// ─── /assets/:assetId/analysis (GET) ─────────────────────────────────────────

/** Technical metrics from extraction. */
export type AnalysisTechnical = {
  blackRatio: number | null;
  frozenRatio: number | null;
  blur: number | null;
  silenceRatio: number | null;
  hasSpeechHint: boolean | null;
  dead: boolean;
  deadReason: string | null;
};

export type AnalysisMedia = {
  durationMs: number;
  width: number;
  height: number;
  fps: number | null;
  hasAudio: boolean;
  orientation: string;
};

export type AssetAnalysis = {
  id: string;
  assetId: string;
  status: AnalysisStatus;
  reason: string | null;
  isCurrent: boolean;
  batchId: string | null;
  extractVersion: string | null;
  promptVersion: string | null;
  createdAt: string;
  completedAt: string | null;
  description: {
    titleVi: string;
    summaryVi: string;
    summaryEn: string;
    genre: string;
    topics: string[];
    subjects: string[];
    places: string[];
    actions: string[];
    keywordsVi: string[];
    tags: string[];
    mood: string;
    setting: string;
    timeOfDay: string;
    peopleCount: string;
    shotVariety: string[];
    cameraMotions: string[];
    visibleText: string;
    hasWatermark: boolean;
    usable: boolean;
    usableReason: string;
    quality: number;
  } | null;
  technical: AnalysisTechnical | null;
  media: AnalysisMedia | null;
  keyframes: { url: string; tMs: number }[];
  contactSheetUrl: string | null;
  error: string | null;
};

export function getAssetAnalysis(assetId: string): Promise<AssetAnalysis | null> {
  return apiClient<AssetAnalysis | null>(`/assets/${assetId}/analysis`);
}

// ─── /projects/:projectId/analysis-status ────────────────────────────────────

export type ProjectAssetAnalysisStatus = {
  assetId: string;
  status: AnalysisStatus | null;
  usable: boolean | null;
  quality: number | null;
  titleVi: string | null;
  completedAt: string | null;
};

export type ProjectAnalysisStatus = {
  items: ProjectAssetAnalysisStatus[];
};

export function getProjectAnalysisStatus(projectId: string): Promise<ProjectAnalysisStatus> {
  return apiClient<ProjectAnalysisStatus>(`/projects/${projectId}/analysis-status`);
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

export function analysisStatusColor(status: AnalysisStatus | null | undefined): string {
  switch (status) {
    case 'queued':
      return 'default';
    case 'extracting':
    case 'extracted':
    case 'describing':
      return 'processing';
    case 'completed':
      return 'success';
    case 'failed':
      return 'error';
    case 'paused':
    case 'cancelled':
      return 'warning';
    default:
      return 'default';
  }
}

export function batchStatusColor(status: BatchStatus | null | undefined): string {
  switch (status) {
    case 'running':
      return 'processing';
    case 'paused':
      return 'warning';
    case 'cancelled':
      return 'default';
    case 'completed':
      return 'success';
    default:
      return 'default';
  }
}
