import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/lib/api-client';
import {
  analysisStatusColor,
  cancelAssetAnalysis,
  cancelBatch,
  getAnalysisLogs,
  getAnalysisStats,
  getAssetAnalysis,
  getProjectAnalysisStatus,
  isTerminalStatus,
  listAnalysisBatches,
  pauseAssetAnalysis,
  pauseBatch,
  resumeAssetAnalysis,
  resumeBatch,
  runBackfill,
  startAssetAnalysis,
  type AnalysisStatus,
} from './analysis';

vi.mock('../../../shared/lib/api-client', () => ({
  apiClient: vi.fn(),
  apiUrl: (path: string) => path,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getAnalysisStats', () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockResolvedValue({
      counts: {
        none: 5,
        queued: 2,
        extracting: 1,
        extracted: 0,
        describing: 0,
        completed: 3,
        failed: 1,
        cancelled: 0,
      },
      videos: { analyzed: 45, usable: 38 },
    });
  });

  it('calls /analysis/stats without folderIds query when none provided', async () => {
    await getAnalysisStats();
    expect(apiClient).toHaveBeenCalledWith('/analysis/stats');
  });

  it('appends folderIds as comma-separated query param', async () => {
    await getAnalysisStats(['folder-1', 'folder-2']);
    expect(apiClient).toHaveBeenCalledWith('/analysis/stats?folderIds=folder-1%2Cfolder-2');
  });

  it('ignores empty folderIds array', async () => {
    await getAnalysisStats([]);
    expect(apiClient).toHaveBeenCalledWith('/analysis/stats');
  });
});

describe('runBackfill', () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockResolvedValue({
      batchId: 'batch-1',
      matched: 10,
      enqueued: 8,
      skipped: 2,
      dryRun: false,
    });
  });

  it('calls POST /analysis/backfill with the provided body', async () => {
    await runBackfill({ mode: 'missing', folderIds: ['folder-1'], dryRun: true });
    expect(apiClient).toHaveBeenCalledWith('/analysis/backfill', {
      method: 'POST',
      body: JSON.stringify({ mode: 'missing', folderIds: ['folder-1'], dryRun: true }),
    });
  });

  it('includes name when provided', async () => {
    await runBackfill({ mode: 'all', name: 'Đợt backfill Q3' });
    expect(apiClient).toHaveBeenCalledWith('/analysis/backfill', {
      method: 'POST',
      body: JSON.stringify({ mode: 'all', name: 'Đợt backfill Q3' }),
    });
  });
});

describe('getAnalysisLogs', () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it('calls /analysis/logs without a query when no filter is set', async () => {
    await getAnalysisLogs();
    expect(apiClient).toHaveBeenCalledWith('/analysis/logs');
  });

  it('passes the filters that are set and drops empty ones', async () => {
    await getAnalysisLogs({ page: 2, pageSize: 20, level: 'error', search: '' });
    expect(apiClient).toHaveBeenCalledWith('/analysis/logs?page=2&pageSize=20&level=error');
  });
});

describe('startAssetAnalysis', () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockResolvedValue({ analysisId: 'analysis-1', status: 'queued' });
  });

  it('calls POST /assets/:assetId/analysis', async () => {
    await startAssetAnalysis('asset-1');
    expect(apiClient).toHaveBeenCalledWith('/assets/asset-1/analysis', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  });

  it('includes priority when provided', async () => {
    await startAssetAnalysis('asset-2', { priority: 10 });
    expect(apiClient).toHaveBeenCalledWith('/assets/asset-2/analysis', {
      method: 'POST',
      body: JSON.stringify({ priority: 10 }),
    });
  });
});

describe('getAssetAnalysis', () => {
  it('calls GET /assets/:assetId/analysis', async () => {
    vi.mocked(apiClient).mockResolvedValue(null);
    await getAssetAnalysis('asset-3');
    expect(apiClient).toHaveBeenCalledWith('/assets/asset-3/analysis');
  });
});

describe('getProjectAnalysisStatus', () => {
  it('calls GET /projects/:projectId/analysis-status', async () => {
    vi.mocked(apiClient).mockResolvedValue({ items: [] });
    await getProjectAnalysisStatus('project-1');
    expect(apiClient).toHaveBeenCalledWith('/projects/project-1/analysis-status');
  });
});

describe('listAnalysisBatches', () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
  });

  it('calls /analysis/batches without qs when no params', async () => {
    await listAnalysisBatches();
    expect(apiClient).toHaveBeenCalledWith('/analysis/batches');
  });

  it('appends pagination and sort params', async () => {
    await listAnalysisBatches({ page: 2, pageSize: 10, sortBy: 'createdAt', sortOrder: 'desc' });
    const call = vi.mocked(apiClient).mock.calls.at(-1)![0] as string;
    expect(call).toMatch(/^\/analysis\/batches\?/);
    expect(call).toContain('page=2');
    expect(call).toContain('pageSize=10');
    expect(call).toContain('sortBy=createdAt');
    expect(call).toContain('sortOrder=desc');
  });
});

describe('batch actions', () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockResolvedValue({ id: 'b1', status: 'paused' });
  });

  it('pauseBatch calls POST /analysis/batches/:id/pause', async () => {
    await pauseBatch('b1');
    expect(apiClient).toHaveBeenCalledWith('/analysis/batches/b1/pause', { method: 'POST' });
  });

  it('resumeBatch calls POST /analysis/batches/:id/resume', async () => {
    await resumeBatch('b1');
    expect(apiClient).toHaveBeenCalledWith('/analysis/batches/b1/resume', { method: 'POST' });
  });

  it('cancelBatch calls POST /analysis/batches/:id/cancel', async () => {
    await cancelBatch('b1');
    expect(apiClient).toHaveBeenCalledWith('/analysis/batches/b1/cancel', { method: 'POST' });
  });
});

describe('per-asset analysis actions', () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockResolvedValue({ affected: 1 });
  });

  it('pauseAssetAnalysis calls POST /assets/:id/analysis/pause', async () => {
    await pauseAssetAnalysis('asset-1');
    expect(apiClient).toHaveBeenCalledWith('/assets/asset-1/analysis/pause', { method: 'POST' });
  });

  it('resumeAssetAnalysis calls POST /assets/:id/analysis/resume', async () => {
    await resumeAssetAnalysis('asset-1');
    expect(apiClient).toHaveBeenCalledWith('/assets/asset-1/analysis/resume', { method: 'POST' });
  });

  it('cancelAssetAnalysis calls POST /assets/:id/analysis/cancel', async () => {
    await cancelAssetAnalysis('asset-1');
    expect(apiClient).toHaveBeenCalledWith('/assets/asset-1/analysis/cancel', { method: 'POST' });
  });
});

describe('isTerminalStatus', () => {
  it('returns true for completed', () => expect(isTerminalStatus('completed')).toBe(true));
  it('returns true for failed', () => expect(isTerminalStatus('failed')).toBe(true));
  it('returns true for cancelled', () => expect(isTerminalStatus('cancelled')).toBe(true));
  it('returns false for queued', () => expect(isTerminalStatus('queued')).toBe(false));
  it('returns false for extracting', () => expect(isTerminalStatus('extracting')).toBe(false));
  it('returns false for describing', () => expect(isTerminalStatus('describing')).toBe(false));
  it('returns true for null', () => expect(isTerminalStatus(null)).toBe(true));
  it('returns true for undefined', () => expect(isTerminalStatus(undefined)).toBe(true));
});

describe('analysisStatusColor', () => {
  const cases: Array<[AnalysisStatus | null | undefined, string]> = [
    ['queued', 'default'],
    ['extracting', 'processing'],
    ['extracted', 'processing'],
    ['describing', 'processing'],
    ['completed', 'success'],
    ['failed', 'error'],
    ['cancelled', 'warning'],
    [null, 'default'],
    [undefined, 'default'],
  ];

  for (const [status, expected] of cases) {
    it(`returns "${expected}" for status "${String(status)}"`, () => {
      expect(analysisStatusColor(status)).toBe(expected);
    });
  }
});
