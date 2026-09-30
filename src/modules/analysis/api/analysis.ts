import { apiClient } from '../../../shared/lib/api-client';

// ─── Analysis status ─────────────────────────────────────────────────────────

export const ANALYSIS_STATUSES = [
  'queued',
  'extracting',
  'extracted',
  'describing',
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
  completed: number;
  failed: number;
  cancelled: number;
};

export type AnalysisStats = {
  counts: AnalysisStatusCounts;
  segments: {
    total: number;
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
  folderIds?: string[];
  projectIds?: string[];
  mode: BackfillMode;
  priority?: number;
  dryRun?: boolean;
};

export type BackfillResult = {
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

// ─── /assets/:assetId/analysis (GET) ─────────────────────────────────────────

export type AnalysisSummary = {
  id: string;
  status: AnalysisStatus;
  reason: string | null;
  extractVersion: string | null;
  promptVersion: string | null;
  segmentCount: number | null;
  usableCount: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type AssetAnalysis = {
  current: AnalysisSummary | null;
  latest: AnalysisSummary | null;
};

export function getAssetAnalysis(assetId: string): Promise<AssetAnalysis> {
  return apiClient<AssetAnalysis>(`/assets/${assetId}/analysis`);
}

// ─── /assets/:assetId/segments ───────────────────────────────────────────────

export type MediaSegment = {
  id: string;
  index: number;
  startMs: number;
  endMs: number;
  keyframeUrls: string[];
  captionVi: string | null;
  captionEn: string | null;
  tags: string[];
  usable: boolean;
  usableReason: string | null;
  quality: number | null;
  shotSize: string | null;
  dead: boolean;
  deadReason: string | null;
};

export type AssetSegments = {
  analysisId: string | null;
  segments: MediaSegment[];
};

export function getAssetSegments(assetId: string): Promise<AssetSegments> {
  return apiClient<AssetSegments>(`/assets/${assetId}/segments`);
}

// ─── /projects/:projectId/analysis-status ────────────────────────────────────

export type ProjectAssetAnalysisStatus = {
  assetId: string;
  status: AnalysisStatus | null;
  segmentCount: number;
  usableCount: number;
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
    case 'cancelled':
      return 'warning';
    default:
      return 'default';
  }
}
