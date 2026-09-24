import type { FolderAccessUsersParams } from '../types/folder-access-users-params.type';

export const folderAccessQueryKeys = {
  all: () => ['folder-access'] as const,
  folder: (folderId: string) => [...folderAccessQueryKeys.all(), 'folder', folderId] as const,
  user: (userId: string) => [...folderAccessQueryKeys.all(), 'user', userId] as const,
  users: (params: FolderAccessUsersParams) =>
    [...folderAccessQueryKeys.all(), 'users', params] as const,
  userSearch: (keyword: string) =>
    [...folderAccessQueryKeys.all(), 'user-search', keyword] as const,
};
