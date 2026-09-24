import type { AccessLevel } from './access-level.type';

export type SetFolderGrantInput = {
  folderId: string;
  principalId: string;
  accessLevel: AccessLevel;
  inheritChildren?: boolean;
};
