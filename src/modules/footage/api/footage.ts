import { apiClient } from '../../../shared/lib/api-client';
import type { PreviewVariant } from '../../media/api/media';

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

/** Resolution classes by the short edge of the frame (2160, 1440, 1080, 720, lower). */
export const RESOLUTIONS = ['4k', '2k', '1080p', '720p', 'sd'] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

export const RESOLUTION_LABELS: Record<Resolution, string> = {
  '4k': '4K (2160p)',
  '2k': '2K (1440p)',
  '1080p': 'Full HD (1080p)',
  '720p': 'HD (720p)',
  sd: 'SD (< 720p)',
};

/** Resolution class of a frame, as the API classes it. */
export function resolutionOf(width: number, height: number): Resolution | null {
  const shortEdge = Math.min(width, height);
  if (!shortEdge) return null;
  if (shortEdge >= 2160) return '4k';
  if (shortEdge >= 1440) return '2k';
  if (shortEdge >= 1080) return '1080p';
  if (shortEdge >= 720) return '720p';
  return 'sd';
}

export const FOOTAGE_SORT_FIELDS = [
  'relevance',
  'analyzedAt',
  'quality',
  'duration',
  'resolution',
  'name',
  'folder',
  'project',
] as const;
export type FootageSortField = (typeof FOOTAGE_SORT_FIELDS)[number];
export type FootageSortOrder = 'asc' | 'desc';

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
  /** Videos matching the filters, over all pages. */
  total: number;
};

export type FootageSearchParams = {
  q?: string;
  folderIds?: string[];
  projectIds?: string[];
  ownerUserIds?: string[];
  categoryIds?: string[];
  tags?: string[];
  provinceIds?: string[];
  genres?: string[];
  timesOfDay?: TimeOfDay[];
  orientations?: Orientation[];
  resolutions?: Resolution[];
  minDurationMs?: number;
  maxDurationMs?: number;
  usableOnly?: boolean;
  sortBy?: FootageSortField;
  sortOrder?: FootageSortOrder;
  page?: number;
  limit?: number;
  cursor?: string;
};

/** Search filters without paging and sorting (what facets are counted over). */
export type FootageFilterParams = Omit<
  FootageSearchParams,
  'limit' | 'cursor' | 'page' | 'sortBy' | 'sortOrder'
>;

/** Build the query string for /footage/search (pure helper, tested). */
export function buildSearchQueryString(params: FootageSearchParams): string {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.folderIds?.length) query.set('folderIds', params.folderIds.join(','));
  if (params.projectIds?.length) query.set('projectIds', params.projectIds.join(','));
  if (params.ownerUserIds?.length) query.set('ownerUserIds', params.ownerUserIds.join(','));
  if (params.categoryIds?.length) query.set('categoryIds', params.categoryIds.join(','));
  if (params.tags?.length) query.set('tags', params.tags.join(','));
  if (params.provinceIds?.length) query.set('provinceIds', params.provinceIds.join(','));
  if (params.genres?.length) query.set('genres', params.genres.join(','));
  if (params.timesOfDay?.length) query.set('timesOfDay', params.timesOfDay.join(','));
  if (params.orientations?.length) query.set('orientations', params.orientations.join(','));
  if (params.resolutions?.length) query.set('resolutions', params.resolutions.join(','));
  if (params.minDurationMs !== undefined) query.set('minDurationMs', String(params.minDurationMs));
  if (params.maxDurationMs !== undefined) query.set('maxDurationMs', String(params.maxDurationMs));
  if (params.usableOnly !== undefined) query.set('usableOnly', String(params.usableOnly));
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.cursor) query.set('cursor', params.cursor);
  return query.toString();
}

export function searchFootage(params: FootageSearchParams): Promise<FootageSearchResult> {
  const qs = buildSearchQueryString(params);
  return apiClient<FootageSearchResult>(`/footage/search${qs ? `?${qs}` : ''}`);
}

// ─── /footage/facets ─────────────────────────────────────────────────────────

/** A filter value with how many videos have it; `label` names an id (category, project...). */
export type FacetItem = { value: string; label?: string; count: number };

/** Each facet is counted without its own filter, so its other values stay on offer. */
export type FootageFacetsResult = {
  tags: FacetItem[];
  genres: FacetItem[];
  timesOfDay: FacetItem[];
  orientations: FacetItem[];
  resolutions: FacetItem[];
  categories: FacetItem[];
  provinces: FacetItem[];
  projects: FacetItem[];
  authors: FacetItem[];
};

/** Build the query string for /footage/facets (same filters as search, minus paging/sorting). */
export function buildFacetsQueryString(params: FootageFilterParams): string {
  return buildSearchQueryString(params);
}

export function getFootageFacets(params: FootageFilterParams): Promise<FootageFacetsResult> {
  const qs = buildFacetsQueryString(params);
  return apiClient<FootageFacetsResult>(`/footage/facets${qs ? `?${qs}` : ''}`);
}

// ─── /footage/assets/:assetId/media ──────────────────────────────────────────

export type FootageActor = {
  id: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
};

/** A project the video belongs to (only the ones the user can see). */
export type FootageProject = {
  id: string;
  name: string;
  description: string | null;
  evaluationStatus: string;
  /** Evaluation of this video within the project. */
  mediaEvaluationStatus: 'pending' | 'approved' | 'rejected';
  folderId: string;
  folderPath: string;
  categoryName: string | null;
  countryName: string | null;
  provinceName: string | null;
  tags: string[];
  ownerUserId: string;
  ownerUser: FootageActor | null;
  createdAt: string;
  updatedAt: string;
};

/** Technical metadata of the original file. */
export type FootageFileInfo = {
  filename: string;
  extension: string | null;
  mimeType: string;
  /** bigint as string. */
  fileSizeBytes: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  frameRate: number | null;
  codec: string | null;
  format: string | null;
  bitrateBps: number | null;
  hasAudio: boolean | null;
  sourceType: string;
  uploadedAt: string;
  uploadedBy: string;
  uploadedByUser: FootageActor | null;
  analyzedAt: string | null;
  analysisModel: string | null;
};

export type FootageVideoMedia = {
  assetId: string;
  previewUrl: string | null;
  previewWidth: number | null;
  previewHeight: number | null;
  watermarked: boolean;
  /** Previews the player may choose from, smallest first. */
  variants: PreviewVariant[];
  posterUrl: string | null;
  keyframes: { url: string; tMs: number }[];
  contactSheetUrl: string | null;
  durationMs: number;
  file: FootageFileInfo | null;
  projects: FootageProject[];
  expiresAt: string;
};

export function getFootageVideoMedia(assetId: string): Promise<FootageVideoMedia> {
  return apiClient<FootageVideoMedia>(`/footage/assets/${assetId}/media`);
}

/** Presigned URL of one preview the footage player offers. */
export async function getFootagePreviewUrl(assetId: string, variantCode: string): Promise<string> {
  const result = await apiClient<{ url: string }>(
    `/footage/assets/${assetId}/preview-url?variantCode=${encodeURIComponent(variantCode)}`,
  );
  return result.url;
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
