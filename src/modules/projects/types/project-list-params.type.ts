export type ProjectSortField = 'name' | 'createdAt' | 'updatedAt';
export type ProjectSortOrder = 'asc' | 'desc';

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
};
