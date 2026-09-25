export type FolderAccessUserSortField = 'user' | 'folderCount' | 'highestLevel' | 'updatedAt';

export type FolderAccessUsersParams = {
  keyword?: string;
  sortBy?: FolderAccessUserSortField;
  sortOrder?: 'asc' | 'desc';
  page: number;
  limit: number;
};
