import type { FolderGrant } from './folder-grant.type';
import type { InheritedFolderGrant } from './inherited-folder-grant.type';

export type FolderGrantsResult = {
  direct: FolderGrant[];
  inherited: InheritedFolderGrant[];
};
