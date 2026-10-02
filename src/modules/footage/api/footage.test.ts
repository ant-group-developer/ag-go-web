import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/lib/api-client';
import {
  buildFacetsQueryString,
  buildFootageFolderTree,
  buildSearchQueryString,
  formatMs,
  getFootageFacets,
  getFootageFolders,
  getFootagePreviewUrl,
  getFootageVideoMedia,
  qualityStars,
  resolutionOf,
  searchFootage,
  type FootageFolder,
  type FootageSearchParams,
} from './footage';

vi.mock('../../../shared/lib/api-client', () => ({
  apiClient: vi.fn(),
  apiUrl: (path: string) => path,
}));

// ─── buildSearchQueryString ───────────────────────────────────────────────────

describe('buildSearchQueryString', () => {
  it('returns empty string when no params provided', () => {
    expect(buildSearchQueryString({})).toBe('');
  });

  it('sets q param', () => {
    expect(buildSearchQueryString({ q: 'hoa sen' })).toBe('q=hoa+sen');
  });

  it('joins folderIds with commas', () => {
    const qs = buildSearchQueryString({ folderIds: ['f1', 'f2', 'f3'] });
    expect(new URLSearchParams(qs).get('folderIds')).toBe('f1,f2,f3');
  });

  it('joins genres with commas', () => {
    const qs = buildSearchQueryString({ genres: ['documentary', 'news'] });
    expect(new URLSearchParams(qs).get('genres')).toBe('documentary,news');
  });

  it('joins timesOfDay with commas', () => {
    const qs = buildSearchQueryString({ timesOfDay: ['day', 'night'] });
    expect(new URLSearchParams(qs).get('timesOfDay')).toBe('day,night');
  });

  it('sets minDurationMs and maxDurationMs', () => {
    const qs = buildSearchQueryString({ minDurationMs: 1000, maxDurationMs: 5000 });
    const p = new URLSearchParams(qs);
    expect(p.get('minDurationMs')).toBe('1000');
    expect(p.get('maxDurationMs')).toBe('5000');
  });

  it('sets usableOnly=false explicitly', () => {
    const qs = buildSearchQueryString({ usableOnly: false });
    expect(new URLSearchParams(qs).get('usableOnly')).toBe('false');
  });

  it('sets cursor and limit', () => {
    const qs = buildSearchQueryString({ cursor: 'abc123', limit: 20 });
    const p = new URLSearchParams(qs);
    expect(p.get('cursor')).toBe('abc123');
    expect(p.get('limit')).toBe('20');
  });

  it('omits empty arrays', () => {
    const qs = buildSearchQueryString({ folderIds: [], tags: [], genres: [] });
    expect(qs).toBe('');
  });

  it('joins project, author and resolution filters with commas', () => {
    const p = new URLSearchParams(
      buildSearchQueryString({
        projectIds: ['p1', 'p2'],
        ownerUserIds: ['u1'],
        resolutions: ['4k', '1080p'],
      }),
    );
    expect(p.get('projectIds')).toBe('p1,p2');
    expect(p.get('ownerUserIds')).toBe('u1');
    expect(p.get('resolutions')).toBe('4k,1080p');
  });

  it('sets sorting and the page', () => {
    const p = new URLSearchParams(
      buildSearchQueryString({ sortBy: 'duration', sortOrder: 'asc', page: 3, limit: 24 }),
    );
    expect(p.get('sortBy')).toBe('duration');
    expect(p.get('sortOrder')).toBe('asc');
    expect(p.get('page')).toBe('3');
    expect(p.get('limit')).toBe('24');
  });
});

// ─── resolutionOf ─────────────────────────────────────────────────────────────

describe('resolutionOf', () => {
  it('classes a frame by its short edge', () => {
    expect(resolutionOf(3840, 2160)).toBe('4k');
    expect(resolutionOf(2560, 1440)).toBe('2k');
    expect(resolutionOf(1080, 1920)).toBe('1080p');
    expect(resolutionOf(1280, 720)).toBe('720p');
    expect(resolutionOf(640, 360)).toBe('sd');
  });

  it('is unknown without a frame size', () => {
    expect(resolutionOf(0, 0)).toBeNull();
  });
});

// ─── buildFacetsQueryString ───────────────────────────────────────────────────

describe('buildFacetsQueryString', () => {
  it('produces the same output as buildSearchQueryString for shared params', () => {
    const params: FootageSearchParams = { q: 'biển', folderIds: ['f1'] };
    expect(buildFacetsQueryString(params)).toBe(buildSearchQueryString(params));
  });
});

// ─── searchFootage ────────────────────────────────────────────────────────────

describe('searchFootage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient).mockResolvedValue({ items: [], nextCursor: null });
  });

  it('calls /footage/search without qs when no params', async () => {
    await searchFootage({});
    expect(apiClient).toHaveBeenCalledWith('/footage/search');
  });

  it('appends query string when params provided', async () => {
    await searchFootage({ q: 'hoa', folderIds: ['f1'] });
    const call = vi.mocked(apiClient).mock.calls[0][0] as string;
    expect(call).toMatch(/^\/footage\/search\?/);
    expect(call).toContain('q=hoa');
    expect(call).toContain('folderIds=f1');
  });
});

// ─── getFootageFacets ─────────────────────────────────────────────────────────

describe('getFootageFacets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient).mockResolvedValue({
      tags: [],
      genres: [],
      timesOfDay: [],
      orientations: [],
      categories: [],
      provinces: [],
    });
  });

  it('calls /footage/facets without qs when no params', async () => {
    await getFootageFacets({});
    expect(apiClient).toHaveBeenCalledWith('/footage/facets');
  });

  it('appends filters when provided', async () => {
    await getFootageFacets({ folderIds: ['f1', 'f2'] });
    const call = vi.mocked(apiClient).mock.calls[0][0] as string;
    expect(call).toMatch(/^\/footage\/facets\?/);
    expect(call).toContain('folderIds=f1%2Cf2');
  });
});

// ─── getFootageFolders ────────────────────────────────────────────────────────

describe('getFootageFolders', () => {
  it('calls /footage/folders', async () => {
    vi.mocked(apiClient).mockResolvedValue({ folders: [] });
    await getFootageFolders();
    expect(apiClient).toHaveBeenCalledWith('/footage/folders');
  });
});

// ─── getFootageVideoMedia ─────────────────────────────────────────────────────

describe('getFootageVideoMedia', () => {
  it('calls /footage/assets/:assetId/media', async () => {
    vi.mocked(apiClient).mockResolvedValue({
      assetId: 'asset-1',
      previewUrl: null,
      previewWidth: null,
      previewHeight: null,
      watermarked: false,
      posterUrl: null,
      keyframes: [],
      contactSheetUrl: null,
      durationMs: 5000,
      expiresAt: '2026-01-01T00:00:00Z',
    });
    await getFootageVideoMedia('asset-1');
    expect(apiClient).toHaveBeenCalledWith('/footage/assets/asset-1/media');
  });
});

// ─── getFootagePreviewUrl ─────────────────────────────────────────────────────

describe('getFootagePreviewUrl', () => {
  it('returns the URL of the preview variant', async () => {
    vi.mocked(apiClient).mockResolvedValue({ url: 'https://cdn.test/360.mp4' });
    await expect(getFootagePreviewUrl('asset-1', 'preview_360p_wm')).resolves.toBe(
      'https://cdn.test/360.mp4',
    );
    expect(apiClient).toHaveBeenCalledWith(
      '/footage/assets/asset-1/preview-url?variantCode=preview_360p_wm',
    );
  });
});

// ─── buildFootageFolderTree ───────────────────────────────────────────────────

describe('buildFootageFolderTree', () => {
  const mkFolder = (id: string, parentId: string | null, name: string): FootageFolder => ({
    id,
    parentId,
    name,
    path: name,
    analyzedVideos: 0,
    usableVideos: 0,
  });

  it('returns empty array for empty input', () => {
    expect(buildFootageFolderTree([])).toEqual([]);
  });

  it('places root folders at top level', () => {
    const result = buildFootageFolderTree([mkFolder('r1', null, 'Root')]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r1');
    expect(result[0].children).toHaveLength(0);
  });

  it('nests children under their parent', () => {
    const folders = [
      mkFolder('r1', null, 'Root'),
      mkFolder('c1', 'r1', 'Child1'),
      mkFolder('c2', 'r1', 'Child2'),
      mkFolder('gc1', 'c1', 'GrandChild1'),
    ];
    const result = buildFootageFolderTree(folders);
    expect(result).toHaveLength(1);
    const root = result[0];
    expect(root.children).toHaveLength(2);
    const child1 = root.children.find((c) => c.id === 'c1')!;
    expect(child1.children).toHaveLength(1);
    expect(child1.children[0].id).toBe('gc1');
  });

  it('places orphaned folders (missing parent) at top level', () => {
    const folders = [mkFolder('orphan', 'missing-parent', 'Orphan')];
    const result = buildFootageFolderTree(folders);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('orphan');
  });

  it('preserves usableVideos count', () => {
    const folder: FootageFolder = {
      id: 'f1',
      parentId: null,
      name: 'F1',
      path: 'F1',
      analyzedVideos: 10,
      usableVideos: 7,
    };
    const result = buildFootageFolderTree([folder]);
    expect(result[0].usableVideos).toBe(7);
  });
});

// ─── formatMs ─────────────────────────────────────────────────────────────────

describe('formatMs', () => {
  it('formats 0 as "0:00"', () => expect(formatMs(0)).toBe('0:00'));
  it('formats 1000 ms as "0:01"', () => expect(formatMs(1000)).toBe('0:01'));
  it('formats 60000 ms as "1:00"', () => expect(formatMs(60000)).toBe('1:00'));
  it('formats 75000 ms as "1:15"', () => expect(formatMs(75000)).toBe('1:15'));
  it('pads seconds below 10', () => expect(formatMs(5000)).toBe('0:05'));
  it('formats 3600000 ms (1h) as "1:00:00"', () => expect(formatMs(3_600_000)).toBe('1:00:00'));
  it('formats 3661000 ms as "1:01:01"', () => expect(formatMs(3_661_000)).toBe('1:01:01'));
});

// ─── qualityStars ─────────────────────────────────────────────────────────────

describe('qualityStars', () => {
  it('returns empty string for null', () => expect(qualityStars(null)).toBe(''));
  it('returns 3 stars for quality 3', () => expect(qualityStars(3)).toBe('★★★'));
  it('returns 5 stars for quality 5', () => expect(qualityStars(5)).toBe('★★★★★'));
  it('returns 0 stars for quality 0', () => expect(qualityStars(0)).toBe(''));
  it('clamps above 5 to 5 stars', () => expect(qualityStars(7)).toBe('★★★★★'));
  it('clamps below 0 to 0 stars', () => expect(qualityStars(-1)).toBe(''));
});
