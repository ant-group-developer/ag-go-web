export type ProjectSortField = 'name' | 'folder' | 'createdAt' | 'updatedAt';
export type ProjectSortOrder = 'asc' | 'desc';
export const PROJECT_EVALUATION_STATUSES = [
  'draft',
  'pending',
  'completed',
  'partially_completed',
  'failed',
] as const;
export type ProjectEvaluationStatus = (typeof PROJECT_EVALUATION_STATUSES)[number];

export type ProjectListParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  folderId?: string;
  folderIds?: string[];
  countryId?: string;
  provinceId?: string;
  categoryId?: string;
  categoryIds?: string[];
  tagIds?: string[];
  sortBy?: ProjectSortField;
  sortOrder?: ProjectSortOrder;
  evaluationStatuses?: ProjectEvaluationStatus[];
  /** Only projects owned by the current user. */
  mine?: boolean;
};
