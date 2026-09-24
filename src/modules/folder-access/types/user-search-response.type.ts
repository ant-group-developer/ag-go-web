import type { AccountUserSummary } from './account-user-summary.type';

export type UserSearchResponse = {
  data: AccountUserSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
  };
};
