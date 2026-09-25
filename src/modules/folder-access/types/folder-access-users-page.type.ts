import type { FolderAccessUserSummary } from './folder-access-user-summary.type';

export type FolderAccessUsersPage = {
  data: FolderAccessUserSummary[];
  total: number;
  page: number;
  limit: number;
};
