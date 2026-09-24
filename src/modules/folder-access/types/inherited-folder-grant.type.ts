import type { FolderGrant } from './folder-grant.type';

export type InheritedFolderGrant = FolderGrant & {
  sourceFolder: { id: string; name: string; pathText: string; depth: number } | null;
};
