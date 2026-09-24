import type { FolderGrant } from './folder-grant.type';

export type UserFolderGrant = FolderGrant & {
  folder: { id: string; name: string; pathText: string; pathIds: string[] };
};
