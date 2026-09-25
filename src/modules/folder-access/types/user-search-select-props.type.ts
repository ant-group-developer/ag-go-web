import type { AccountUserSummary } from './account-user-summary.type';

export type UserSearchSelectProps = {
  value?: string;
  onChange?: (userId: string | undefined, user?: AccountUserSummary) => void;
  /** Shown for the current value before any search has run (e.g. restored from the URL). */
  selectedUser?: AccountUserSummary | null;
  placeholder?: string;
  style?: React.CSSProperties;
};
