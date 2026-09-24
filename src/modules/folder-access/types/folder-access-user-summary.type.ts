import type { AccessLevel } from './access-level.type';
import type { AccountUserSummary } from './account-user-summary.type';

export type FolderAccessUserSummary = {
  userId: string;
  user: AccountUserSummary | null;
  folderCount: number;
  highestLevel: AccessLevel;
  lastUpdatedAt: string;
  folders: Array<{ id: string; name: string; pathText: string; accessLevel: AccessLevel }>;
};
