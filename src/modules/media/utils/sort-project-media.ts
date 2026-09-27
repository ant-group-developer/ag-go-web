import type { SortState } from '../../../shared/components/sort-dropdown';
import { sortRows, toTimestamp, type SortValue } from '../../../shared/lib/compare-sort-values';
import type { ProjectMedia } from '../api/media';

/** Fields a project file list can be sorted by. */
export type ProjectMediaSortField = 'name' | 'createdAt' | 'modifiedAt';

export type ProjectMediaSort = SortState<ProjectMediaSortField>;

export const PROJECT_MEDIA_SORT_FIELDS: readonly ProjectMediaSortField[] = [
  'name',
  'createdAt',
  'modifiedAt',
];

/** Oldest first: the order files were added in, same as the project's own file order. */
export const DEFAULT_PROJECT_MEDIA_SORT: ProjectMediaSort = {
  sortBy: 'createdAt',
  sortOrder: 'asc',
};

/** When the file itself was last modified (e.g. in Google Drive), else when the row changed. */
export function projectMediaModifiedAt(media: ProjectMedia): string {
  return media.modifiedAt ?? media.updatedAt;
}

/** Value `media` is sorted by for `field`. */
export function projectMediaSortValue(
  media: ProjectMedia,
  field: ProjectMediaSortField,
): SortValue {
  switch (field) {
    case 'name':
      return media.asset.originalFilename;
    case 'createdAt':
      return toTimestamp(media.createdAt);
    case 'modifiedAt':
      return toTimestamp(projectMediaModifiedAt(media));
  }
}

/** Sorted copy of `items`. */
export function sortProjectMedia(
  items: readonly ProjectMedia[],
  { sortBy, sortOrder }: ProjectMediaSort,
): ProjectMedia[] {
  return sortRows(items, (media) => projectMediaSortValue(media, sortBy), sortOrder);
}
