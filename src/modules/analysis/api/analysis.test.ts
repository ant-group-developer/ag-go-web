import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/lib/api-client';
import {
  analysisStatusColor,
  getAnalysisStats,
  getAssetAnalysis,
  getAssetSegments,
  getProjectAnalysisStatus,
  isTerminalStatus,
  runBackfill,
  startAssetAnalysis,
  type AnalysisStatus,
} from './analysis';

vi.mock('../../../shared/lib/api-client', () => ({
  apiClient: vi.fn(),
  apiUrl: (path: string) => path,
}));

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
      segments: { total: 45, usable: 38 },
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
    vi.mocked(apiClient).mockResolvedValue({ current: null, latest: null });
    await getAssetAnalysis('asset-3');
    expect(apiClient).toHaveBeenCalledWith('/assets/asset-3/analysis');
  });
});

describe('getAssetSegments', () => {
  it('calls GET /assets/:assetId/segments', async () => {
    vi.mocked(apiClient).mockResolvedValue({ analysisId: 'a-1', segments: [] });
    await getAssetSegments('asset-4');
    expect(apiClient).toHaveBeenCalledWith('/assets/asset-4/segments');
  });
});

describe('getProjectAnalysisStatus', () => {
  it('calls GET /projects/:projectId/analysis-status', async () => {
    vi.mocked(apiClient).mockResolvedValue({ items: [] });
    await getProjectAnalysisStatus('project-1');
    expect(apiClient).toHaveBeenCalledWith('/projects/project-1/analysis-status');
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
