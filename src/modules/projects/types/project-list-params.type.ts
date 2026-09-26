export type ProjectSortField = 'name' | 'createdAt' | 'updatedAt';
export type ProjectSortOrder = 'asc' | 'desc';
export type ProjectEvaluationStatus =
  'draft' | 'pending' | 'completed' | 'partially_completed' | 'failed';

export type ProjectListParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  folderId?: string;
  countryId?: string;
  provinceId?: string;
  categoryId?: string;
  tagIds?: string[];
  sortBy?: ProjectSortField;
  sortOrder?: ProjectSortOrder;
  evaluationStatuses?: ProjectEvaluationStatus[];
  /** Only projects owned by the current user. */
  mine?: boolean;
};
