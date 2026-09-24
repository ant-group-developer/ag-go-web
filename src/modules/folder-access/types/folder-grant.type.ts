import type { AccessLevel } from './access-level.type';
import type { AccountUserSummary } from './account-user-summary.type';

export type FolderGrant = {
  id: string;
  folderId: string;
  principalType: 'user';
  principalId: string;
  accessLevel: AccessLevel;
  inheritChildren: boolean;
  grantedBy: string | null;
  createdAt: string;
  updatedAt: string;
  principalUser?: AccountUserSummary | null;
  grantedByUser?: AccountUserSummary | null;
};
