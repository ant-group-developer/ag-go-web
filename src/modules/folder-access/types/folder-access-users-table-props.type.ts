import type { AccountUserSummary } from './account-user-summary.type';

export type FolderAccessUsersTableProps = {
  onOpenUser: (userId: string, user?: AccountUserSummary) => void;
};
