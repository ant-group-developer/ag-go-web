import { apiClient } from '../../../shared/lib/api-client';

// ─── Enum types ──────────────────────────────────────────────────────────────

export const SHOT_SIZES = [
  'extreme_wide',
  'wide',
  'medium',
  'close_up',
  'extreme_close_up',
  'unknown',
] as const;
export type ShotSize = (typeof SHOT_SIZES)[number];

export const CAMERA_MOTIONS = [
  'static',
  'pan',
  'tilt',
  'zoom',
  'dolly',
  'handheld',
  'aerial',
  'unknown',
] as const;
export type CameraMotion = (typeof CAMERA_MOTIONS)[number];

export const TIMES_OF_DAY = ['day', 'night', 'golden_hour', 'indoor', 'mixed', 'unknown'] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

export const SETTINGS = ['indoor', 'outdoor', 'mixed', 'unknown'] as const;
export type Setting = (typeof SETTINGS)[number];

export const PEOPLE_COUNTS = ['none', 'one', 'few', 'many', 'crowd'] as const;
export type PeopleCount = (typeof PEOPLE_COUNTS)[number];

export const ORIENTATIONS = ['landscape', 'portrait', 'square'] as const;
export type Orientation = (typeof ORIENTATIONS)[number];

// ─── Enum label helpers ───────────────────────────────────────────────────────

export const SHOT_SIZE_LABELS_VI: Record<ShotSize, string> = {
  extreme_wide: 'Toàn cảnh rộng',
  wide: 'Toàn cảnh',
  medium: 'Trung cảnh',
  close_up: 'Cận cảnh',
  extreme_close_up: 'Cực cận',
  unknown: 'Không xác định',
};

export const SHOT_SIZE_LABELS_EN: Record<ShotSize, string> = {
  extreme_wide: 'Extreme Wide',
  wide: 'Wide Shot',
  medium: 'Medium Shot',
  close_up: 'Close-up',
  extreme_close_up: 'Extreme Close-up',
  unknown: 'Unknown',
};

export const TIME_OF_DAY_LABELS_VI: Record<TimeOfDay, string> = {
  day: 'Ban ngày',
  night: 'Ban đêm',
  golden_hour: 'Giờ vàng',
  indoor: 'Trong nhà',
  mixed: 'Hỗn hợp',
  unknown: 'Không xác định',
};

export const TIME_OF_DAY_LABELS_EN: Record<TimeOfDay, string> = {
  day: 'Day',
  night: 'Night',
  golden_hour: 'Golden Hour',
  indoor: 'Indoor',
  mixed: 'Mixed',
  unknown: 'Unknown',
};

export const ORIENTATION_LABELS_VI: Record<Orientation, string> = {
  landscape: 'Ngang',
  portrait: 'Dọc',
  square: 'Vuông',
};

export const ORIENTATION_LABELS_EN: Record<Orientation, string> = {
  landscape: 'Landscape',
  portrait: 'Portrait',
  square: 'Square',
};

export const CAMERA_MOTION_LABELS_VI: Record<CameraMotion, string> = {
  static: 'Cố định',
  pan: 'Lia ngang',
  tilt: 'Lia dọc',
  zoom: 'Zoom',
  dolly: 'Dolly',
  handheld: 'Cầm tay',
  aerial: 'Trên không',
  unknown: 'Không xác định',
};

export const SETTING_LABELS_VI: Record<Setting, string> = {
  indoor: 'Trong nhà',
  outdoor: 'Ngoài trời',
  mixed: 'Hỗn hợp',
  unknown: 'Không xác định',
};

export const PEOPLE_COUNT_LABELS_VI: Record<PeopleCount, string> = {
  none: 'Không có người',
  one: 'Một người',
  few: 'Vài người',
  many: 'Nhiều người',
  crowd: 'Đám đông',
};

// ─── /footage/folders ────────────────────────────────────────────────────────

export type FootageFolder = {
  id: string;
  parentId: string | null;
  name: string;
  path: string;
  analyzedVideos: number;
  usableVideos: number;
};

export type FootageFoldersResult = {
  folders: FootageFolder[];
};

export function getFootageFolders(): Promise<FootageFoldersResult> {
  return apiClient<FootageFoldersResult>('/footage/folders');
}

// ─── Folder tree builder (pure, tested) ──────────────────────────────────────

export type FootageFolderNode = FootageFolder & {
  children: FootageFolderNode[];
};

export function buildFootageFolderTree(folders: FootageFolder[]): FootageFolderNode[] {
  const nodeMap = new Map<string, FootageFolderNode>();
  for (const f of folders) {
    nodeMap.set(f.id, { ...f, children: [] });
  }
  const roots: FootageFolderNode[] = [];
  for (const f of folders) {
    const node = nodeMap.get(f.id)!;
    if (f.parentId && nodeMap.has(f.parentId)) {
      nodeMap.get(f.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// ─── FootageVideo (one whole-video description) ───────────────────────────────

/** One analysed video (asset) as footage. */
export type FootageVideo = {
  assetId: string;
  name: string;
  projectIds: string[];
  projectNames: string[];
  folderIds: string[];
  durationMs: number;
  width: number;
  height: number;
  orientation: Orientation;
  hasAudio: boolean;
  hasSpeech: boolean | null;
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
  setting: Setting;
  timeOfDay: TimeOfDay;
  peopleCount: PeopleCount;
  shotVariety: ShotSize[];
  cameraMotions: CameraMotion[];
  visibleText: string;
  hasWatermark: boolean;
  usable: boolean;
  usableReason: string;
  quality: number;
  approved: boolean;
  analyzedAt: string;
  thumbnailUrl: string | null;
  /** score is present on search results */
  score?: number;
};

export type FootageSearchResult = {
  items: FootageVideo[];
  nextCursor: string | null;
};

export type FootageSearchParams = {
  q?: string;
  folderIds?: string[];
  categoryIds?: string[];
  tags?: string[];
  provinceIds?: string[];
  genres?: string[];
  timesOfDay?: TimeOfDay[];
  orientations?: Orientation[];
  minDurationMs?: number;
  maxDurationMs?: number;
  usableOnly?: boolean;
  limit?: number;
  cursor?: string;
};

/** Build the query string for /footage/search (pure helper, tested). */
export function buildSearchQueryString(params: FootageSearchParams): string {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.folderIds?.length) query.set('folderIds', params.folderIds.join(','));
  if (params.categoryIds?.length) query.set('categoryIds', params.categoryIds.join(','));
  if (params.tags?.length) query.set('tags', params.tags.join(','));
  if (params.provinceIds?.length) query.set('provinceIds', params.provinceIds.join(','));
  if (params.genres?.length) query.set('genres', params.genres.join(','));
  if (params.timesOfDay?.length) query.set('timesOfDay', params.timesOfDay.join(','));
  if (params.orientations?.length) query.set('orientations', params.orientations.join(','));
  if (params.minDurationMs !== undefined) query.set('minDurationMs', String(params.minDurationMs));
  if (params.maxDurationMs !== undefined) query.set('maxDurationMs', String(params.maxDurationMs));
  if (params.usableOnly !== undefined) query.set('usableOnly', String(params.usableOnly));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.cursor) query.set('cursor', params.cursor);
  return query.toString();
}

export function searchFootage(params: FootageSearchParams): Promise<FootageSearchResult> {
  const qs = buildSearchQueryString(params);
  return apiClient<FootageSearchResult>(`/footage/search${qs ? `?${qs}` : ''}`);
}

// ─── /footage/facets ─────────────────────────────────────────────────────────

export type FacetItem = { value: string; count: number };
export type FacetItemNamed = { id: string; name: string; count: number };

export type FootageFacetsResult = {
  tags: FacetItem[];
  genres: FacetItem[];
  timesOfDay: FacetItem[];
  orientations: FacetItem[];
  categories: FacetItemNamed[];
  provinces: FacetItemNamed[];
};

/** Build the query string for /footage/facets (same filters as search, minus cursor/limit). */
export function buildFacetsQueryString(
  params: Omit<FootageSearchParams, 'limit' | 'cursor'>,
): string {
  return buildSearchQueryString(params);
}

export function getFootageFacets(
  params: Omit<FootageSearchParams, 'limit' | 'cursor'>,
): Promise<FootageFacetsResult> {
  const qs = buildFacetsQueryString(params);
  return apiClient<FootageFacetsResult>(`/footage/facets${qs ? `?${qs}` : ''}`);
}

// ─── /footage/assets/:assetId/media ──────────────────────────────────────────

export type FootageVideoMedia = {
  assetId: string;
  previewUrl: string | null;
  previewWidth: number | null;
  previewHeight: number | null;
  watermarked: boolean;
  posterUrl: string | null;
  keyframes: { url: string; tMs: number }[];
  contactSheetUrl: string | null;
  durationMs: number;
  expiresAt: string;
};

export function getFootageVideoMedia(assetId: string): Promise<FootageVideoMedia> {
  return apiClient<FootageVideoMedia>(`/footage/assets/${assetId}/media`);
}

// ─── Duration helpers (pure) ─────────────────────────────────────────────────

/** Format milliseconds as mm:ss or h:mm:ss. */
export function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Render quality (0–5) as a star count string. */
export function qualityStars(quality: number | null): string {
  if (quality === null) return '';
  return '★'.repeat(Math.max(0, Math.min(5, Math.round(quality))));
}
